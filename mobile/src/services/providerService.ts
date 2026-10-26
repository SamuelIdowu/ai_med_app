import { Provider } from './types';
import { api } from './api';
import { supabase } from './supabase';
import { normalizeLatitude, normalizeLongitude } from './geoUtils';

const normalizeProvider = (provider: Provider): Provider => ({
    ...provider,
    lat: normalizeLatitude(provider.lat),
    lng: normalizeLongitude(provider.lng),
});

export const ProviderService = {
    getProviders: async (): Promise<Provider[]> => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            console.log('[ProviderService] No session — returning empty providers (guest mode).');
            return [];
        }
        try {
            console.log('Fetching providers from:', api.defaults.baseURL + '/providers');
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out')), 5000)
            );

            const response = await Promise.race([
                api.get('/providers'),
                timeoutPromise
            ]) as any;

            return ((response.data || []) as Provider[]).map(normalizeProvider);
        } catch (e) {
            console.error('Failed to fetch providers', e);
            throw e;
        }
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
