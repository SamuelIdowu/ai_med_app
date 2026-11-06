export const ExpoSpeechRecognitionModule = {
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
};

export const useSpeechRecognitionEvent = jest.fn();
