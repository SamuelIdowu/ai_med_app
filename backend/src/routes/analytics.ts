import express from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = express.Router();

router.use(authenticateUser);

export interface VitalsDataPoint {
  label: string;
  value: number;
}

export interface RingData {
  label: string;
  value: number;
  color: string;
}

export interface BarDataPoint {
  label: string;
  value: number;
  isElevated?: boolean;
}

router.get('/vitals', async (req, res) => {
  try {
    const userId = req.user.id;
    const segment = (req.query.segment as string) || 'Hourly';

    // 1. Fetch user encounters to correlate telemetry with patient history
    const { data: encounters } = await supabase
      .from('encounters')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Generate dynamic telemetry reflecting real user time & segment
    const now = new Date();
    let heartRatePoints: VitalsDataPoint[] = [];

    if (segment === 'Hourly') {
      const hours = [8, 10, 12, 14, 16];
      heartRatePoints = hours.map((h) => {
        const d = new Date(now);
        d.setHours(h, 0, 0, 0);
        const label = h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
        const seed = (userId.charCodeAt(0) || 72) + (encounters?.length || 0) * 2;
        const val = 68 + ((seed + h * 3) % 20);
        return { label, value: val };
      });
    } else if (segment === 'Daily') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      heartRatePoints = days.map((day, idx) => {
        const seed = (userId.charCodeAt(0) || 72) + idx * 5;
        const val = 65 + (seed % 22);
        return { label: day, value: val };
      });
    } else if (segment === 'Weekly') {
      const weeks = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'];
      heartRatePoints = weeks.map((wk, idx) => {
        const seed = (userId.charCodeAt(0) || 72) + idx * 7;
        const val = 68 + (seed % 18);
        return { label: wk, value: val };
      });
    } else {
      // Monthly
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      heartRatePoints = months.map((m, idx) => {
        const seed = (userId.charCodeAt(0) || 72) + idx * 4;
        const val = 70 + (seed % 16);
        return { label: m, value: val };
      });
    }

    const values = heartRatePoints.map((p) => p.value);
    const average = values.length
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : 0;
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;
    const current = values.length ? values[values.length - 1] : average;

    const status =
      average < 60
        ? 'Resting / Low (Bradycardia indicator)'
        : average > 100
          ? 'Elevated (Tachycardia indicator)'
          : `Normal resting range (±${average})`;

    // Dynamic sleep telemetry
    const sleepRings: RingData[] = [
      { label: 'Awake', value: 8 + ((encounters?.length || 0) % 5), color: '#9CA3AF' },
      { label: 'Light', value: 72, color: '#0F1115' },
      { label: 'Deep', value: 20 - ((encounters?.length || 0) % 5), color: '#4B5563' },
    ];

    // Dynamic lab / hemoglobin data
    const labMonths = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
    const labBars: BarDataPoint[] = labMonths.map((m, idx) => {
      const baseVal = 100 + (((userId.charCodeAt(0) || 10) + idx * 6) % 24);
      return {
        label: m,
        value: baseVal,
        isElevated: baseVal > 115,
      };
    });

    const latestHgb = labBars[labBars.length - 1].value;
    const labBadge = `${latestHgb} Hgb ${latestHgb > 115 ? 'Elevated' : 'Normal'}`;

    res.json({
      segment,
      currentHeartRate: current,
      heartRateStatus: status,
      heartRatePoints,
      average,
      min,
      max,
      sleepDuration: '7.8h',
      sleepRings,
      labBars,
      labBadge,
      encounterCount: encounters?.length || 0,
      dataSource: 'synthetic',
      isSynthetic: true,
    });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Analytics Vitals error');
    }
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
