import express from 'express';
import { generateReport } from '../services/reportService';
import { authenticateUser } from '../middleware/auth';
import { logAudit } from '../services/auditService';

const router = express.Router();

router.use(authenticateUser);

router.post('/:id/generate', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Token missing' });
      return;
    }

    const pdfBytes = await generateReport(req.user.id, req.params.id, token);

    logAudit({
      userId: req.user.id,
      action: 'GENERATE_REPORT',
      resourceType: 'REPORT',
      resourceId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.get?.('user-agent'),
      metadata: { format: 'pdf', byteSize: pdfBytes.length },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${req.params.id}.pdf`);
    res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Report generation failed');
    }
    const statusCode = error.statusCode || error.status || 500;
    if (statusCode === 404) {
      res.status(404).json({ error: 'Encounter not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const encounterId = req.params.id;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Token missing' });
      return;
    }

    const pdfBytes = await generateReport(req.user.id, encounterId, token);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${encounterId}.pdf`);
    res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Report fetch failed');
    }
    const statusCode = error.statusCode || error.status || 500;
    if (statusCode === 404) {
      res.status(404).json({ error: 'Encounter not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

export default router;
