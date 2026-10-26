import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getProfile } from './profileService';
import { getEncounter } from './encounterService';

// Sanitize strings to avoid pdf-lib WinAnsi font crashes on non-ASCII characters
const sanitizePdfText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ').trim();
};

export const resolvePatientName = (profile: any): string => {
  if (!profile) return 'N/A';

  const user = Array.isArray(profile.users) ? profile.users[0] : profile.users;
  const legacyName = [profile.first_name, profile.last_name]
    .filter((part) => typeof part === 'string' && part.trim())
    .join(' ');
  const rawName = user?.name || profile.full_name || profile.name || legacyName;

  return sanitizePdfText(rawName) || 'N/A';
};

export const generateReport = async (userId: string, encounterId: string, token: string) => {
  const [profile, encounter] = await Promise.all([
    getProfile(userId, token),
    getEncounter(encounterId, userId, token),
  ]);

  if (!encounter) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Encounter not found for report generation');
    }
    const notFoundError: any = new Error('Encounter not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 50;

  // Title
  page.drawText('Medical Encounter Report', { x: 50, y, size: 20, font: boldFont });
  y -= 40;

  // Patient Info
  page.drawText('Patient Profile', { x: 50, y, size: 16, font: boldFont });
  y -= 20;
  if (profile) {
    const patientName = resolvePatientName(profile);
    page.drawText(`Name: ${patientName}`, { x: 50, y, size: 12, font });
    y -= 20;
    page.drawText(`Blood Type: ${sanitizePdfText(profile.blood_type || 'N/A')}`, {
      x: 50,
      y,
      size: 12,
      font,
    });
    y -= 20;
    const allergies = profile.allergies ? JSON.stringify(profile.allergies) : 'None';
    page.drawText(`Allergies: ${sanitizePdfText(allergies)}`, { x: 50, y, size: 12, font });
    y -= 30;
  } else {
    page.drawText('No profile data available.', { x: 50, y, size: 12, font });
    y -= 30;
  }

  // Encounter Info
  page.drawText('Encounter Details', { x: 50, y, size: 16, font: boldFont });
  y -= 20;
  const dateStr = encounter.started_at
    ? new Date(encounter.started_at).toLocaleString()
    : new Date().toLocaleString();
  page.drawText(`Date: ${sanitizePdfText(dateStr)}`, { x: 50, y, size: 12, font });
  y -= 20;
  page.drawText(`Status: ${sanitizePdfText(encounter.status || 'active')}`, {
    x: 50,
    y,
    size: 12,
    font,
  });
  y -= 20;
  const desc = sanitizePdfText(
    encounter.description || encounter.title || 'No description provided.',
  );
  page.drawText(`Description: ${desc}`, { x: 50, y, size: 12, font });

  // Serialize
  const pdfBytes = await pdfDoc.save();
  return pdfBytes; // Return buffer
};
