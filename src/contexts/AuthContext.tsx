import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { initCloudMirror, stopCloudMirror } from '@/lib/cloudMirror';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const signUpSchema = z.object({
  email: z.string().email('Invalid email address').max(255, 'Email too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
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
  signOut: (opts?: { keepSavedEmail?: boolean }) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
[REDACTED CREDENTIAL]
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Detect if the current page load is mid-OAuth callback (URL-based only) */
function isOAuthCallbackUrl(): boolean {
  return (
    window.location.hash.includes('access_token') ||
    window.location.search.includes('code=')
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  // Track whether we detected an OAuth callback at mount time
  const isOAuthRef = useRef(isOAuthCallbackUrl());
  // Safety timeout so we never stay loading forever
  const oauthTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Every route guard now blocks on `authReady`, so it must always be reached. */
  const AUTH_RESOLVE_CEILING_MS = 15000;

  useEffect(() => {
    // Ensure a students row exists for this auth user so class_id is always resolvable
    const provisionStudentRecord = async (userId: string) => {
      const { data: existing, error: readError } = await supabase
        .from('students')
        .select('class_id')
        .eq('user_id', userId)
        .maybeSingle();

      // A swallowed read error yields existing=null and wrongly attempts a
      // duplicate insert; a swallowed insert error leaves the user with no
      // students row (class_id never resolvable). Surface both.
      if (readError) {
        console.error('[auth] provision read failed:', readError.message);
        return;
      }

      if (!existing) {
        const { error: insertError } = await supabase.from('students').insert({
          user_id: userId,
          class_id: userId,
          token_hash: userId,
        });
        // Ignore a unique-violation race (a parallel provision won); log the rest.
        if (insertError && insertError.code !== '23505') {
          console.error('[auth] provision insert failed:', insertError.message);
        }
      }
    };

    // Guards against a resolution arriving after teardown (a StrictMode
    // remount, or a slow getSession landing on an unmounted provider). Without
    // it a late resolve writes state into a dead tree and, worse, can flip
    // authReady back and forth while route guards are reading it.
    let cancelled = false;

    const markReady = (s: Session | null) => {
      if (cancelled) return;
      setSession(s);
      // Keep the user object's identity stable across TOKEN_REFRESHED. Supabase
      // fires that roughly hourly and on tab refocus with a fresh object for the
      // same person; handing it straight to setUser re-runs every effect keyed on
      // `user` downstream. One of those rebuilt a live drill session mid-lesson.
      setUser((prev) => {
        const next = s?.user ?? null;
        if (prev && next && prev.id === next.id) return prev;
        return next;
      });
      setLoading(false);
      setAuthReady(true);
      sessionStorage.removeItem('oauth_pending');
      if (oauthTimeoutRef.current) {
        clearTimeout(oauthTimeoutRef.current);
        oauthTimeoutRef.current = null;
      }
      if (s?.user) {
        provisionStudentRecord(s.user.id);
        initCloudMirror(s.user.id);
      } else {
        stopCloudMirror();
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
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
    supabase.auth.getSession().then(
      ({ data: { session: existingSession } }) => {
        if (existingSession) {
          markReady(existingSession);
        } else if (!isOAuthRef.current) {
          markReady(null);
        }
      },
      (err) => {
        // A rejected getSession used to leave authReady false forever. Now that
        // every ProtectedRoute blocks on authReady, that would be a permanently
        // spinning app rather than a degraded one — so resolve to signed-out and
        // let the guards do their job.
        console.error('[auth] getSession failed:', err);
        if (!isOAuthRef.current) markReady(null);
      },
    );

    // Silent safety net: Auth.tsx owns the user-visible 10s return-leg timeout.
    // This timer is longer (15s) so it only fires if the page is in an unusual
    // state where Auth.tsx's timeout never ran. No toast, no user-visible signal —
    // just unfreeze the UI so route guards can act on `user = null`.
    // Armed on every load, not only the OAuth leg. Route guards block on
    // authReady, so any path that never resolves — a hung network, an SDK that
    // neither resolves nor rejects — would otherwise spin forever.
    oauthTimeoutRef.current = setTimeout(() => {
      if (cancelled) return;
      sessionStorage.removeItem('oauth_pending');
      setLoading(false);
      setAuthReady(true);
    }, AUTH_RESOLVE_CEILING_MS);

    return () => {
      cancelled = true;
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
    const { error } = await supabase.auth.signOut();
    // Drop every cached query so the next account to sign in on this device
    // never sees the previous account's data.
    queryClient.clear();
    return { error };
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
    // Defensive fallback — can occur during HMR / fast-refresh when the
    // provider module is briefly out of sync with consumers. Returning a
    // safe stub prevents a blank-screen crash; consumers handle null user.
    if (import.meta.env.DEV) {
      console.warn('useAuth called outside AuthProvider — returning stub.');
    }
    return {
      user: null,
      session: null,
      loading: true,
      authReady: false,
      signUp: async () => ({ error: new Error('Auth not ready') }),
      signIn: async () => ({ error: new Error('Auth not ready') }),
      signOut: async () => ({ error: new Error('Auth not ready') }),
      resetPassword: async () => ({ error: new Error('Auth not ready') }),
      updatePassword: async () => ({ error: new Error('Auth not ready') }),
    } as AuthContextValue;
  }
  return context;
}
