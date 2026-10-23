import axios from 'axios';
import { supabase } from './supabase';

import { Platform } from 'react-native';

const getBaseUrl = (): string => {
    if (process.env.EXPO_PUBLIC_BACKEND_URL) {
        return process.env.EXPO_PUBLIC_BACKEND_URL.replace(/\/$/, '');
    }

    if (typeof window !== 'undefined' && typeof (window as any).location?.hostname === 'string') {
        const host = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
        return `http://${host}:3000/api/v1`;
    }

    // React Native Development Fallbacks
    if (Platform.OS === 'android') {
        // 10.0.2.2 is Android emulator's alias to host loopback interface
        return 'http://10.0.2.2:3000/api/v1';
    }

    return 'http://localhost:3000/api/v1';
};

export const api = axios.create({
    baseURL: getBaseUrl(),
    timeout: 60000, // 60 seconds — image uploads can be large over local WiFi
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
});

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

// Add a request interceptor to attach the JWT token
api.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
        if (isDev) {
            console.log('[API] Attaching token to request:', config.url);
        }
    } else if (isDev) {
        console.warn('[API] No session or token found for request:', config.url);
    }
    if (isDev) {
        console.log('[API Request]', config.method?.toUpperCase(), config.url);
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Coalesce concurrent refresh attempts so a burst of 401s only refreshes once.
let refreshPromise: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
    if (!refreshPromise) {
        refreshPromise = (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return null;
                const { data, error } = await supabase.auth.refreshSession();
                if (error) return null;
                return data.session?.access_token ?? null;
            } catch {
                return null;
            }
        })().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

// Retry a request once after refreshing an expired Supabase session.
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error?.config;
        if (error?.response?.status === 401 && original && !original.__isAuthRetry) {
            original.__isAuthRetry = true;
            const token = await refreshAccessToken();
            if (token) {
                original.headers = {
                    ...(original.headers || {}),
                    Authorization: `Bearer ${token}`,
                };
                return api(original);
            }
        }
        return Promise.reject(error);
    }
);
