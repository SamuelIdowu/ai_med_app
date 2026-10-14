import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabBar } from '../components/BottomTabBar';
import { MedicalCard } from '../components/ui/MedicalCard';
import { CircularDrilldownButton } from '../components/ui/CircularDrilldownButton';
import { theme } from '../theme';

export const AIToolsScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI Clinical Suite</Text>
          <Text style={styles.headerSubtitle}>
            Intelligent vision and offline triage models for fast response
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.toolsList}>
            {/* 1. Live Streaming SSE Triage Card */}
            <MedicalCard
              style={styles.toolCard}
              onPress={() => navigation.navigate('LiveTriage')}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#F3F4F6' }]}>
                <MaterialCommunityIcons
                  name="lightning-bolt"
                  size={26}
                  color="#0F1115"
                />
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.toolTitle}>Real-Time Streaming Triage</Text>
                <Text style={styles.toolDescription}>
                  Instant SSE markdown clinical steps, emergency escalation & offline fallback.
                </Text>
              </View>

              <CircularDrilldownButton
                onPress={() => navigation.navigate('LiveTriage')}
                size={36}
                iconColor="#0F1115"
              />
            </MedicalCard>

            {/* 2. Computer Vision Reticle Wound Scanner */}
            <MedicalCard
              style={styles.toolCard}
              onPress={() => navigation.navigate('WoundScanner')}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#F3F4F6' }]}>
                <MaterialCommunityIcons
                  name="camera-iris"
                  size={26}
                  color="#0F1115"
                />
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.toolTitle}>Reticle Wound Scanner</Text>
                <Text style={styles.toolDescription}>
                  Targeted CV camera frame for lacerations, burns, and severity grading.
                </Text>
              </View>

              <CircularDrilldownButton
                onPress={() => navigation.navigate('WoundScanner')}
                size={36}
                iconColor="#0F1115"
              />
            </MedicalCard>

            {/* 3. Conversational AI Triage */}
            <MedicalCard
              style={styles.toolCard}
              onPress={() => navigation.navigate('AIChat')}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#F3F4F6' }]}>
                <MaterialCommunityIcons
                  name="chat-processing-outline"
                  size={26}
                  color="#0F1115"
                />
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.toolTitle}>Conversational AI Triage</Text>
                <Text style={styles.toolDescription}>
                  Chat triage with multi-modal photo & video capture attachment support.
                </Text>
              </View>

              <CircularDrilldownButton
                onPress={() => navigation.navigate('AIChat')}
                size={36}
                iconColor="#0F1115"
              />
            </MedicalCard>

            {/* 4. Emergency First Aid Protocols */}
            <MedicalCard
              style={styles.toolCard}
              onPress={() => navigation.navigate('FirstAidList')}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#F3F4F6' }]}>
                <MaterialCommunityIcons
                  name="medical-bag"
                  size={26}
                  color="#0F1115"
                />
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.toolTitle}>Offline Life-Saving Flowcharts</Text>
                <Text style={styles.toolDescription}>
                  Instant access to 25 verified emergency protocols without cellular signal.
                </Text>
              </View>

              <CircularDrilldownButton
                onPress={() => navigation.navigate('FirstAidList')}
                size={36}
                iconColor="#0F1115"
              />
            </MedicalCard>

            {/* 5. Nearest Medical Facilities & Live Map */}
            <MedicalCard
              style={styles.toolCard}
              onPress={() => navigation.navigate('ProviderList')}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#F3F4F6' }]}>
                <MaterialCommunityIcons
                  name="map-marker-radius"
                  size={26}
                  color="#0F1115"
                />
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.toolTitle}>Nearest Clinics & Live Map</Text>
                <Text style={styles.toolDescription}>
                  Locate closest hospitals, urgent care centers & pharmacies with proximity and routing.
                </Text>
              </View>

              <CircularDrilldownButton
                onPress={() => navigation.navigate('ProviderList')}
                size={36}
                iconColor="#0F1115"
              />
            </MedicalCard>
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>

        <BottomTabBar activeRoute="AITools" />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spatial.spacing.md,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: theme.spatial.spacing.md,
    paddingTop: 8,
  },
  toolsList: {
    gap: 14,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    lineHeight: 16,
  },
});
