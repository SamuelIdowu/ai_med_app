import axios from 'axios';
import { supabase } from './supabase';

export const api = axios.create({
    baseURL: process.env.EXPO_PUBLIC_BACKEND_URL, // Ensure this env var is set correctly in .env
});

// Add a request interceptor to attach the JWT token
api.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    console.log('[API Request]', config.method?.toUpperCase(), config.baseURL, config.url);
    return config;
}, (error) => {
    return Promise.reject(error);
});
