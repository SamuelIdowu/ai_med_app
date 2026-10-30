import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { MedicalCard } from '../components/ui/MedicalCard';
import { TactileButton } from '../components/ui/TactileButton';
import { theme } from '../theme';
import { Illustration } from '../components/Illustration';
import { LasoMark } from '../components/brand/LasoMark';

export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { enterGuestMode } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        {/* Top Logo */}
        <View style={styles.topLogoRow}>
          <LasoMark variant="compact" tone="brand" size={26} />
        </View>

        {/* Hero Illustration Card — 3D welcomeShield illustration */}
        <MedicalCard style={styles.heroCard}>
          <View style={styles.illustrationCircle}>
            <Illustration
              name="welcomeShield"
              width={140}
              height={140}
              accessibilityLabel="Clinical stethoscope and AI shield"
              fallback={null}
            />
          </View>

          <Text style={styles.cardTitle}>Quick Instructions</Text>
          <Text style={styles.cardSub}>
            Get instant access to step-by-step first aid guidance for any medical emergency.
          </Text>
        </MedicalCard>

        {/* Headline & Value Prop */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            Stay Safe.{"\n"}Act Fast in Any Emergency.
          </Text>
          <Text style={styles.subtitle}>
            Offline-first medical triage, guided wound inspections, and instant 911 dispatch.
          </Text>
        </View>

        {/* Action Buttons matching sketch.webp & full_sketch.webp */}
        <View style={styles.actions}>
          <TactileButton
            label="Get Started"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => navigation.navigate('Signup')}
          />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={enterGuestMode}
            style={styles.guestButton}
          >
            <Text style={styles.guestButtonText}>Continue without sign up</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Login')}
            style={styles.signInLink}
          >
            <Text style={styles.signInLinkText}>
              Already have an account? <Text style={styles.signInBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  topLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: theme.colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text.primary,
    letterSpacing: -0.5,
  },
  logoPlus: {
    color: '#10B981',
  },
  heroCard: {
    padding: 28,
    alignItems: 'center',
    marginVertical: 12,
  },
  illustrationCircle: {
    width: 160,
    height: 160,
    borderRadius: 24,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  cardSub: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  textContainer: {
    marginVertical: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text.primary,
    lineHeight: 32,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
    alignItems: 'center',
  },
  guestButton: {
    paddingVertical: 12,
  },
  guestButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  signInLink: {
    paddingVertical: 4,
  },
  signInLinkText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  signInBold: {
    fontWeight: '700',
    color: theme.colors.primary.main,
  },
});
