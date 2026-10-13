import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { BottomTabBar } from '../components/BottomTabBar';
import { MedicalCard } from '../components/ui/MedicalCard';
import { theme } from '../theme';
import firstAidData from '../content/first-aid-content.json';

const ICON_MAP: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  'blood-bag': 'water',
  fire: 'fire',
  breathe: 'weather-windy',
  'heart-pulse': 'heart-pulse',
  bone: 'bone',
  'account-alert': 'alert-circle',
};

export const FirstAidListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');

  const getIconName = (originalIcon: string): keyof typeof MaterialCommunityIcons.glyphMap => {
    return ICON_MAP[originalIcon] || 'medical-bag';
  };

  const filteredCategories = firstAidData.categories.filter((cat) =>
    cat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCategoryItem = ({ item }: { item: any }) => (
    <MedicalCard
      style={styles.card}
      onPress={() => navigation.navigate('EmergencySteps', { categoryId: item.id })}
    >
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons
          name={getIconName(item.icon)}
          size={28}
          color={theme.colors.primary.main}
        />
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardSubtitle}>
        {item.steps?.length || 5} Verified Steps
      </Text>
    </MedicalCard>
  );

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <StatusBar style="dark" />

        {/* Header from arch.webp & ref4-8 */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backCircle}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={26}
                color={theme.colors.text.primary}
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Articles & Guides</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={theme.colors.text.muted}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search emergency protocols..."
              placeholderTextColor={theme.colors.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <FlatList
          data={filteredCategories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={<View style={{ height: 110 }} />}
        />

        {/* Floating Bottom Nav Pill with Emergency Call button on right (ref7.webp) */}
        <BottomTabBar activeRoute="Articles" />
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas.background,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 20) + 10 : 16,
    paddingHorizontal: theme.spatial.spacing.md,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.canvas.surface,
    borderColor: theme.colors.canvas.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.canvas.surface,
    borderColor: theme.colors.canvas.border,
    borderWidth: 1,
    borderRadius: theme.spatial.radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    ...theme.spatial.shadows.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  listContent: {
    paddingHorizontal: theme.spatial.spacing.md,
    paddingTop: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  card: {
    width: '48%',
    padding: 16,
    borderRadius: theme.spatial.radii.lg,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: theme.colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
});
