import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const signUpSchema = z.object({
  email: z.string().email('Invalid email address').max(255, 'Email too long'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password too long'),
  name: z.string()
    .min(1, 'Name is required')
    .max(50, 'Name must be at most 50 characters')
});

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** True once the auth state has been definitively resolved (safe for route guards) */
  authReady: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: (opts?: { keepSavedEmail?: boolean }) => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Detect if the current page load is mid-OAuth callback (URL-based only) */
function isOAuthCallbackUrl(): boolean {
  return (
    window.location.pathname.includes('~oauth') ||
    window.location.hash.includes('access_token') ||
    window.location.search.includes('code=')
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  // Track whether we detected an OAuth callback at mount time
  const isOAuthRef = useRef(isOAuthCallbackUrl());
  // Safety timeout so we never stay loading forever
  const oauthTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Ensure a students row exists for this auth user so class_id is always resolvable
    const provisionStudentRecord = async (userId: string) => {
      const { data: existing } = await supabase
        .from('students')
        .select('class_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        await supabase.from('students').insert({
          user_id: userId,
          class_id: userId,
          token_hash: userId,
        });
      }
    };

    const markReady = (s: Session | null) => {
      console.log('[AuthContext] markReady', { hasSession: !!s, userId: s?.user?.id });
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      setAuthReady(true);
      sessionStorage.removeItem('oauth_pending');
      if (oauthTimeoutRef.current) {
        clearTimeout(oauthTimeoutRef.current);
        oauthTimeoutRef.current = null;
      }
      if (s?.user) {
        provisionStudentRecord(s.user.id);
      }
    };

    // Set up auth state listener FIRST
    console.log('[AuthContext] init', { isOAuth: isOAuthRef.current, oauth_pending: sessionStorage.getItem('oauth_pending') });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('[AuthContext] onAuthStateChange', { event, hasSession: !!newSession });
        if (event === 'PASSWORD_RECOVERY') {
          markReady(newSession);
          window.location.replace('/reset-password');
          return;
        }
        if (newSession) {
          markReady(newSession);
        } else if (!isOAuthRef.current) {
          markReady(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      console.log('[AuthContext] getSession result', { hasSession: !!existingSession });
      if (existingSession) {
        markReady(existingSession);
      } else if (!isOAuthRef.current) {
        markReady(null);
      }
    });

    // Silent safety net: Auth.tsx owns the user-visible 10s return-leg timeout.
    // This timer is longer (15s) so it only fires if the page is in an unusual
    // state where Auth.tsx's timeout never ran. No toast, no user-visible signal —
    // just unfreeze the UI so route guards can act on `user = null`.
    if (isOAuthRef.current) {
      oauthTimeoutRef.current = setTimeout(() => {
        console.warn('[AuthContext] OAuth safety-net fired — unfreezing UI silently');
        sessionStorage.removeItem('oauth_pending');
        setLoading(false);
        setAuthReady(true);
      }, 15000);
    }

    return () => {
      subscription.unsubscribe();
      if (oauthTimeoutRef.current) clearTimeout(oauthTimeoutRef.current);
    };
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const validation = signUpSchema.safeParse({ email, password, name });
      if (!validation.success) {
        const firstError = validation.error.errors[0];
        toast.error(firstError.message);
        return { error: new Error(firstError.message) };
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const normalizedEmail = validation.data.email.trim().toLowerCase();
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: validation.data.name
          }
        }
      });

      if (error) throw error;
      
      return { error: null };
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up');
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    
    return { error };
  };

  const signOut = async (opts?: { keepSavedEmail?: boolean }) => {
    sessionStorage.removeItem('oauth_pending');
    if (!opts?.keepSavedEmail) {
      localStorage.removeItem('lsatu_saved_email');
    }
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      toast.success('Password reset email sent! Check your inbox.');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
      return { error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated successfully.');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
      return { error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, authReady, signUp, signIn, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
