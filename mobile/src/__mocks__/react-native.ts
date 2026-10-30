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
const MockImage = () => null;
export const Image = Object.assign(MockImage, {
  getSize: jest.fn((_uri: string, onSuccess: (width: number, height: number) => void) => {
    onSuccess(1920, 1080);
  }),
});
export const TextInput = 'TextInput';
export const ActivityIndicator = 'ActivityIndicator';

export const Dimensions = {
  get: jest.fn(() => ({ width: 375, height: 812 })),
};

export const Animated = {
  Value: jest.fn(() => ({
    setValue: jest.fn(),
    interpolate: jest.fn(() => 0),
  })),
  timing: jest.fn(() => ({
    start: jest.fn((cb?: () => void) => cb && cb()),
    stop: jest.fn(),
  })),
  sequence: jest.fn(() => ({
    start: jest.fn((cb?: () => void) => cb && cb()),
    stop: jest.fn(),
  })),
  parallel: jest.fn(() => ({
    start: jest.fn((cb?: () => void) => cb && cb()),
    stop: jest.fn(),
  })),
  loop: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
  delay: jest.fn(() => ({
    start: jest.fn((cb?: () => void) => cb && cb()),
    stop: jest.fn(),
  })),
  View: 'Animated.View',
};
