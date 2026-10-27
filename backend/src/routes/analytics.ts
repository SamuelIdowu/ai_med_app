import express from 'express';
import { authenticateUser } from '../middleware/auth';
import { getSupabaseAdmin } from '../db/client';
import { logAudit } from '../services/auditService';

const router = express.Router();

router.use(authenticateUser);

const metricUnits: Record<string, { unit: string; min: number; max: number }> = {
  heart_rate: { unit: 'bpm', min: 20, max: 250 },
  systolic_bp: { unit: 'mmHg', min: 40, max: 300 },
  diastolic_bp: { unit: 'mmHg', min: 20, max: 200 },
  oxygen_saturation: { unit: '%', min: 50, max: 100 },
  respiratory_rate: { unit: 'breaths/min', min: 1, max: 100 },
  body_temperature: { unit: '°C', min: 25, max: 45 },
  pain_score: { unit: 'score', min: 0, max: 10 },
};

const validSources = new Set(['manual', 'healthkit', 'health_connect', 'device']);

router.post('/vitals/readings', async (req, res) => {
  const readings = req.body?.readings;
  if (!Array.isArray(readings) || readings.length < 1 || readings.length > 100) {
    res.status(400).json({ error: 'Provide between 1 and 100 readings.' });
    return;
  }

  const normalized = [];
  for (const reading of readings) {
    const metric = metricUnits[reading?.metric];
    const value = Number(reading?.value);
    const recordedAt = Date.parse(reading?.recordedAt);
    if (
      !metric || !Number.isFinite(value) || value < metric.min || value > metric.max ||
      !Number.isFinite(recordedAt) || recordedAt > Date.now() + 5 * 60 * 1000 ||
      Date.now() - recordedAt > 366 * 24 * 60 * 60 * 1000 ||
      !validSources.has(reading?.source) || typeof reading?.externalId !== 'string' ||
      reading.externalId.length < 1 || reading.externalId.length > 200
    ) {
      res.status(400).json({ error: 'A reading has an invalid metric, value, timestamp, source, or external ID.' });
      return;
    }
    normalized.push({
      user_id: req.user.id,
      metric: reading.metric,
      value,
      unit: metric.unit,
      recorded_at: new Date(recordedAt).toISOString(),
      source: reading.source,
      external_id: reading.externalId,
      encounter_id: reading.encounterId || null,
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const encounterIds = [...new Set(normalized.map((reading) => reading.encounter_id).filter(Boolean))];
    if (encounterIds.length) {
      const { data: encounters, error: encounterError } = await supabase
        .from('encounters')
        .select('id')
        .eq('user_id', req.user.id)
        .in('id', encounterIds);
      if (encounterError) throw encounterError;
      if ((encounters || []).length !== encounterIds.length) {
        res.status(400).json({ error: 'A linked encounter is unavailable.' });
        return;
      }
    }
    const { data, error } = await supabase
      .from('vital_readings')
      .upsert(normalized, { onConflict: 'user_id,source,external_id,metric', ignoreDuplicates: true })
      .select('id, metric, value, unit, recorded_at, source, external_id');
    if (error) throw error;
    await logAudit({
      userId: req.user.id,
      action: 'RECORD_VITAL_READINGS',
      resourceType: 'VITAL_READINGS',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { readingCount: normalized.length },
    });
    res.status(201).json({ readings: data || [] });
  } catch {
    res.status(500).json({ error: 'Failed to save vital readings.' });
  }
});

router.get('/vitals', async (req, res) => {
  const segment = String(req.query.segment || 'Hourly');
  const windows: Record<string, number> = { Hourly: 24, Daily: 24 * 7, Weekly: 24 * 28, Monthly: 24 * 180 };
  if (!(segment in windows)) {
    res.status(400).json({ error: 'Invalid segment.' });
    return;
  }

  try {
    const since = new Date(Date.now() - windows[segment] * 60 * 60 * 1000).toISOString();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('vital_readings')
      .select('value, unit, recorded_at, source')
      .eq('user_id', req.user.id)
      .eq('metric', 'heart_rate')
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: false })
      .limit(500);
    if (error) throw error;

    const readings = (data || []).reverse();
    const values = readings.map((reading: any) => Number(reading.value)).filter(Number.isFinite);
    const latest = readings[readings.length - 1];
    await logAudit({
      userId: req.user.id,
      action: 'VIEW_VITAL_READINGS',
      resourceType: 'VITAL_READINGS',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { segment, readingCount: readings.length },
    });
    const average = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
    const labelFor = (timestamp: string) => {
      const date = new Date(timestamp);
      if (segment === 'Hourly') return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      if (segment === 'Daily') return date.toLocaleDateString([], { weekday: 'short', hour: 'numeric' });
      if (segment === 'Weekly') return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    res.json({
      segment,
      currentHeartRate: latest ? Number(latest.value) : null,
      heartRateStatus: latest ? `Last recorded ${new Date(latest.recorded_at).toLocaleString()}` : 'No heart-rate readings recorded',
      heartRatePoints: readings.map((reading: any) => ({ label: labelFor(reading.recorded_at), value: Number(reading.value) })),
      average,
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
      readingCount: values.length,
      dataSource: 'backend',
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch vital readings.' });
  }
});

export default router;
