import { Provider } from './types';
import { api } from './api';

export const ProviderService = {
    getProviders: async (): Promise<Provider[]> => {
        try {
            console.log('Fetching providers from:', api.defaults.baseURL + '/providers');
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out')), 5000)
            );

            const response = await Promise.race([
                api.get('/providers'),
                timeoutPromise
            ]) as any;

            return response.data || [];
        } catch (e) {
            console.error('Failed to fetch providers', e);
            throw e;
        }
    },

    searchProviders: async (query: string): Promise<Provider[]> => {
        try {
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out')), 5000)
            );

            const response = await Promise.race([
                api.get('/providers'),
                timeoutPromise
            ]) as any;

            const lowerQuery = query.toLowerCase();
            return (response.data || []).filter((p: Provider) =>
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
        try {
            const response = await api.get(`/providers/${id}`);
            return response.data;
        } catch (e) {
            console.error(`Failed to get provider by id ${id}:`, e);
            return undefined;
        }
    }
};
