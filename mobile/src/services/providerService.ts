import { Provider } from './types';
import { api } from './api';
import { supabase } from './supabase';
import { normalizeLatitude, normalizeLongitude } from './geoUtils';
import type { Coordinates } from './geoUtils';

export type NearbyProvidersResponse = {
    providers: Provider[];
    source: 'OpenStreetMap' | 'Geoapify';
    sourceTimestamp: string | null;
};

const normalizeProvider = (provider: Provider): Provider => ({
    ...provider,
    lat: normalizeLatitude(provider.lat),
    lng: normalizeLongitude(provider.lng),
});

export const ProviderService = {
    getProviders: async (coordinates: Coordinates): Promise<NearbyProvidersResponse> => {
        const response = await api.get<NearbyProvidersResponse>('/providers/nearby', {
            params: {
                lat: coordinates.latitude,
                lng: coordinates.longitude,
                radius: 50_000,
            },
            timeout: 30_000,
        });

        return {
            ...response.data,
            providers: (response.data.providers || []).map(normalizeProvider),
        };
    },

    getProviderContact: async (providerId: string): Promise<string | null> => {
        const response = await api.get<{ phone: string | null }>(
            `/providers/nearby/${encodeURIComponent(providerId)}/contact`,
            { timeout: 8_000 },
        );
        return response.data.phone;
    },

    searchProviders: async (query: string): Promise<Provider[]> => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            return [];
        }
        try {
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out')), 5000)
            );

            const response = await Promise.race([
                api.get('/providers'),
                timeoutPromise
            ]) as any;

            const lowerQuery = query.toLowerCase();
            return ((response.data || []) as Provider[])
                .map(normalizeProvider)
                .filter((p) =>
                    p.name?.toLowerCase().includes(lowerQuery) ||
                    p.type?.toLowerCase().includes(lowerQuery) ||
                    p.address?.toLowerCase().includes(lowerQuery)
                );
        } catch (e) {
            console.error('Failed to search providers', e);
            throw e;
        }
    },

    getProviderById: async (id: string): Promise<Provider | undefined> => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            return undefined;
        }
        try {
            const response = await api.get(`/providers/${id}`);
            return normalizeProvider(response.data as Provider);
        } catch (e) {
            console.error(`Failed to get provider by id ${id}:`, e);
            return undefined;
        }
    }
};
