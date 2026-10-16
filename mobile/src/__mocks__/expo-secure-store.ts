const secureStoreMap = new Map<string, string>();

export const getItemAsync = jest.fn(async (key: string) => secureStoreMap.get(key) ?? null);
export const setItemAsync = jest.fn(async (key: string, value: string) => {
  secureStoreMap.set(key, value);
});
export const deleteItemAsync = jest.fn(async (key: string) => {
  secureStoreMap.delete(key);
});
