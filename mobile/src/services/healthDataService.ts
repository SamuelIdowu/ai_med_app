import { Platform } from 'react-native';
import { VitalsService, VitalReadingInput } from './vitalsService';

const LOOKBACK_DAYS = 30;
const UPLOAD_BATCH_SIZE = 100;

type ReadingMetric = VitalReadingInput['metric'];
type HealthReading = Omit<VitalReadingInput, 'externalId' | 'encounterId'> & { externalId: string };

const makeReading = (
  metric: ReadingMetric,
  value: number,
  recordedAt: string,
  externalId: string,
  source: VitalReadingInput['source'],
): HealthReading | null => {
  if (!Number.isFinite(value) || !Number.isFinite(Date.parse(recordedAt)) || !externalId) return null;
  return { metric, value, recordedAt, externalId, source };
};

const uploadReadings = async (readings: HealthReading[]): Promise<number> => {
  let uploaded = 0;
  for (let offset = 0; offset < readings.length; offset += UPLOAD_BATCH_SIZE) {
    const batch = readings.slice(offset, offset + UPLOAD_BATCH_SIZE);
    await VitalsService.recordReadings(batch);
    uploaded += batch.length;
  }
  return uploaded;
};

async function syncAppleHealth(requestAuthorization: boolean, lookbackDays = LOOKBACK_DAYS): Promise<number> {
  const AppleHealthKit = require('react-native-health').default;
  const permissions = {
    permissions: {
      read: [
        AppleHealthKit.Constants.Permissions.HeartRate,
        AppleHealthKit.Constants.Permissions.BloodPressureSystolic,
        AppleHealthKit.Constants.Permissions.BloodPressureDiastolic,
        AppleHealthKit.Constants.Permissions.OxygenSaturation,
        AppleHealthKit.Constants.Permissions.RespiratoryRate,
        AppleHealthKit.Constants.Permissions.BodyTemperature,
      ],
      write: [],
    },
  };

  if (requestAuthorization) {
    await new Promise<void>((resolve, reject) => {
      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) reject(new Error('Could not access Apple Health. Check Health permissions in Settings.'));
        else resolve();
      });
    });
  }

  const startDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const options = { startDate, endDate: new Date().toISOString(), ascending: true };
  const query = <T,>(method: (...args: any[]) => void): Promise<T[]> => new Promise((resolve, reject) => {
    method(options, (error: string, results: T[]) => error ? reject(error) : resolve(results || []));
  });

  const [heartRates, bloodPressures, oxygenSamples, respiratoryRates, temperatures] = await Promise.all([
    query<any>(AppleHealthKit.getHeartRateSamples.bind(AppleHealthKit)),
    query<any>(AppleHealthKit.getBloodPressureSamples.bind(AppleHealthKit)),
    query<any>(AppleHealthKit.getOxygenSaturationSamples.bind(AppleHealthKit)),
    query<any>(AppleHealthKit.getRespiratoryRateSamples.bind(AppleHealthKit)),
    query<any>(AppleHealthKit.getBodyTemperatureSamples.bind(AppleHealthKit)),
  ]);

  const readings: HealthReading[] = [];
  const add = (reading: HealthReading | null) => { if (reading) readings.push(reading); };

  heartRates.forEach((sample) => add(makeReading(
    'heart_rate', sample.value, sample.endDate, `healthkit-${sample.id || sample.endDate}-hr`, 'healthkit',
  )));
  bloodPressures.forEach((sample) => {
    const id = sample.id || sample.endDate;
    add(makeReading('systolic_bp', sample.bloodPressureSystolicValue, sample.endDate, `healthkit-${id}-sys`, 'healthkit'));
    add(makeReading('diastolic_bp', sample.bloodPressureDiastolicValue, sample.endDate, `healthkit-${id}-dia`, 'healthkit'));
  });
  oxygenSamples.forEach((sample) => add(makeReading(
    'oxygen_saturation', sample.value <= 1 ? sample.value * 100 : sample.value,
    sample.endDate, `healthkit-${sample.id || sample.endDate}-spo2`, 'healthkit',
  )));
  respiratoryRates.forEach((sample) => add(makeReading(
    'respiratory_rate', sample.value, sample.endDate, `healthkit-${sample.id || sample.endDate}-rr`, 'healthkit',
  )));
  temperatures.forEach((sample) => add(makeReading(
    'body_temperature', sample.value, sample.endDate, `healthkit-${sample.id || sample.endDate}-temp`, 'healthkit',
  )));

  return uploadReadings(readings);
}

async function syncHealthConnect(requestAuthorization: boolean, lookbackDays = LOOKBACK_DAYS): Promise<number> {
  const healthConnect = require('react-native-health-connect');
  const initialized = await healthConnect.initialize();
  if (!initialized) throw new Error('Health Connect is unavailable. Install or update Health Connect and try again.');

  const recordTypes = ['HeartRate', 'BloodPressure', 'OxygenSaturation', 'RespiratoryRate', 'BodyTemperature'] as const;
  const permissions = recordTypes.map((recordType) => ({ accessType: 'read' as const, recordType }));
  const granted = requestAuthorization
    ? await healthConnect.requestPermission(permissions)
    : await healthConnect.getGrantedPermissions();
  const grantedTypes = new Set(granted.filter((permission: any) => permission.accessType === 'read').map((permission: any) => permission.recordType));
  const startTime = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const endTime = new Date().toISOString();
  const options = { timeRangeFilter: { operator: 'between', startTime, endTime } };
  const records: HealthReading[] = [];
  const add = (reading: HealthReading | null) => { if (reading) records.push(reading); };
  const read = async (recordType: typeof recordTypes[number]) => {
    if (!grantedTypes.has(recordType)) return [];
    const result = await healthConnect.readRecords(recordType, options);
    return result.records || [];
  };

  const [heartRates, bloodPressures, oxygenSamples, respiratoryRates, temperatures] = await Promise.all(
    recordTypes.map((recordType) => read(recordType)),
  );

  heartRates.forEach((record: any) => record.samples?.forEach((sample: any) => add(makeReading(
    'heart_rate', sample.beatsPerMinute, sample.time,
    `health-connect-${record.metadata?.id || record.startTime}-${sample.time}-hr`, 'health_connect',
  ))));
  bloodPressures.forEach((record: any) => {
    const id = record.metadata?.id || record.time;
    add(makeReading('systolic_bp', record.systolic?.value, record.time, `health-connect-${id}-sys`, 'health_connect'));
    add(makeReading('diastolic_bp', record.diastolic?.value, record.time, `health-connect-${id}-dia`, 'health_connect'));
  });
  oxygenSamples.forEach((record: any) => add(makeReading(
    'oxygen_saturation', record.percentage, record.time,
    `health-connect-${record.metadata?.id || record.time}-spo2`, 'health_connect',
  )));
  respiratoryRates.forEach((record: any) => add(makeReading(
    'respiratory_rate', record.rate, record.time,
    `health-connect-${record.metadata?.id || record.time}-rr`, 'health_connect',
  )));
  temperatures.forEach((record: any) => {
    const value = record.temperature?.unit === 'fahrenheit'
      ? ((record.temperature.value - 32) * 5) / 9
      : record.temperature?.value;
    add(makeReading('body_temperature', value, record.time,
      `health-connect-${record.metadata?.id || record.time}-temp`, 'health_connect'));
  });

  return uploadReadings(records);
}

export const HealthDataService = {
  connectAndSync: async (): Promise<number> => {
    if (Platform.OS === 'ios') return syncAppleHealth(true);
    if (Platform.OS === 'android') return syncHealthConnect(true);
    throw new Error('Health data sync is available in the iOS and Android apps.');
  },
  syncGrantedData: async (): Promise<number> => {
    if (Platform.OS === 'ios') return syncAppleHealth(false, 1);
    if (Platform.OS === 'android') return syncHealthConnect(false, 1);
    return 0;
  },
};
