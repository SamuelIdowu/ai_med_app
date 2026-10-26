import { Platform } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../supabase';
import {
  completeGoogleSignIn,
  getGoogleRedirectUri,
  parseGoogleCallback,
  signInWithGoogle,
} from '../googleAuth';

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      setSession: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
  },
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'laso://auth/callback'),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

const authMock = supabase.auth as unknown as {
  setSession: jest.Mock;
  exchangeCodeForSession: jest.Mock;
  signInWithOAuth: jest.Mock;
};
const openAuthSessionAsync = WebBrowser.openAuthSessionAsync as jest.Mock;
const makeRedirectUriMock = makeRedirectUri as jest.Mock;

describe('googleAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as { OS: string }).OS = 'ios';
    delete (globalThis as { window?: unknown }).window;

    authMock.setSession.mockResolvedValue({ error: null });
    authMock.exchangeCodeForSession.mockResolvedValue({ error: null });
    authMock.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://example.supabase.co/auth/v1/authorize' },
      error: null,
    });
  });

  afterEach(() => {
    (Platform as { OS: string }).OS = 'ios';
    delete (globalThis as { window?: unknown }).window;
  });

  describe('parseGoogleCallback', () => {
    it('parses implicit access and refresh tokens from the URL hash', () => {
      expect(
        parseGoogleCallback(
          'laso://auth/callback#access_token=access-token&refresh_token=refresh-token',
        ),
      ).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('parses a PKCE code', () => {
      expect(parseGoogleCallback('laso://auth/callback?code=auth-code')).toEqual({
        code: 'auth-code',
      });
    });

    it('returns an OAuth error instead of a session', () => {
      expect(
        parseGoogleCallback(
          'laso://auth/callback?error=access_denied&error_description=User%20cancelled',
        ),
      ).toEqual({ error: 'User cancelled' });
    });
  });

  describe('completeGoogleSignIn', () => {
    it('sets the session from implicit tokens', async () => {
      const result = await completeGoogleSignIn(
        'laso://auth/callback#access_token=access-token&refresh_token=refresh-token',
      );

      expect(result).toEqual({ status: 'success' });
      expect(authMock.setSession).toHaveBeenCalledWith({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });
    });

    it('exchanges a PKCE code for a session', async () => {
      const result = await completeGoogleSignIn('laso://auth/callback?code=auth-code');

      expect(result).toEqual({ status: 'success' });
      expect(authMock.exchangeCodeForSession).toHaveBeenCalledWith('auth-code');
    });

    it('throws when Supabase rejects the session', async () => {
      authMock.setSession.mockResolvedValueOnce({ error: new Error('Invalid session') });

      await expect(
        completeGoogleSignIn(
          'laso://auth/callback#access_token=access-token&refresh_token=refresh-token',
        ),
      ).rejects.toThrow('Invalid session');
    });

    it('throws when the callback has no session', async () => {
      await expect(completeGoogleSignIn('laso://auth/callback')).rejects.toThrow(
        'Google sign-in returned no session.',
      );
    });
  });

  describe('native sign-in', () => {
    it('opens the auth session and completes a successful callback', async () => {
      openAuthSessionAsync.mockResolvedValueOnce({
        type: 'success',
        url: 'laso://auth/callback#access_token=access-token&refresh_token=refresh-token',
      });

      const result = await signInWithGoogle();

      expect(getGoogleRedirectUri()).toBe('laso://auth/callback');
      expect(makeRedirectUriMock).toHaveBeenCalledWith({
        scheme: 'laso',
        path: 'auth/callback',
      });
      expect(authMock.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'laso://auth/callback',
          skipBrowserRedirect: true,
        },
      });
      expect(openAuthSessionAsync).toHaveBeenCalledWith(
        'https://example.supabase.co/auth/v1/authorize',
        'laso://auth/callback',
      );
      expect(result).toEqual({ status: 'success' });
    });

    it('returns cancelled without creating a session when the browser is dismissed', async () => {
      openAuthSessionAsync.mockResolvedValueOnce({ type: 'dismiss' });

      const result = await signInWithGoogle();

      expect(result).toEqual({ status: 'cancelled' });
      expect(authMock.setSession).not.toHaveBeenCalled();
      expect(authMock.exchangeCodeForSession).not.toHaveBeenCalled();
    });
  });

  describe('web sign-in', () => {
    it('redirects the browser to the provider using the current origin', async () => {
      (Platform as { OS: string }).OS = 'web';
      (globalThis as { window?: unknown }).window = {
        location: { origin: 'http://localhost:8081' },
      };

      const result = await signInWithGoogle();

      expect(result).toEqual({ status: 'redirecting' });
      expect(authMock.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: 'http://localhost:8081' },
      });
    });
  });
});
