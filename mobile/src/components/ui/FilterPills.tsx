import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  View,
} from 'react-native';
import { theme } from '../../theme';

export interface FilterPillItem {
  id: string;
  label: string;
  count?: number;
}

interface FilterPillsProps {
  items: FilterPillItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  style?: ViewStyle;
}

export const FilterPills: React.FC<FilterPillsProps> = ({
  items,
  selectedId,
  onSelect,
  style,
}) => {
  return (
    <View style={[styles.wrapper, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => {
          const isSelected = item.id === selectedId;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => onSelect(item.id)}
              style={[styles.pill, isSelected ? styles.activePill : styles.inactivePill]}
            >
              <Text
                style={[
                  styles.pillText,
                  isSelected ? styles.activePillText : styles.inactivePillText,
                ]}
              >
                {item.label}
              </Text>
              {typeof item.count === 'number' && (
                <View
                  style={[
                    styles.countBadge,
                    isSelected ? styles.activeCountBadge : styles.inactiveCountBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      isSelected ? styles.activeCountText : styles.inactiveCountText,
                    ]}
                  >
                    {item.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 4,
  },
  scrollContent: {
    paddingHorizontal: theme.spatial.spacing.md,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.spatial.radii.pill,
    borderWidth: 1,
  },
  inactivePill: {
    backgroundColor: theme.colors.canvas.surface,
    borderColor: theme.colors.canvas.border,
  },
  activePill: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inactivePillText: {
    color: theme.colors.text.secondary,
  },
  activePillText: {
    color: theme.colors.text.inverse,
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.spatial.radii.pill,
  },
  inactiveCountBadge: {
    backgroundColor: theme.colors.canvas.surfaceSubtle,
  },
  activeCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inactiveCountText: {
    color: theme.colors.text.muted,
  },
  activeCountText: {
    color: theme.colors.text.inverse,
  },
});
