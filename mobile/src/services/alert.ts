// mobile/src/services/alert.ts
// Cross-platform alert helper (react-native-web has no native Alert dialog).

import { Alert, Platform } from 'react-native';

export function showAlert(title: string, message: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(`${title}\n\n${message}`);
    }
    return;
  }

  Alert.alert(title, message);
}
