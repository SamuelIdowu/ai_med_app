import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    loading: boolean;
    isGuest: boolean;
    enterGuestMode: () => void;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    isGuest: false,
    enterGuestMode: () => { },
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(false);

    useEffect(() => {
        // Wait for both session check and splash animation (2.5s)
        const checkSession = supabase.auth.getSession();
        const minDelay = new Promise(resolve => setTimeout(resolve, 2500));
        Promise.all([checkSession, minDelay])
            .then(([sessionResult]) => {
                const currentSession = sessionResult?.data?.session ?? null;
                setSession(currentSession);
                setUser(currentSession?.user ?? null);
            })
            .catch((err) => {
                console.warn('Session check error:', err);
                setSession(null);
                setUser(null);
            })
            .finally(() => {
                setLoading(false);
            });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const enterGuestMode = () => {
        setIsGuest(true);
    };

    const signOut = async () => {
        if (isGuest) {
            setIsGuest(false);
        } else {
            await supabase.auth.signOut();
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, isGuest, enterGuestMode, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
