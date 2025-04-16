'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function SignInPage() {
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        router.push('/'); // Redirect to home on successful sign-in
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
          <Image 
            // eslint-disable-next-line @next/next/no-img-element
            src="https://s3.ca-central-1.amazonaws.com/logojoy/logos/218272791/noBgBlack.png?865367" 
            alt="Thought Keeper Logo" 
            width={320}
            height={320}
          />
        </div>
        
        <h2 className="text-2xl font-semibold text-center mb-6">Sign In</h2>
        
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
          providers={['google']}
          socialLayout="horizontal"
          view="sign_in"
          theme={resolvedTheme === 'dark' ? 'dark' : 'default'}
          showLinks={false}
          redirectTo="/"
        />
        <div className="text-center mt-4">
          <Link href="/signup" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            Don't have an account? Sign up
          </Link>
        </div>
      </div>
    </div>
  );
} 