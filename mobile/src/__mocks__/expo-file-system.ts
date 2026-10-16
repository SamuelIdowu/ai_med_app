export const documentDirectory = 'file:///data/user/0/host.exp.exponent/files/';

export const writeAsStringAsync = jest.fn(async (_fileUri: string, _content: string, _options?: any) => {});

export const getInfoAsync = jest.fn(async (uri: string) => ({
  exists: true,
  size: 1024 * 500, // 500 KB
  isDirectory: false,
  uri,
}));

export const readAsStringAsync = jest.fn(async (_fileUri: string, _options?: any) => 'mock_file_content');
