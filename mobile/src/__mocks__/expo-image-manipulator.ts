export const SaveFormat = {
  JPEG: 'jpeg',
  PNG: 'png',
  WEBP: 'webp',
};

export const manipulateAsync = jest.fn(async (uri: string, _actions: any[], _options?: any) => ({
  uri: `${uri}_processed.jpg`,
  width: 1024,
  height: 768,
  base64: 'mockedProcessedBase64String==',
}));
