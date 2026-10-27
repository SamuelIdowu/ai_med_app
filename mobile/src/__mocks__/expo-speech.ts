export const speak = jest.fn();
export const stop = jest.fn();
export const isSpeakingAsync = jest.fn().mockResolvedValue(false);

export default {
  speak,
  stop,
  isSpeakingAsync,
};
