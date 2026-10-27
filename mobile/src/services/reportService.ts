import { Encounter } from './types';
import * as FileSystem from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import { api } from './api';

// Report generation service using backend PDF generation
export const reportService = {
  // Generate a PDF report for an encounter by calling the backend
  generateReport: async (encounterId: string): Promise<string> => {
    try {
      console.log(`Generating report for encounter: ${encounterId}`);

      // Call backend to generate PDF
      const response = await api.post(`/reports/${encounterId}/generate`, {}, {
        responseType: 'arraybuffer'
      });

      // Create a unique filename for the PDF
      const filename = `report-${encounterId}-${Date.now()}.pdf`;
      const fileUri = `${(FileSystem as any).documentDirectory}${filename}`;

      // Convert ArrayBuffer to base64
      const base64 = btoa(
        new Uint8Array(response.data)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Save the PDF to the file system
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: 'base64',
      });

      console.log(`Report saved to: ${fileUri}`);
      return fileUri;
    } catch (error: any) {
      console.error('Error generating report:', error);
      if (error.response) {
        // If responseType is arraybuffer, response.data is an ArrayBuffer.
        // We need to decode it to see the JSON error message.
        let errorData = error.response.data;
        if (errorData instanceof ArrayBuffer) {
          try {
            const decodedString = new TextDecoder().decode(errorData);
            errorData = JSON.parse(decodedString);
          } catch (e) {
            console.warn("Could not decode error response", e);
            // fallback if not json
            errorData = String.fromCharCode.apply(null, new Uint8Array(errorData) as any);
          }
        }

        console.error('Backend error:', error.response.status, errorData);
        throw new Error(`Failed to generate report: ${error.response.status}`, { cause: error });
      } else if (error.request) {
        throw new Error('Failed to connect to backend. Please check your connection.', { cause: error });
      } else {
        throw new Error('Failed to generate report. Please try again.', { cause: error });
      }
    }
  },

  shareReport: async (reportUri: string) => {
    if (!reportUri) return;

    try {
      await shareAsync(reportUri, { UTI: '.pdf', mimeType: 'application/pdf' });
      return reportUri;
    } catch (error) {
      console.error('Error sharing report:', error);
      throw error;
    }
  }
};
