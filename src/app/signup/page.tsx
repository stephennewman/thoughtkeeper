'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUpPage() {
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        // Might still redirect to / on SIGNED_IN, depends on Supabase email confirmation flow
        router.push('/'); 
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="p-8 rounded-lg shadow-md w-full max-w-md border">
        <div className="flex justify-center mb-6">
          <img 
            src="https://s3.ca-central-1.amazonaws.com/logojoy/logos/217739981/noBgColor.png?388025.2999999523" 
            alt="Thoughtkeeper Logo" 
            className="h-16 w-auto"
          />
        </div>
        
        <h2 className="text-2xl font-semibold text-center mb-6">Create Account</h2>
        
        <Auth
          supabaseClient={supabase}
          appearance={{ 
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))',
                  brandAccent: 'hsl(var(--primary) / 0.9)',
                },
              }
            }
          }}
          providers={[]}
          view="sign_up" // Specify sign-up view
          theme={resolvedTheme === 'dark' ? 'dark' : 'default'}
          showLinks={false} // We'll add our own link below
          redirectTo="/" // Redirect to home after sign up (might require email confirmation first)
        />
        <div className="text-center mt-4">
          <Link href="/signin" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
} 