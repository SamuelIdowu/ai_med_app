import { Platform } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_REDIRECT_PATH = 'auth/callback';

export type GoogleSignInResult =
  { status: 'success' } | { status: 'cancelled' } | { status: 'redirecting' };

export interface GoogleCallbackParams {
  accessToken?: string;
  refreshToken?: string;
  code?: string;
  error?: string;
}

export function getGoogleRedirectUri(): string {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') {
      throw new Error('Google sign-in is only available in a browser on web.');
    }
    return window.location.origin;
  }

  return makeRedirectUri({ scheme: 'laso', path: GOOGLE_REDIRECT_PATH });
}

function parseUrlParams(url: string): Record<string, string> {
  const parsed = new URL(url, 'https://phony.example');
  const params: Record<string, string> = {};

  parsed.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const hash = parsed.hash.replace(/^#/, '');

  if (hash) {
    new URLSearchParams(hash).forEach((value, key) => {
      params[key] = value;
    });
  }

  return params;
}

export function parseGoogleCallback(url: string): GoogleCallbackParams {
  const params = parseUrlParams(url);
  const error = params.error_code ?? params.errorCode ?? params.error_description ?? params.error;

  if (error) {
    return { error };
  }

  if (params.code) {
    return { code: params.code };
  }

  if (params.access_token && params.refresh_token) {
    return {
      accessToken: params.access_token,
      refreshToken: params.refresh_token,
    };
  }

  return { error: 'Google sign-in returned no session.' };
}

export async function completeGoogleSignIn(url: string): Promise<GoogleSignInResult> {
  const callback = parseGoogleCallback(url);

  if (callback.error) {
    throw new Error(callback.error);
  }

  if (callback.accessToken && callback.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: callback.accessToken,
      refresh_token: callback.refreshToken,
    });

    if (error) {
      throw error;
    }

    return { status: 'success' };
  }

  if (callback.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(callback.code);

    if (error) {
      throw error;
    }

    return { status: 'success' };
  }

  throw new Error('Google sign-in returned no session.');
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const redirectTo = getGoogleRedirectUri();

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (error) {
      throw error;
    }

    return { status: 'redirecting' };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error('Could not start Google sign-in.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { status: 'cancelled' };
  }

  if (result.type !== 'success') {
    throw new Error('Google sign-in did not complete.');
  }

  return completeGoogleSignIn(result.url);
}
