import React from 'react';
import { View, Text, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import Svg, { Rect, Line, G } from 'react-native-svg';
import { theme } from '../../theme';

export interface BarDataPoint {
  label: string; // e.g. "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  value: number; // e.g. 92, 105, 98, 115, 103, 101, 110
  isElevated?: boolean;
}

interface ClinicalBarChartProps {
  data?: BarDataPoint[];
  height?: number;
  minValue?: number;
  maxValue?: number;
  thresholdHigh?: number;
  thresholdLow?: number;
  style?: ViewStyle;
}

const DEFAULT_BAR_DATA: BarDataPoint[] = [
  { label: 'Jun', value: 88 },
  { label: 'Jul', value: 104 },
  { label: 'Aug', value: 98 },
  { label: 'Sep', value: 114, isElevated: true },
  { label: 'Oct', value: 102 },
  { label: 'Nov', value: 100 },
  { label: 'Dec', value: 112 },
];

export const ClinicalBarChart: React.FC<ClinicalBarChartProps> = ({
  data = DEFAULT_BAR_DATA,
  height = 180,
  minValue = 80,
  maxValue = 120,
  thresholdHigh = 112,
  thresholdLow = 90,
  style,
}) => {
  const chartWidth = Dimensions.get('window').width - 64;
  const paddingLeft = 32;
  const paddingRight = 16;
  const paddingTop = 24;
  const paddingBottom = 28;

  const usableWidth = chartWidth - paddingLeft - paddingRight;
  const usableHeight = height - paddingTop - paddingBottom;
  const barWidth = 10;

  const ticks = [120, 110, 100, 90, 80];

  return (
    <View style={[styles.container, style]}>
      <Svg width={chartWidth} height={height}>
        {/* Horizontal grid lines */}
        {ticks.map((tick) => {
          const norm = (tick - minValue) / (maxValue - minValue);
          const yPos = paddingTop + (1 - norm) * usableHeight;
          const isThreshold = tick === thresholdHigh || tick === thresholdLow;

          return (
            <G key={tick}>
              <Line
                x1={paddingLeft}
                y1={yPos}
                x2={chartWidth - paddingRight}
                y2={yPos}
                stroke={isThreshold ? '#E2E8F0' : '#F1F5F9'}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
            </G>
          );
        })}

        {/* Vertical Bars */}
        {data.map((item, idx) => {
          const xPos =
            paddingLeft +
            (idx / (data.length - 1)) * (usableWidth - barWidth);
          const clampedVal = Math.max(minValue, Math.min(maxValue, item.value));
          const norm = (clampedVal - minValue) / (maxValue - minValue);
          const barHeight = norm * usableHeight;
          const yPos = paddingTop + usableHeight - barHeight;

          const barColor = item.isElevated
            ? theme.colors.status.emergency.primary
            : theme.colors.primary.main;

          return (
            <Rect
              key={item.label}
              x={xPos}
              y={yPos}
              width={barWidth}
              height={Math.max(4, barHeight)}
              rx={barWidth / 2}
              fill={barColor}
            />
          );
        })}
      </Svg>

      {/* Y-axis ticks */}
      <View style={styles.yLabelsContainer}>
        {ticks.map((tick) => (
          <Text key={tick} style={styles.yLabelText}>
            {tick}
          </Text>
        ))}
      </View>

      {/* X-axis labels */}
      <View style={[styles.xLabelsContainer, { left: paddingLeft, width: usableWidth }]}>
        {data.map((item) => (
          <Text key={item.label} style={styles.xLabelText}>
            {item.label}
          </Text>
        ))}
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
    top: 18,
    height: 126,
    justifyContent: 'space-between',
  },
  yLabelText: {
    fontSize: 10,
    color: theme.colors.text.muted,
    fontWeight: '500',
  },
  xLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  xLabelText: {
    fontSize: 11,
    color: theme.colors.text.muted,
    fontWeight: '500',
  },
});
