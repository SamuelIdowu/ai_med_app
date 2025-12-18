import { Provider } from './types';
import { api } from './api';

// Mock Data
const MOCK_PROVIDERS: Provider[] = [
    {
        id: '1',
        name: 'City General Hospital',
        type: 'Hospital',
        address: '123 Health St, Medville, ST 90210',
        phone: '(555) 123-4567',
        lat: 40.7128,
        lng: -74.0060,
        created_at: new Date().toISOString()
    },
    {
        id: '2',
        name: 'Downtown Urgent Care',
        type: 'Clinic',
        address: '456 Main Ave, Medville, ST 90210',
        phone: '(555) 987-6543',
        lat: 40.7138,
        lng: -74.0070,
        created_at: new Date().toISOString()
    },
    {
        id: '3',
        name: 'Wellness Pharmacy',
        type: 'Pharmacy',
        address: '789 Broadway, Medville, ST 90210',
        phone: '(555) 555-5555',
        lat: 40.7118,
        lng: -74.0050,
        created_at: new Date().toISOString()
    },
    {
        id: '4',
        name: 'Oak Valley Clinic',
        type: 'Clinic',
        address: '321 Oak Ln, Medville, ST 90210',
        phone: '(555) 111-2222',
        lat: 40.7148,
        lng: -74.0080,
        created_at: new Date().toISOString()
    }
];

export const ProviderService = {
    getProviders: async (): Promise<Provider[]> => {
        try {
            const response = await api.get('/providers');
            return response.data;
        } catch (e) {
            console.error('Failed to fetch providers', e);
            // Fallback to mock if offline
            return MOCK_PROVIDERS;
        }
    },

    searchProviders: async (query: string): Promise<Provider[]> => {
        // Ideally backend would have a search endpoint e.g. /providers?q=...
        // For now, we fetch all and filter client side OR use the same mock filter on the backend response
        try {
            const response = await api.get('/providers');
            const lowerQuery = query.toLowerCase();
            return response.data.filter((p: Provider) =>
                p.name?.toLowerCase().includes(lowerQuery) ||
                p.type?.toLowerCase().includes(lowerQuery)
            );
        } catch (e) {
            return MOCK_PROVIDERS.filter(p =>
                p.name?.toLowerCase().includes(query.toLowerCase()) ||
                p.type?.toLowerCase().includes(query.toLowerCase())
            );
        }
    },

    getProviderById: async (id: string): Promise<Provider | undefined> => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return MOCK_PROVIDERS.find(p => p.id === id);
    }
};
