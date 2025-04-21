'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { toast } from "sonner";
import { Settings, LogOut, Loader2 } from 'lucide-react'; 
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Header } from '@/components/Header'; 
import { JournalSidebar } from '@/components/JournalSidebar';
import { StaticAnalysisColumn } from '@/components/StaticAnalysisColumn';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  // --- Supabase Auth Listener (Moved from page.tsx) --- 
  useEffect(() => {
    console.log("[AppLayout] Setting up onAuthStateChange listener");
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[AppLayout] Auth state changed:", event, !!session);
      setSession(session); 
      setAuthChecked(true); // Mark auth as checked once listener fires
      if (event === 'SIGNED_OUT') {
        router.push('/signin'); // Redirect to signin on sign out
      }
    });

    // Initial check in case the listener doesn't fire immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setAuthChecked(true); // Mark auth checked even if no session
      }
      // No need to setSession here, listener will handle it
    });

    return () => {
      console.log("[AppLayout] Cleaning up onAuthStateChange listener");
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  // --- Redirect if not logged in (Moved from page.tsx) ---
  useEffect(() => {
    if (authChecked && !session) {
      console.log("[AppLayout] Auth checked, no session found. Redirecting to /signin");
      router.push('/signin');
    }
  }, [session, authChecked, router]);

  const handleSignOut = async () => {
    console.log("[AppLayout] Sign out initiated...");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[AppLayout] Error signing out:", error);
      toast.error("Sign out failed", { description: error.message });
    } else {
      console.log("[AppLayout] Sign out successful. Auth listener should handle redirect.");
      // Redirect handled by listener
    }
  };

  // --- Loading State (Moved from page.tsx) --- 
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // --- Redirecting State (Show loader while redirecting) ---
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // --- Actual App Layout --- 
  return (
    <div className="flex flex-row min-h-screen bg-background">
      {/* Sidebar placeholder/actual component - Assuming JournalSidebar is self-contained */}
      <div className="hidden lg:block w-64 flex-shrink-0 border-r">
         <JournalSidebar /> 
      </div>

      {/* Main content area */} 
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header - Assuming Header is self-contained */}
        <Header />

        {/* Page Content Rendered Here */}
        <main className="flex flex-1 overflow-hidden">
          {children} 
        </main>
      </div>

      {/* Static Analysis Column - Assuming it's self-contained */}
      {/* Consider if this should be inside the main scrollable area depending on desired behavior */} 
      <StaticAnalysisColumn />

      {/* Settings/Profile/Logout Popover (Moved from page.tsx) */} 
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className="fixed bottom-4 right-4 z-50 bg-background hover:bg-muted rounded-full w-10 h-10"
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 mr-4 mb-2" align="end" sideOffset={10}>
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Account</h4>
              <p className="text-sm text-muted-foreground">
                Manage your profile and settings.
              </p>
            </div>
            <Separator />
            <div className="grid gap-1">
              <Link href="/profile" passHref legacyBehavior>
                <Button variant="ghost" className="w-full justify-start px-2">
                  Profile
                </Button>
              </Link>
              <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start px-2 text-red-600 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30">
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 