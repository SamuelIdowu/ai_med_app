import { reportService } from '../reportService';
import { api } from '../api';
import * as FileSystem from 'expo-file-system';
import { shareAsync } from 'expo-sharing';

jest.mock('../api', () => ({
  api: {
    post: jest.fn(),
  },
}));

describe('Mobile Report Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates a PDF report, encodes binary arraybuffer to base64, and saves to file system', async () => {
    const fakeBinary = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52]); // '%PDF-1.4'
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: fakeBinary.buffer,
    });

    const fileUri = await reportService.generateReport('encounter-123');

    expect(api.post).toHaveBeenCalledWith(
      '/reports/encounter-123/generate',
      {},
      { responseType: 'arraybuffer' }
    );
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      expect.stringContaining('report-encounter-123-'),
      expect.any(String),
      { encoding: 'base64' }
    );
    expect(fileUri).toContain('report-encounter-123-');
  });

  it('handles backend error with decoded ArrayBuffer error payload', async () => {
    const errorJson = JSON.stringify({ error: 'Encounter not found' });
    const encoder = new TextEncoder();
    const errorBuffer = encoder.encode(errorJson).buffer;

    (api.post as jest.Mock).mockRejectedValueOnce({
      response: {
        status: 404,
        data: errorBuffer,
      },
    });

    await expect(reportService.generateReport('non-existent-enc')).rejects.toThrow(
      'Failed to generate report: 404'
    );
  });

  it('handles network unreachable error gracefully', async () => {
    (api.post as jest.Mock).mockRejectedValueOnce({
      request: {},
    });

    await expect(reportService.generateReport('encounter-net-err')).rejects.toThrow(
      'Failed to connect to backend. Please check your connection.'
    );
  });

  it('shares an existing report via system share sheet', async () => {
    const uri = 'file:///data/user/0/host.exp.exponent/files/report-enc-1.pdf';
    const result = await reportService.shareReport(uri);

    expect(shareAsync).toHaveBeenCalledWith(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
    });
    expect(result).toBe(uri);
  });

  it('returns early when sharing empty URI', async () => {
    const result = await reportService.shareReport('');
    expect(shareAsync).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
