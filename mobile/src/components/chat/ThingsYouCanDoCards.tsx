import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { MedicalCard } from '../ui/MedicalCard';

export interface ActionCardItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconBgColor?: string;
  iconColor?: string;
  onPress: () => void;
}

interface ThingsYouCanDoCardsProps {
  title?: string;
  actions: ActionCardItem[];
}

export const ThingsYouCanDoCards: React.FC<ThingsYouCanDoCardsProps> = ({
  title = 'Things you can do!',
  actions,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.cardList}>
        {actions.map((action) => (
          <MedicalCard
            key={action.id}
            onPress={action.onPress}
            style={styles.card}
          >
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: action.iconBgColor || '#EBF2FF' },
              ]}
            >
              <MaterialCommunityIcons
                name={action.icon}
                size={22}
                color={action.iconColor || theme.colors.primary.main}
              />
            </View>
            <View style={styles.content}>
              <Text style={styles.cardTitle}>{action.title}</Text>
              <Text style={styles.cardDesc}>{action.description}</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={theme.colors.text.muted}
            />
          </MedicalCard>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 10,
    marginHorizontal: 4,
  },
  cardList: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: theme.spatial.radii.lg,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    lineHeight: 16,
  },
});
