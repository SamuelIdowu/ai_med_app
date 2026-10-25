// mobile/src/services/mapLinks.ts
// External map, phone and directions deep links shared by provider screens.

import { Linking, Platform } from 'react-native';
import { showAlert } from './alert';

export interface MapTarget {
  name?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export function openDirections(target: MapTarget): void {
  const { lat, lng, name, address } = target;

  if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
    const latLng = `${lat},${lng}`;
    const label = encodeURIComponent(name || 'Medical Facility');
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latLng}`,
      android: `geo:0,0?q=${latLng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latLng}`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        showAlert('Navigation Error', 'Could not open the maps application.');
      });
      return;
    }
  }

  if (address) {
    const query = encodeURIComponent(address);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(() => {
      showAlert('Navigation Error', 'Could not open the maps application.');
    });
    return;
  }

  showAlert(
    'Location Unavailable',
    'No coordinates or street address are available for this facility.'
  );
}

export function callPhone(phone?: string | null): void {
  if (!phone) {
    showAlert('Phone Unavailable', 'No contact phone number is listed for this facility.');
    return;
  }

  Linking.openURL(`tel:${phone}`).catch(() => {
    showAlert('Call Failed', 'Unable to open the phone dialer on this device.');
  });
}
