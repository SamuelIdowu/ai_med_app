import * as ImagePicker from 'expo-image-picker';

export class PhotoCaptureError extends Error {
  code: 'camera_permission' | 'library_permission' | 'cancelled' | 'capture_failed';

  constructor(
    code: PhotoCaptureError['code'],
    message: string
  ) {
    super(message);
    this.name = 'PhotoCaptureError';
    this.code = code;
  }
}

export const capturePhoto = async (): Promise<string> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    throw new PhotoCaptureError(
      'camera_permission',
      'Please enable camera access to take a photo for analysis.'
    );
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    throw new PhotoCaptureError('cancelled', 'Photo capture cancelled.');
  }

  return result.assets[0].uri;
};

export const pickPhoto = async (): Promise<string> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new PhotoCaptureError(
      'library_permission',
      'Please enable photo library access to choose an image.'
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
    allowsMultipleSelection: false,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    throw new PhotoCaptureError('cancelled', 'Photo selection cancelled.');
  }

  return result.assets[0].uri;
};
