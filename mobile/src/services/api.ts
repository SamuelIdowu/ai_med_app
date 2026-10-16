import axios from 'axios';
import { supabase } from './supabase';

import { Platform } from 'react-native';

const getBaseUrl = (): string => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
        // If web browser is viewing on localhost or LAN, route to the same host on backend port 3000
        const host = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
        return `http://${host}:3000/api/v1`;
    }
    return process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.0.142:3000/api/v1';
};

export const api = axios.create({
    baseURL: getBaseUrl(),
    timeout: 60000, // 60 seconds — image uploads can be large over local WiFi
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
});

// Add a request interceptor to attach the JWT token
api.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
        console.log('[API] Attaching token to request:', config.url);
    } else {
        console.warn('[API] No session or token found for request:', config.url);
    }
    console.log('[API Request]', config.method?.toUpperCase(), config.url);
    return config;
}, (error) => {
    return Promise.reject(error);
});
