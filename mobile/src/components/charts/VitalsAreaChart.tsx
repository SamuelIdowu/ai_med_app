import React from 'react';
import { View, Text, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Line,
  G,
} from 'react-native-svg';
import { theme } from '../../theme';

export interface VitalsDataPoint {
  label: string; // e.g. "10am", "12am", "2pm", "1pm", "4pm"
  value: number; // e.g. 68, 72, 78, 85, 76
}

interface VitalsAreaChartProps {
  data?: VitalsDataPoint[];
  height?: number;
  highlightIndex?: number;
  highlightLabel?: string;
  minValue?: number;
  maxValue?: number;
  style?: ViewStyle;
}

const DEFAULT_DATA: VitalsDataPoint[] = [
  { label: '10am', value: 68 },
  { label: '12am', value: 72 },
  { label: '2pm', value: 78 },
  { label: '1pm', value: 85 },
  { label: '4pm', value: 76 },
];

export const VitalsAreaChart: React.FC<VitalsAreaChartProps> = ({
  data = DEFAULT_DATA,
  height = 180,
  highlightIndex = 2,
  highlightLabel = '78 BPM',
  minValue = 40,
  maxValue = 100,
  style,
}) => {
  const chartWidth = Dimensions.get('window').width - 64; // accounting for padding
  const paddingLeft = 32;
  const paddingRight = 16;
  const paddingTop = 36;
  const paddingBottom = 28;

  const usableWidth = chartWidth - paddingLeft - paddingRight;
  const usableHeight = height - paddingTop - paddingBottom;

  const points = data.map((d, index) => {
    const x = paddingLeft + (index / (data.length - 1)) * usableWidth;
    const clampedVal = Math.max(minValue, Math.min(maxValue, d.value));
    const normalized = (clampedVal - minValue) / (maxValue - minValue);
    const y = paddingTop + (1 - normalized) * usableHeight;
    return { x, y, ...d };
  });

  // Generate smooth cubic Bézier curve
  const createSmoothPath = (pts: typeof points): string => {
    if (pts.length === 0) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const linePath = createSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${
    paddingTop + usableHeight
  } L ${points[0].x} ${paddingTop + usableHeight} Z`;

  const highlightPoint = points[highlightIndex] || points[0];

  // Grid tick lines at 40, 60, 80, 100
  const ticks = [100, 80, 60, 40];

  return (
    <View style={[styles.container, style]}>
      <Svg width={chartWidth} height={height}>
        <Defs>
          <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#0F1115" stopOpacity="0.18" />
            <Stop offset="100%" stopColor="#0F1115" stopOpacity="0.00" />
          </LinearGradient>
          <LinearGradient id="pinGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#0F1115" stopOpacity="0.7" />
            <Stop offset="100%" stopColor="#0F1115" stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {/* Horizontal grid lines & Y-axis labels */}
        {ticks.map((tick) => {
          const norm = (tick - minValue) / (maxValue - minValue);
          const yPos = paddingTop + (1 - norm) * usableHeight;
          return (
            <G key={tick}>
              <Line
                x1={paddingLeft}
                y1={yPos}
                x2={chartWidth - paddingRight}
                y2={yPos}
                stroke="#F1F5F9"
                strokeWidth={1}
                strokeDasharray={tick === 80 ? undefined : '3,3'}
              />
            </G>
          );
        })}

        {/* Gradient Area Fill */}
        <Path d={areaPath} fill="url(#areaGradient)" />

        {/* Spline Line */}
        <Path
          d={linePath}
          fill="none"
          stroke="#0F1115"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Guideline Pin at highlight point */}
        {highlightPoint && (
          <G>
            <Line
              x1={highlightPoint.x}
              y1={highlightPoint.y}
              x2={highlightPoint.x}
              y2={paddingTop + usableHeight}
              stroke="url(#pinGradient)"
              strokeWidth={2}
            />
            {/* Scrubber Pin Circle */}
            <Circle
              cx={highlightPoint.x}
              cy={highlightPoint.y}
              r={6}
              fill="#FFFFFF"
              stroke="#0F1115"
              strokeWidth={3}
            />
          </G>
        )}
      </Svg>

      {/* Y-axis labels rendered cleanly in View */}
      <View style={styles.yLabelsContainer}>
        {ticks.map((tick) => (
          <Text key={tick} style={styles.yLabelText}>
            {tick}
          </Text>
        ))}
      </View>

      {/* Scrubber floating badge above highlight point */}
      {highlightPoint && (
        <View
          style={[
            styles.scrubberBadge,
            {
              left: Math.max(8, highlightPoint.x - 28),
              top: Math.max(0, highlightPoint.y - 30),
            },
          ]}
        >
          <Text style={styles.scrubberText}>{highlightLabel}</Text>
        </View>
      )}

      {/* X-axis time labels */}
      <View style={[styles.xLabelsContainer, { left: paddingLeft, width: usableWidth }]}>
        {data.map((d, i) => {
          const isHighlight = i === highlightIndex;
          return (
            <View
              key={i}
              style={[
                styles.xLabelPill,
                isHighlight && styles.xLabelPillActive,
              ]}
            >
              <Text
                style={[
                  styles.xLabelText,
                  isHighlight && styles.xLabelTextActive,
                ]}
              >
                {d.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginVertical: 8,
  },
  yLabelsContainer: {
    position: 'absolute',
    left: 4,
    top: 28,
    height: 120,
    justifyContent: 'space-between',
  },
  yLabelText: {
    fontSize: 11,
    color: theme.colors.text.muted,
    fontWeight: '500',
  },
  scrubberBadge: {
    position: 'absolute',
    backgroundColor: '#111318',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.spatial.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  scrubberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  xLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  xLabelPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.spatial.radii.pill,
  },
  xLabelPillActive: {
    backgroundColor: '#111318',
  },
  xLabelText: {
    fontSize: 11,
    color: theme.colors.text.muted,
    fontWeight: '500',
  },
  xLabelTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
