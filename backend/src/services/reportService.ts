import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getProfile } from './profileService';
import { getEncounter } from './encounterService';

export const generateReport = async (userId: string, encounterId: string) => {
    const [profile, encounter] = await Promise.all([
        getProfile(userId),
        getEncounter(encounterId, userId)
    ]);

    if (!encounter) {
        console.error(`Encounter not found for ID: ${encounterId} and User: ${userId}`);
        throw new Error('Encounter not found');
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
        page.drawText(`Name: ${profile.first_name || 'N/A'} ${profile.last_name || ''}`, { x: 50, y, size: 12, font });
        y -= 20;
        page.drawText(`Blood Type: ${profile.blood_type || 'N/A'}`, { x: 50, y, size: 12, font });
        y -= 20;
        const allergies = profile.allergies ? JSON.stringify(profile.allergies) : 'None';
        page.drawText(`Allergies: ${allergies}`, { x: 50, y, size: 12, font });
        y -= 30;
    } else {
        page.drawText('No profile data available.', { x: 50, y, size: 12, font });
        y -= 30;
    }

    // Encounter Info
    page.drawText('Encounter Details', { x: 50, y, size: 16, font: boldFont });
    y -= 20;
    page.drawText(`Date: ${new Date(encounter.started_at).toLocaleString()}`, { x: 50, y, size: 12, font });
    y -= 20;
    page.drawText(`Status: ${encounter.status}`, { x: 50, y, size: 12, font });
    y -= 20;
    page.drawText(`Description: ${encounter.description || 'No description provided.'}`, { x: 50, y, size: 12, font });

    // Serialize
    const pdfBytes = await pdfDoc.save();
    return pdfBytes; // Return buffer
};
