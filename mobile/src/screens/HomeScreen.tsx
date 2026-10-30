import { Icon } from '../components/Icon';
import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  StatusBar as RNStatusBar,
  TouchableWithoutFeedback,
} from 'react-native';
import type { TextInputInstance } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBar } from '../components/BottomTabBar';
import { AnalyticsService } from '../services/analyticsService';
import { theme } from '../theme';
import firstAidData from '../content/first-aid-content.json';
import { Illustration } from '../components/Illustration';
import type { IconName } from '../icons';

// Types for Emergency Protocols
export interface EmergencyProtocol {
  id: string;
  title: string;
  subtitle: string;
  icon: IconName;
  categoryId: string; // targets first-aid-content.json category
  categoryGroup: string; // 'Bleedings' | 'Burns' | 'Injuries' | 'Respiratory' | 'Heart problems' | 'Poisonings' | 'Allergies' | 'Bites'
  tags: string[]; // 'Quick' | 'Child' | 'Beginner' | 'Adult' | 'Advanced'
  stepsCount: number;
  urgency: string; // 'Immediate', 'High Urgency', 'Stabilization'
  popularityRank: number;
}

// Emergency Protocol Catalog mapped directly from verified medical offline content
const EMERGENCY_CATALOG: EmergencyProtocol[] = [
  {
    id: 'bone',
    title: 'Bone injuries',
    subtitle: 'Splints & Immobilization',
    icon: 'fracture',
    categoryId: 'fractures',
    categoryGroup: 'Injuries',
    tags: ['Quick', 'Adult', 'Beginner'],
    stepsCount: 3,
    urgency: 'Stabilization',
    popularityRank: 1,
  },
  {
    id: 'wound',
    title: 'Wound care',
    subtitle: 'Bandage & Antiseptic',
    icon: 'wound',
    categoryId: 'wound',
    categoryGroup: 'Bleedings',
    tags: ['Quick', 'Child', 'Adult', 'Beginner'],
    stepsCount: 3,
    urgency: 'Antiseptic',
    popularityRank: 2,
  },
  {
    id: 'burns',
    title: 'Burns',
    subtitle: 'Cooling & Dressing',
    icon: 'burns',
    categoryId: 'burns',
    categoryGroup: 'Burns',
    tags: ['Quick', 'Child', 'Beginner'],
    stepsCount: 5,
    urgency: 'Cooling Water',
    popularityRank: 3,
  },
  {
    id: 'choking',
    title: 'Choking relief',
    subtitle: 'Heimlich Maneuver',
    icon: 'choking',
    categoryId: 'choking',
    categoryGroup: 'Respiratory',
    tags: ['Quick', 'Child', 'Adult', 'Advanced'],
    stepsCount: 3,
    urgency: 'Immediate',
    popularityRank: 4,
  },
  {
    id: 'bleeding',
    title: 'Severe bleeding',
    subtitle: 'Direct Pressure & Hemorrhage',
    icon: 'bleeding',
    categoryId: 'bleeding',
    categoryGroup: 'Bleedings',
    tags: ['Quick', 'Adult', 'Advanced'],
    stepsCount: 3,
    urgency: 'Critical',
    popularityRank: 5,
  },
  {
    id: 'cpr',
    title: 'CPR aid',
    subtitle: 'Chest Compressions',
    icon: 'cpr',
    categoryId: 'cpr',
    categoryGroup: 'Heart problems',
    tags: ['Quick', 'Adult', 'Advanced'],
    stepsCount: 4,
    urgency: 'Immediate 911',
    popularityRank: 6,
  },
  {
    id: 'poisoning',
    title: 'Poisonings',
    subtitle: 'Chemical Safety & Flush',
    icon: 'poisoning',
    categoryId: 'poisoning',
    categoryGroup: 'Poisonings',
    tags: ['Adult', 'Child', 'Advanced'],
    stepsCount: 3,
    urgency: 'Poison Help',
    popularityRank: 7,
  },
  {
    id: 'allergies',
    title: 'Allergies & Shock',
    subtitle: 'EpiPen & Anaphylaxis',
    icon: 'allergy',
    categoryId: 'allergic',
    categoryGroup: 'Allergies',
    tags: ['Quick', 'Child', 'Beginner'],
    stepsCount: 3,
    urgency: 'EpiPen Auto',
    popularityRank: 8,
  },
  {
    id: 'bites',
    title: 'Bites & Stings',
    subtitle: 'Venom & Disinfection',
    icon: 'bites',
    categoryId: 'bites',
    categoryGroup: 'Bites',
    tags: ['Child', 'Adult', 'Beginner'],
    stepsCount: 3,
    urgency: 'Cold Compress',
    popularityRank: 9,
  },
  {
    id: 'unconscious',
    title: 'Unconsciousness',
    subtitle: 'Recovery Position',
    icon: 'unconscious',
    categoryId: 'unconsciousness',
    categoryGroup: 'Respiratory',
    tags: ['Adult', 'Advanced'],
    stepsCount: 3,
    urgency: 'Airway Check',
    popularityRank: 10,
  },
];

// Available Filter Categories (matching mockup)
const CATEGORY_FILTERS = [
  'Bleedings',
  'Burns',
  'Allergies',
  'Poisonings',
  'Bites',
  'Injuries',
  'Respiratory',
  'Heart problems',
];

// Available Tags (matching mockup)
const TAG_FILTERS = ['Quick', 'Child', 'Beginner', 'Adult', 'Advanced'];

type SortOption = 'popular' | 'quickest' | 'alphabetical';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const searchInputRef = useRef<TextInputInstance>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  // Temporary filter state for modal editing
  const [modalCategories, setModalCategories] = useState<string[]>([]);
  const [modalTags, setModalTags] = useState<string[]>([]);

  // Sort State
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Active filter count
  const activeFilterCount = selectedCategories.length + selectedTags.length;

  // Open modal handler
  const handleOpenFilterModal = () => {
    setModalCategories([...selectedCategories]);
    setModalTags([...selectedTags]);
    setIsFilterModalVisible(true);
  };

  // Toggle category inside modal
  const handleToggleModalCategory = (cat: string) => {
    setModalCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Toggle tag inside modal
  const handleToggleModalTag = (tag: string) => {
    setModalTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Apply filters from modal
  const handleApplyFilters = () => {
    setSelectedCategories([...modalCategories]);
    setSelectedTags([...modalTags]);
    setIsFilterModalVisible(false);
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    setModalCategories([]);
    setModalTags([]);
    setSelectedCategories([]);
    setSelectedTags([]);
  };

  // Quick horizontal pill toggle
  const handleQuickCategoryPill = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories((prev) => prev.filter((c) => c !== cat));
    } else {
      setSelectedCategories([cat]);
    }
  };

  // Toggle search input
  const handleToggleSearch = () => {
    setIsSearchActive((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => searchInputRef.current?.focus(), 150);
      } else {
        setSearchQuery('');
      }
      return next;
    });
  };

  // Filtered & Sorted Emergencies
  const filteredEmergencies = useMemo(() => {
    return EMERGENCY_CATALOG.filter((item) => {
      // 1. Text Search filter
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesSubtitle = item.subtitle.toLowerCase().includes(query);
        const matchesGroup = item.categoryGroup.toLowerCase().includes(query);
        const matchesTag = item.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchesTitle && !matchesSubtitle && !matchesGroup && !matchesTag) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategories.length > 0) {
        if (!selectedCategories.includes(item.categoryGroup)) {
          return false;
        }
      }

      // 3. Tag Filter
      if (selectedTags.length > 0) {
        const hasMatchingTag = selectedTags.some((tag) => item.tags.includes(tag));
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'popular') {
        return a.popularityRank - b.popularityRank;
      }
      if (sortBy === 'quickest') {
        return a.stepsCount - b.stepsCount;
      }
      if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [searchQuery, selectedCategories, selectedTags, sortBy]);

  // Keep Home Screen Grid Minimal: ONLY TOP 4 ITEMS
  const displayedEmergencies = useMemo(() => {
    return filteredEmergencies.slice(0, 4);
  }, [filteredEmergencies]);

  const handleSelectEmergency = (categoryId: string, title: string) => {
    AnalyticsService.track('emergency_selected_home', { categoryId, title });
    navigation.navigate('EmergencySteps', { categoryId });
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'popular':
        return 'Most popular';
      case 'quickest':
        return 'Quickest protocol';
      case 'alphabetical':
        return 'Alphabetical';
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================= */}
        {/* 1. HERO BANNER: Deep Onyx with iAid Logo + Stay Safe Act Fast     */}
        {/* ================================================================= */}
        <LinearGradient
          colors={[theme.colors.palette.eliteTeal, theme.colors.palette.darkSideMoon]}
          style={styles.heroContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Soft luminous orb echoing the Splash screen emblem treatment */}
          <View pointerEvents="none" style={styles.heroGlowOrb} />

          {/* Top Bar inside Hero */}
          <View style={styles.heroHeaderRow}>
            {/* Logo: Laso + Shield Icon */}
            <View style={styles.logoRow}>
              <Text style={styles.logoText}>Laso</Text>
              <View style={styles.logoShieldBadge}>
                <Icon name="shieldPlus" size={20} color="#FFFFFF" />
              </View>
            </View>

            {/* Medical Profile, AI Tools, Notification & Settings Icon Buttons */}
            <View style={styles.headerActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('MedicalProfile')}
                style={styles.circleActionButton}
                accessibilityLabel="Medical Profile"
              >
                <Icon name="identificationCard" size={19} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('AITools')}
                style={styles.circleActionButton}
                accessibilityLabel="AI Clinical Suite"
              >
                <Icon name="sparkle" size={19} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Notifications')}
                style={styles.circleActionButton}
                accessibilityLabel="Notifications"
              >
                <Icon name="bell" size={19} color="#FFFFFF" />
                <View style={styles.unreadBadgeDot} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Settings')}
                style={styles.circleActionButton}
                accessibilityLabel="Settings"
              >
                <Icon name="gear" size={19} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Title & 3D Heart Biometric Orb */}
          <View style={styles.heroBodyRow}>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroTitle}>Stay Safe</Text>
              <Text style={styles.heroTitle}>Act Fast!</Text>
            </View>

            {/* Transparent medical emblem, framed like the Splash screen */}
            <View style={styles.heroEmblemFrame}>
              <Illustration
                name="splashEmblem"
                width={84}
                height={84}
                accessibilityLabel="Laso+ medical emblem"
                fallback={
                  <Icon name="shieldPlus" size={44} color="#FFFFFF" />
                }
              />
            </View>
          </View>
        </LinearGradient>

        {/* ================================================================= */}
        {/* 2. BODY CONTENT - CONTROLS, SEARCH, FILTERS & MINIMAL GRID        */}
        {/* ================================================================= */}
        <View style={styles.bodyContainer}>
          {/* CONTROL ROW: Sort Selector, Filter Button, Search Button */}
          <View style={styles.controlsRow}>
            {/* Sort Dropdown Button */}
            <TouchableOpacity
              style={styles.sortButton}
              activeOpacity={0.7}
              onPress={() => setIsSortDropdownOpen((prev) => !prev)}
            >
              <Text style={styles.sortButtonText}>{getSortLabel()}</Text>
              <Icon
                name={isSortDropdownOpen ? 'caretUp' : 'caretDown'}
                size={18}
                color="#111827"
              />
            </TouchableOpacity>

            {/* Right Action Icons: Filter & Search */}
            <View style={styles.controlsRightGroup}>
              {/* Filter Button with active badge */}
              <TouchableOpacity
                style={[
                  styles.circleControlBtn,
                  activeFilterCount > 0 && styles.circleControlBtnActive,
                ]}
                activeOpacity={0.8}
                onPress={handleOpenFilterModal}
                accessibilityLabel="Open Filters"
              >
                <Icon
                  name="faders"
                  size={19}
                  color={activeFilterCount > 0 ? '#FFFFFF' : '#111827'}
                />
                {activeFilterCount > 0 && (
                  <View style={styles.filterCountBadge}>
                    <Text style={styles.filterCountBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Search Toggle Button */}
              <TouchableOpacity
                style={[
                  styles.circleControlBtn,
                  (isSearchActive || searchQuery.length > 0) && styles.circleControlBtnActive,
                ]}
                activeOpacity={0.8}
                onPress={handleToggleSearch}
                accessibilityLabel="Toggle Search"
              >
                <Icon
                  name="search"
                  size={20}
                  color={isSearchActive || searchQuery.length > 0 ? '#FFFFFF' : '#111827'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sort Dropdown Popover */}
          {isSortDropdownOpen && (
            <View style={styles.sortDropdownMenu}>
              {(['popular', 'quickest', 'alphabetical'] as SortOption[]).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.sortDropdownItem,
                    sortBy === opt && styles.sortDropdownItemActive,
                  ]}
                  onPress={() => {
                    setSortBy(opt);
                    setIsSortDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortDropdownItemText,
                      sortBy === opt && styles.sortDropdownItemTextActive,
                    ]}
                  >
                    {opt === 'popular'
                      ? 'Most popular'
                      : opt === 'quickest'
                      ? 'Quickest protocol'
                      : 'Alphabetical (A - Z)'}
                  </Text>
                  {sortBy === opt && (
                    <Icon name="check" size={16} color="#0F1115" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* SEARCH BAR (Visible when toggled or query exists) */}
          {(isSearchActive || searchQuery.length > 0) && (
            <View style={styles.searchSection}>
              <View style={styles.searchBarContainer}>
                <Icon
                  name="search"
                  size={20}
                  color="#111827"
                  style={styles.searchIcon}
                />
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  placeholder="Search emergency protocol..."
                  placeholderTextColor="#888888"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name="closeCircle" size={18} color="#888888" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* HORIZONTAL CATEGORY FILTER PILLS */}
          <View style={styles.horizontalPillsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalPillsContent}
            >
              {/* "All" Pill */}
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  selectedCategories.length === 0 && styles.filterPillActive,
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedCategories([])}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    selectedCategories.length === 0 && styles.filterPillTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>

              {/* Category Pills */}
              {CATEGORY_FILTERS.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.filterPill, isSelected && styles.filterPillActive]}
                    activeOpacity={0.7}
                    onPress={() => handleQuickCategoryPill(cat)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        isSelected && styles.filterPillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                    {isSelected && (
                      <Icon
                        name="close"
                        size={14}
                        color="#FFFFFF"
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ACTIVE FILTER SUMMARY TAGS (if tags or multiple filters applied) */}
          {selectedTags.length > 0 && (
            <View style={styles.activeTagsRow}>
              <Text style={styles.activeTagsLabel}>Tags:</Text>
              {selectedTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.activeTagPill}
                  onPress={() =>
                    setSelectedTags((prev) => prev.filter((t) => t !== tag))
                  }
                >
                  <Text style={styles.activeTagText}>{tag}</Text>
                  <Icon name="close" size={12} color="#FFFFFF" />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setSelectedTags([])}
                style={styles.clearTagsBtn}
              >
                <Text style={styles.clearTagsText}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* =============================================================== */}
          {/* MINIMAL GRID HEADER: Displays Top 4 with View All link          */}
          {/* =============================================================== */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitle}>
                {selectedCategories.length > 0
                  ? selectedCategories.join(', ')
                  : 'Emergencies'}
              </Text>
              <Text style={styles.sectionBadgeCount}>
                ({displayedEmergencies.length} of {filteredEmergencies.length})
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('FirstAidList')}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionActionText}>View All</Text>
            </TouchableOpacity>
          </View>

          {/* MINIMAL 2x2 CARDS GRID (CLEAN EMERGENCY DESIGN - NO PROGRESS/TRAINING) */}
          {displayedEmergencies.length > 0 ? (
            <View style={styles.cardsGrid}>
              {displayedEmergencies.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.emergencyCard}
                  activeOpacity={0.85}
                  onPress={() => handleSelectEmergency(item.categoryId, item.title)}
                >
                  {/* Top Row: Icon Circle + Step Badge */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.iconCircleBadge}>
                      <Icon name={item.icon} size={22} color="#000000" />
                    </View>

                    <View style={styles.cardStepsBadge}>
                      <Text style={styles.cardStepsBadgeText}>
                        {item.stepsCount} Steps
                      </Text>
                    </View>
                  </View>

                  {/* Card Title */}
                  <Text style={styles.emergencyCardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>

                  {/* Clinical Subtitle */}
                  <Text style={styles.emergencyCardSubtitle} numberOfLines={2}>
                    {item.subtitle}
                  </Text>

                  {/* Bottom Action Row (Emergency Protocol Link) */}
                  <View style={styles.cardActionRow}>
                    <Text style={styles.cardActionLabel}>Protocol</Text>
                    <Icon name="arrowRight" size={16} color="#0F1115" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            /* EMPTY FILTER RESULT STATE */
            <View style={styles.emptyStateContainer}>
              <Icon
                name="listMagnifyingGlass"
                size={48}
                color="#888888"
              />
              <Text style={styles.emptyStateTitle}>No matching protocols</Text>
              <Text style={styles.emptyStateSub}>
                Try adjusting your search terms or clearing active filters.
              </Text>
              <TouchableOpacity
                style={styles.emptyStateResetBtn}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedCategories([]);
                  setSelectedTags([]);
                }}
              >
                <Text style={styles.emptyStateResetText}>Reset Filters</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* VIEW ALL CTA BUTTON (If more than 4 items exist) */}
          {filteredEmergencies.length > 4 && (
            <TouchableOpacity
              style={styles.viewMoreBanner}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('FirstAidList')}
            >
              <Text style={styles.viewMoreBannerText}>
                View all {filteredEmergencies.length} emergency protocols
              </Text>
              <Icon name="arrowRight" size={18} color="#0F1115" />
            </TouchableOpacity>
          )}

          {/* Medical AI Emergency Triage Banner */}
          <TouchableOpacity
            style={styles.aiTriageCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('AIChat')}
          >
            <View style={styles.aiTriageLeft}>
              <View style={styles.aiTriageIcon}>
                <Icon name="robot" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.aiTriageTextCol}>
                <Text style={styles.aiTriageTitle}>AI Emergency Triage</Text>
                <Text style={styles.aiTriageSub}>
                  Unsure what steps to take? Instant AI symptom triage
                </Text>
              </View>
            </View>
            <Icon name="caretRight" size={24} color="#000000" />
          </TouchableOpacity>

          {/* AI Clinical Suite Hub Card */}
          <TouchableOpacity
            style={styles.aiTriageCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('AITools')}
          >
            <View style={styles.aiTriageLeft}>
              <View style={styles.aiTriageIcon}>
                <Icon name="sparkle" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.aiTriageTextCol}>
                <Text style={styles.aiTriageTitle}>AI Clinical Suite</Text>
                <Text style={styles.aiTriageSub}>
                  Live streaming SSE triage, CV wound scanner & diagnostic photo lab
                </Text>
              </View>
            </View>
            <Icon name="caretRight" size={24} color="#000000" />
          </TouchableOpacity>

          {/* Nearest Clinics & Live Map Banner */}
          <TouchableOpacity
            style={styles.aiTriageCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ProviderList')}
          >
            <View style={styles.aiTriageLeft}>
              <View style={styles.aiTriageIcon}>
                <Icon name="mapPin" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.aiTriageTextCol}>
                <Text style={styles.aiTriageTitle}>Nearest Clinics & Live Map</Text>
                <Text style={styles.aiTriageSub}>
                  Locate closest hospitals, urgent cares & live routing with GPS
                </Text>
              </View>
            </View>
            <Icon name="caretRight" size={24} color="#000000" />
          </TouchableOpacity>

          {/* Spacing for floating bottom bar */}
          <View style={{ height: 110 }} />
        </View>
      </ScrollView>

      {/* =================================================================== */}
      {/* 3. CATEGORY & TAG FILTER BOTTOM SHEET MODAL (Screen 3 in mockup)   */}
      {/* =================================================================== */}
      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsFilterModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                {/* Drag Handle Bar */}
                <View style={styles.modalHandleBar} />

                {/* Header: "Categories" + Close Icon */}
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalHeaderTitle}>Categories</Text>
                  <TouchableOpacity
                    onPress={() => setIsFilterModalVisible(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.modalCloseBtn}
                  >
                    <Icon name="close" size={20} color="#111827" />
                  </TouchableOpacity>
                </View>

                {/* Categories Pill Grid */}
                <View style={styles.modalPillsGrid}>
                  {CATEGORY_FILTERS.map((cat) => {
                    const isSelected = modalCategories.includes(cat);
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.modalPill,
                          isSelected ? styles.modalPillActive : styles.modalPillInactive,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => handleToggleModalCategory(cat)}
                      >
                        <Text
                          style={[
                            styles.modalPillText,
                            isSelected
                              ? styles.modalPillTextActive
                              : styles.modalPillTextInactive,
                          ]}
                        >
                          {cat}
                        </Text>
                        {isSelected && (
                          <Icon
                            name="close"
                            size={14}
                            color="#FFFFFF"
                            style={{ marginLeft: 6 }}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Section: Tags */}
                <Text style={styles.modalSubHeaderTitle}>Tags</Text>
                <View style={styles.modalPillsGrid}>
                  {TAG_FILTERS.map((tag) => {
                    const isSelected = modalTags.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[
                          styles.modalPill,
                          isSelected ? styles.modalPillActive : styles.modalPillInactive,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => handleToggleModalTag(tag)}
                      >
                        <Text
                          style={[
                            styles.modalPillText,
                            isSelected
                              ? styles.modalPillTextActive
                              : styles.modalPillTextInactive,
                          ]}
                        >
                          {tag}
                        </Text>
                        {isSelected && (
                          <Icon
                            name="close"
                            size={14}
                            color="#FFFFFF"
                            style={{ marginLeft: 6 }}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Modal Footer Actions: "Clear all" & "Apply" */}
                <View style={styles.modalFooterRow}>
                  <TouchableOpacity
                    style={styles.modalClearBtn}
                    onPress={handleClearAllFilters}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalClearBtnText}>Clear all</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalApplyBtn}
                    onPress={handleApplyFilters}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.modalApplyBtnText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* =================================================================== */}
      {/* 4. FLOATING BOTTOM NAVIGATION BAR                                   */}
      {/* =================================================================== */}
      <BottomTabBar activeRoute="Home" />
    </View>
  );
};

// ============================================================================
// BLACK & WHITE / MONOCHROME STYLES
// ============================================================================
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // 1. HERO BANNER
  heroContainer: {
    backgroundColor: theme.colors.palette.eliteTeal, // Rich brand Elite Teal
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 20) + 6 : 40,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    ...theme.spatial.shadows3d.floating3d,
  },
  // Luminous orb behind the emblem — mirrors the Splash screen composition
  heroGlowOrb: {
    position: 'absolute',
    top: 44,
    right: -40,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  logoShieldBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.palette.petroBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  circleActionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.palette.petroBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    position: 'relative',
  },
  unreadBadgeDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.status.emergency.primary,
    borderWidth: 1.5,
    borderColor: theme.colors.palette.eliteTeal,
  },
  heroBodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTextCol: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 38,
    letterSpacing: -0.6,
  },

  // Transparent medical emblem frame in the Hero (Splash-inspired)
  heroEmblemFrame: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  // 2. BODY CONTENT
  bodyContainer: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },

  // CONTROLS ROW: "Most popular ⌄", filter icon, search icon
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 22,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F1115',
  },
  controlsRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circleControlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleControlBtnActive: {
    backgroundColor: '#0F1115',
    borderColor: '#0F1115',
  },
  filterCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#0F1115',
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  filterCountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Sort Dropdown Menu
  sortDropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 6,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  sortDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sortDropdownItemActive: {
    backgroundColor: '#F9FAFB',
  },
  sortDropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  sortDropdownItemTextActive: {
    color: '#0F1115',
    fontWeight: '800',
  },

  // SEARCH BAR
  searchSection: {
    marginBottom: 14,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  // HORIZONTAL CATEGORY FILTER PILLS
  horizontalPillsWrapper: {
    marginBottom: 18,
    marginHorizontal: -20,
  },
  horizontalPillsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterPillActive: {
    backgroundColor: '#0F1115',
    borderColor: '#0F1115',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Active tags row
  activeTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  activeTagsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginRight: 2,
  },
  activeTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1115',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  activeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clearTagsBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  clearTagsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F1115',
    letterSpacing: -0.3,
  },
  sectionBadgeCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },

  // 2-Column Cards Grid (Minimal Top 4)
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },

  // EMERGENCY CARDS (CLEAN EMERGENCY DESIGN WITH 3D TACTILE DEPTH)
  emergencyCard: {
    width: '48%',
    backgroundColor: theme.colors.canvas.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.canvas.border,
    padding: 16,
    ...theme.spatial.shadows3d.card3d,
    justifyContent: 'space-between',
    minHeight: 154,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircleBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.canvas.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.canvas.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardStepsBadge: {
    backgroundColor: theme.colors.canvas.surfaceSubtle,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.canvas.border,
  },
  cardStepsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  emergencyCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F1115',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  emergencyCardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 12,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cardActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F1115',
  },

  // Empty state
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F1115',
    marginTop: 10,
  },
  emptyStateSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  emptyStateResetBtn: {
    backgroundColor: '#0F1115',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emptyStateResetText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // View more banner
  viewMoreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 8,
  },
  viewMoreBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F1115',
  },

  // AI Triage Banner
  aiTriageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.canvas.surfaceSubtle,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.canvas.border,
    padding: 16,
    marginTop: 20,
    ...theme.spatial.shadows3d.card3d,
  },
  aiTriageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  aiTriageIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...theme.spatial.shadows3d.accentGlow,
  },
  aiTriageTextCol: {
    flex: 1,
  },
  aiTriageTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  aiTriageSub: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    lineHeight: 16,
  },

  // 3. FILTER BOTTOM SHEET MODAL (Screen 3 in mockup)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 16, 17, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.canvas.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
    ...theme.spatial.shadows3d.floating3d,
  },
  modalHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.canvas.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: theme.colors.text.primary,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.canvas.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginTop: 20,
    marginBottom: 12,
  },
  modalPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
  },
  modalPillInactive: {
    backgroundColor: theme.colors.canvas.surfaceSubtle,
    borderColor: theme.colors.canvas.border,
  },
  modalPillActive: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
    ...theme.spatial.shadows3d.tactileButton,
  },
  modalPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalPillTextInactive: {
    color: theme.colors.text.secondary,
  },
  modalPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.canvas.border,
  },
  modalClearBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalClearBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text.muted,
  },
  modalApplyBtn: {
    backgroundColor: theme.colors.primary.main,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    ...theme.spatial.shadows3d.tactileButton,
  },
  modalApplyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
