import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class EmergencyErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || 'An unexpected error occurred.' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('EmergencyErrorBoundary caught an error:', error, errorInfo);
    // When Sentry or telemetry is active, captureException(error, { extra: errorInfo });
  }

  handleEmergencyCall = () => {
    Linking.openURL('tel:911').catch((err) => {
      console.warn('Unable to dial emergency number automatically:', err);
    });
  };

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="alert-decagram" size={64} color={theme.colors.status.emergency.primary} />
            </View>

            <Text style={styles.title}>System Interruption</Text>
            <Text style={styles.subtitle}>
              An unexpected issue occurred while rendering the clinical interface.
            </Text>

            {/* Critical Emergency Bypass Button */}
            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={this.handleEmergencyCall}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="phone" size={24} color="#FFFFFF" />
              <Text style={styles.emergencyButtonText}>Call Emergency (911)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={this.handleReset}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="refresh" size={20} color={theme.colors.canvas.text} />
              <Text style={styles.resetButtonText}>Resume First Aid Session</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 9999,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 320,
  },
  emergencyButton: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    marginBottom: 14,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  emergencyButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  resetButton: {
    width: '100%',
    maxWidth: 340,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 8,
  },
  resetButtonText: {
    color: '#E5E7EB',
    fontSize: 15,
    fontWeight: '600',
  },
});
