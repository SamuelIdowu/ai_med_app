export const Platform = {
  OS: 'ios',
  select: (obj: any) => obj.ios ?? obj.default,
};

export const StyleSheet = {
  create: (styles: any) => styles,
  flatten: (styles: any) => styles,
  absoluteFillObject: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
};

export const Linking = {
  openURL: jest.fn(async () => {}),
};

export const Alert = {
  alert: jest.fn(),
};

export const View = 'View';
export const Text = 'Text';
export const TouchableOpacity = 'TouchableOpacity';
export const ScrollView = 'ScrollView';
export const Image = 'Image';
export const TextInput = 'TextInput';
export const ActivityIndicator = 'ActivityIndicator';
