import fetch from 'node-fetch';
import { cacheService } from './cacheService';

const DEFAULT_RADIUS_METERS = 50_000;
const MAX_RESULTS = 100;
const CACHE_TTL_SECONDS = 600;
const OVERPASS_TIMEOUT_MS = 7_000;
const GEOAPIFY_TIMEOUT_MS = 9_000;
const DEFAULT_OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const FALLBACK_OVERPASS_URL = 'https://overpass.private.coffee/api/interpreter';
const GEOAPIFY_URL = 'https://api.geoapify.com/v2/places';

export type Coordinates = { latitude: number; longitude: number };

export type NearbyProvider = {
  id: string;
  name: string;
  type: string;
  address: string | null;
  phone: string | null;
  lat: number;
  lng: number;
  distanceMiles: number;
  created_at: null;
};

export type NearbyProvidersResult = {
  providers: NearbyProvider[];
  source: 'OpenStreetMap' | 'Geoapify';
  sourceTimestamp: string | null;
};

type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type GeoapifyPlace = {
  properties?: {
    place_id?: string;
    name?: string;
    address_line1?: string;
    address_line2?: string;
    formatted?: string;
    lat?: number;
    lon?: number;
    categories?: string[];
    contact?: { phone?: string; phone_international?: Record<string, string> };
    datasource?: { raw?: Record<string, string> };
  };
};

function isValidCoordinates({ latitude, longitude }: Coordinates): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function buildOverpassQuery(
  { latitude, longitude }: Coordinates,
  radiusMeters: number,
): string {
  return `[out:json][timeout:20];\n(\n  nwr(around:${radiusMeters},${latitude},${longitude})["amenity"~"^(hospital|clinic|doctors|pharmacy|dentist)$"];\n  nwr(around:${radiusMeters},${latitude},${longitude})["healthcare"~"^(hospital|clinic|doctor|doctors|pharmacy|dentist|centre|center|health_centre|health_post|urgent_care|midwife|nurse|laboratory|rehabilitation)$"];\n);\nout center tags;`;
}

function getFacilityType(tags: Record<string, string>): string {
  const kind = (tags.amenity || tags.healthcare || '').toLowerCase();
  if (kind === 'hospital') return 'Hospital';
  if (
    kind === 'clinic' ||
    kind === 'centre' ||
    kind === 'center' ||
    kind === 'health_centre' ||
    kind === 'health_post' ||
    kind === 'urgent_care' ||
    kind === 'midwife' ||
    kind === 'nurse' ||
    kind === 'rehabilitation'
  ) {
    return 'Clinic';
  }
  if (kind === 'pharmacy') return 'Pharmacy';
  if (kind === 'doctor' || kind === 'doctors') return 'Doctor';
  if (kind === 'dentist') return 'Dentist';
  if (kind === 'laboratory') return 'Laboratory';
  return 'Medical Center';
}

function getAddress(tags: Record<string, string>): string | null {
  if (tags['addr:full']) return tags['addr:full'];

  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const locality = tags['addr:city'] || tags['addr:town'] || tags['addr:village'];
  const address = [street, locality, tags['addr:postcode']].filter(Boolean).join(', ');
  return address || null;
}

function distanceMiles(from: Coordinates, latitude: number, longitude: number): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(latitude - from.latitude);
  const dLon = radians(longitude - from.longitude);
  const startLat = radians(from.latitude);
  const endLat = radians(latitude);
  const haversine =
    Math.sin(dLat / 2) ** 2 + Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLon / 2) ** 2;
  return 3958.7613 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function normalizeOverpassElements(
  elements: OverpassElement[],
  origin: Coordinates,
): NearbyProvider[] {
  const unique = new Map<string, NearbyProvider>();

  for (const element of elements) {
    const point = element.type === 'node' ? { lat: element.lat, lon: element.lon } : element.center;
    if (
      !point ||
      typeof point.lat !== 'number' ||
      typeof point.lon !== 'number' ||
      !Number.isFinite(point.lat) ||
      !Number.isFinite(point.lon)
    ) {
      continue;
    }

    const tags = element.tags ?? {};
    const type = getFacilityType(tags);
    const provider: NearbyProvider = {
      id: `osm-${element.type}-${element.id}`,
      name: tags.name || tags['name:en'] || tags.operator || tags.brand || type,
      type,
      address: getAddress(tags),
      phone: tags.phone || tags['contact:phone'] || null,
      lat: point.lat,
      lng: point.lon,
      distanceMiles: distanceMiles(origin, point.lat, point.lon),
      created_at: null,
    };

    unique.set(provider.id, provider);
  }

  return [...unique.values()]
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, MAX_RESULTS);
}

function getGeoapifyFacilityType(categories: string[] = []): string {
  if (categories.some((category) => category.includes('hospital'))) return 'Hospital';
  if (categories.some((category) => category.includes('pharmacy'))) return 'Pharmacy';
  if (categories.some((category) => category.includes('dentist'))) return 'Dentist';
  if (
    categories.some(
      (category) =>
        category.includes('clinic') || category.includes('praxis') || category.includes('doctors'),
    )
  ) {
    return 'Clinic';
  }
  return 'Medical Center';
}

export function normalizeGeoapifyPlaces(
  places: GeoapifyPlace[],
  origin: Coordinates,
): NearbyProvider[] {
  const normalized = places.flatMap(({ properties }) => {
    if (
      !properties ||
      typeof properties.lat !== 'number' ||
      typeof properties.lon !== 'number' ||
      !Number.isFinite(properties.lat) ||
      !Number.isFinite(properties.lon)
    ) {
      return [];
    }

    const type = getGeoapifyFacilityType(properties.categories);
    return [
      {
        id: `geoapify-${properties.place_id || `${properties.lat}-${properties.lon}`}`,
        name: properties.name || properties.address_line1 || type,
        type,
        address: properties.address_line2 || properties.formatted || null,
        phone:
          properties.contact?.phone ||
          Object.values(properties.contact?.phone_international ?? {})[0] ||
          properties.datasource?.raw?.phone ||
          properties.datasource?.raw?.['contact:phone'] ||
          null,
        lat: properties.lat,
        lng: properties.lon,
        distanceMiles: distanceMiles(origin, properties.lat, properties.lon),
        created_at: null,
      },
    ];
  });

  return normalized.sort((a, b) => a.distanceMiles - b.distanceMiles).slice(0, MAX_RESULTS);
}

function cacheKey(origin: Coordinates, radiusMeters: number): string {
  // The 3-decimal grid reuses nearby lookups despite normal GPS jitter. The app
  // recalculates each facility's distance from the user's exact coordinates.
  const latitude = origin.latitude.toFixed(3);
  const longitude = origin.longitude.toFixed(3);
  return `providers:nearby:${latitude}:${longitude}:${radiusMeters}`;
}

async function findGeoapifyProviders(
  origin: Coordinates,
  radiusMeters: number,
  apiKey: string,
): Promise<NearbyProvidersResult> {
  const url = new URL(GEOAPIFY_URL);
  url.searchParams.set('categories', 'healthcare');
  url.searchParams.set('filter', `circle:${origin.longitude},${origin.latitude},${radiusMeters}`);
  url.searchParams.set('bias', `proximity:${origin.longitude},${origin.latitude}`);
  url.searchParams.set('limit', String(MAX_RESULTS));
  url.searchParams.set('lang', 'en');

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json', 'x-api-key': apiKey },
    timeout: GEOAPIFY_TIMEOUT_MS,
  } as never);
  if (!response.ok) {
    throw new Error(`Geoapify Places returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { features?: GeoapifyPlace[] };
  return {
    providers: normalizeGeoapifyPlaces(payload.features ?? [], origin),
    source: 'Geoapify',
    sourceTimestamp: null,
  };
}

export async function findGeoapifyProviderPhone(placeId: string): Promise<string | null> {
  const apiKey = process.env.GEOAPIFY_API_KEY?.trim();
  if (!apiKey) return null;

  const key = `providers:contact:${placeId}`;
  const cached = await cacheService.get<{ phone: string | null }>(key);
  if (cached) return cached.phone;

  const url = new URL('https://api.geoapify.com/v2/place-details');
  url.searchParams.set('id', placeId);
  url.searchParams.set('features', 'details');
  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json', 'x-api-key': apiKey },
    timeout: GEOAPIFY_TIMEOUT_MS,
  } as never);
  if (!response.ok) throw new Error(`Geoapify Place Details returned HTTP ${response.status}`);

  const payload = (await response.json()) as {
    features?: Array<{
      properties?: {
        contact?: { phone?: string; phone_international?: Record<string, string> };
        datasource?: { raw?: Record<string, string> };
      };
    }>;
  };
  const properties = payload.features?.[0]?.properties;
  const phone = (
    properties?.contact?.phone ||
    Object.values(properties?.contact?.phone_international ?? {})[0] ||
    properties?.datasource?.raw?.phone ||
    properties?.datasource?.raw?.['contact:phone'] ||
    null
  );
  await cacheService.set(key, { phone }, 86_400);
  return phone;
}

export async function findNearbyProviders(
  origin: Coordinates,
  radiusMeters = DEFAULT_RADIUS_METERS,
): Promise<NearbyProvidersResult> {
  if (!isValidCoordinates(origin)) {
    throw new Error('A valid latitude and longitude are required');
  }
  if (
    !Number.isFinite(radiusMeters) ||
    radiusMeters < 250 ||
    radiusMeters > DEFAULT_RADIUS_METERS
  ) {
    throw new Error(`Radius must be between 250 and ${DEFAULT_RADIUS_METERS} meters`);
  }

  const key = cacheKey(origin, radiusMeters);
  const cached = await cacheService.get<NearbyProvidersResult>(key);
  if (cached) return cached;

  const geoapifyApiKey = process.env.GEOAPIFY_API_KEY?.trim();

  // Geoapify is the primary provider when configured: it responds faster and
  // avoids serial waits on public Overpass instances during normal requests.
  if (geoapifyApiKey) {
    try {
      const result = await findGeoapifyProviders(origin, radiusMeters, geoapifyApiKey);
      if (result.providers.length > 0) {
        await cacheService.set(key, result, CACHE_TTL_SECONDS);
        return result;
      }
    } catch {
      // Fall through to the open Overpass endpoints when Geoapify is unavailable.
    }
  }

  const configuredEndpoints = (process.env.OVERPASS_API_URL || DEFAULT_OVERPASS_URL)
    .split(',')
    .map((endpoint) => endpoint.trim())
    .filter(Boolean);
  const endpoints = [...new Set([...configuredEndpoints, FALLBACK_OVERPASS_URL])];
  const query = buildOverpassQuery(origin, radiusMeters);
  let payload: { elements?: OverpassElement[]; osm3s?: { timestamp_osm_base?: string } } | null =
    null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'LasoProviderDirectory/1.0 (nearby healthcare search)',
        },
        body: new URLSearchParams({ data: query }).toString(),
        timeout: OVERPASS_TIMEOUT_MS,
      } as never);

      if (!response.ok) continue;
      payload = (await response.json()) as {
        elements?: OverpassElement[];
        osm3s?: { timestamp_osm_base?: string };
      };
      break;
    } catch {
      // Public Overpass instances can be busy; try the next configured instance.
    }
  }

  const osmProviders = payload ? normalizeOverpassElements(payload.elements ?? [], origin) : [];
  const result: NearbyProvidersResult | null = payload
    ? {
        providers: osmProviders,
        source: 'OpenStreetMap',
        sourceTimestamp: payload.osm3s?.timestamp_osm_base ?? null,
      }
    : null;

  if (!result) {
    throw new Error('Nearby facility data sources are unavailable');
  }

  await cacheService.set(key, result, CACHE_TTL_SECONDS);
  return result;
}
