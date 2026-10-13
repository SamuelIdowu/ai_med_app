import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface SymptomChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  style?: ViewStyle;
}

export const SymptomChip: React.FC<SymptomChipProps> = ({
  label,
  selected,
  onToggle,
  icon,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onToggle}
      style={[
        styles.chip,
        selected ? styles.selectedChip : styles.unselectedChip,
        style,
      ]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={16}
          color={
            selected
              ? theme.colors.text.inverse
              : theme.colors.primary.main
          }
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.label,
          selected ? styles.selectedLabel : styles.unselectedLabel,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.spatial.radii.pill,
    borderWidth: 1,
  },
  unselectedChip: {
    backgroundColor: theme.colors.canvas.surface,
    borderColor: theme.colors.canvas.border,
  },
  selectedChip: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  unselectedLabel: {
    color: theme.colors.text.primary,
  },
  selectedLabel: {
    color: theme.colors.text.inverse,
  },
});
