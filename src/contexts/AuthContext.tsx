import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const signUpSchema = z.object({
  email: z.string().email('Invalid email address').max(255, 'Email too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string()
    .min(1, 'Name is required')
    .max(50, 'Name must be at most 50 characters')
});

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

    // Detect if we're mid-OAuth callback — don't prematurely set loading=false
    const isOAuthCallback =
      window.location.pathname.includes('~oauth') ||
      window.location.hash.includes('access_token') ||
      window.location.search.includes('code=');

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          provisionStudentRecord(session.user.id);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Only mark loading done if we're NOT in an OAuth callback without a session
      // (the onAuthStateChange will handle it once the token exchange completes)
      if (session || !isOAuthCallback) {
        setLoading(false);
      }
      if (session?.user) {
        provisionStudentRecord(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
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
      
      const { error } = await supabase.auth.signUp({
        email,
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });
      
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Google');
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

const resetPassword = async (email: string) => {
  try {
    const redirectUrl = `${window.location.origin}/auth`;
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
  <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut, resetPassword, updatePassword }}>
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
