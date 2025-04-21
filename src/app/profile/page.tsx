'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, UserCircle, Plug } from 'lucide-react';
import { MinimalHeader } from '@/components/MinimalHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // --- State for forms ---
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  // -----------------------

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error fetching session:', error);
          // Optionally redirect on error too, or show an error message
          router.push('/signin'); 
          return;
        }

        if (!session) {
          router.push('/signin');
        } else {
          setUser(session.user);
        }
      } catch (error) {
        console.error('Unexpected error fetching session:', error);
        router.push('/signin'); // Redirect on unexpected errors
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [router]);

  // --- Update Handlers ---
  const handleUpdateEmail = async (event: FormEvent) => {
    event.preventDefault();
    if (!newEmail || !user || user.email === newEmail) {
      toast.info("Please enter a new, different email address.");
      return;
    }
    setIsUpdatingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) {
        throw error;
      }
      toast.success("Confirmation email sent!", {
        description: `Please check ${newEmail} to confirm the change.`,
      });
      setNewEmail(''); 
    } catch (error: any) {
      console.error("Error updating email:", error);
      let description = "Please try again.";
      if (error.message) {
        if (error.message.includes("User already registered")) {
            description = "This email address is already in use by another account.";
        } else if (error.message.includes("valid email")) {
            description = "Please enter a valid email address.";
        } else {
            description = error.message;
        }
      }
      toast.error("Failed to update email", { description });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.info("Please enter and confirm your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    
    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        throw error;
      }
      toast.success("Password updated successfully!");
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error("Error updating password:", error);
      let description = "Please try again.";
      if (error.message) {
          if (error.message.includes("Password should be at least 6 characters")) {
              description = "Password must be at least 6 characters long.";
          } else if (error.message.includes("Password requires")) {
              description = error.message;
          } else {
              description = error.message;
          }
      }
      toast.error("Failed to update password", { description });
    } finally {
      setIsUpdatingPassword(false);
    }
  };
  // -----------------------

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <MinimalHeader />
        <div className="flex-grow flex justify-center items-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-8 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    // This should technically not be reached if loading is false and user is null
    // due to the redirects, but it's good practice for type safety.
    return null; 
  }

  const provider = user.app_metadata?.provider ?? 'email'; // Default to email if undefined
  const avatarUrl = user.user_metadata?.avatar_url;
  const fullName = user.user_metadata?.full_name ?? user.email; // Fallback to email if no name
  const fallbackInitials = fullName?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || 'U';

  return (
    <div className="min-h-screen flex flex-col">
      <MinimalHeader />
      
      {/* Main content area with Tabs */}
      <div className="flex-grow container mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 lg:py-10"> 
        {/* Added Wrapper Div for Max Width and Centering */} 
        <div className="w-full max-w-2xl mx-auto"> 
          <Tabs defaultValue="profile" className="w-full">
            {/* TabsList styling for left alignment within the constrained parent */} 
            <TabsList className="flex mb-4 p-0 bg-transparent rounded-none justify-start"> {/* Ensure no border-b */}
              {/* Profile Trigger */} 
              <TabsTrigger 
                value="profile" 
                className="inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-medium text-muted-foreground ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:font-semibold data-[state=active]:text-primary" // Removed underline
              >
                <UserCircle className="mr-2 h-4 w-4" />
                Profile
              </TabsTrigger>
              {/* Integrations Trigger */} 
              <TabsTrigger 
                value="integrations" 
                className="inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-medium text-muted-foreground ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:font-semibold data-[state=active]:text-primary opacity-50" // Removed cursor-not-allowed
                title="Coming soon"
              >
                <Plug className="mr-2 h-4 w-4" />
                Integrations
              </TabsTrigger>
            </TabsList>
            
            {/* Profile Tab Content */} 
            <TabsContent value="profile">
               {/* Loading State */} 
               {loading && (
                  <Card className="w-full rounded-none"> {/* Added rounded-none */}
                     {/* ... Skeleton ... */}
                       <CardHeader><Skeleton className="h-6 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></CardHeader>
                       <CardContent><Skeleton className="h-12 w-12 rounded-full" /><Skeleton className="h-8 w-full mt-4" /><Skeleton className="h-8 w-full mt-2" /></CardContent>
                  </Card>
               )}
               {/* Actual Profile Card */} 
               {!loading && user && (
                 <Card className="w-full rounded-none"> {/* Added rounded-none */}
                   <CardHeader>
                     <CardTitle>Profile Settings</CardTitle>
                     <CardDescription>View and manage your account details.</CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-6">
                     <div className="flex items-center space-x-4">
                       <Avatar className="h-16 w-16">
                         <AvatarImage src={avatarUrl} alt={fullName} />
                         <AvatarFallback>{fallbackInitials}</AvatarFallback>
                       </Avatar>
                       <div>
                         <h3 className="text-lg font-semibold">{fullName}</h3>
                         <p className="text-sm text-muted-foreground">{user.email}</p>
                       </div>
                     </div>

                     <div className="space-y-2">
                       <Label>Current Email</Label>
                       <p className="text-sm p-2 border rounded-md bg-muted text-muted-foreground">{user.email}</p>
                     </div>

                     <div className="space-y-2">
                       <Label>Authentication Method</Label>
                       <p className="text-sm p-2 border rounded-md bg-muted text-muted-foreground capitalize">{provider}</p>
                     </div>

                     {/* --- Conditional Forms (Phase 2) --- */}
                     {provider === 'email' && (
                       <>
                         <Separator />
                         
                         {/* --- Email Update Form --- */}
                         <form onSubmit={handleUpdateEmail} className="space-y-4">
                           <h3 className="text-md font-semibold">Update Email</h3>
                            <p className="text-sm text-muted-foreground">
                               Enter a new email address. A confirmation link will be sent to both your old and new addresses.
                            </p>
                           <div className="space-y-2">
                             <Label htmlFor="new-email">New Email</Label>
                             <Input 
                               id="new-email" 
                               type="email" 
                               value={newEmail} 
                               onChange={(e) => setNewEmail(e.target.value)} 
                               placeholder="your.new.email@example.com"
                               required 
                               disabled={isUpdatingEmail}
                             />
                           </div>
                           <Button type="submit" disabled={isUpdatingEmail} className="w-full sm:w-auto">
                             {isUpdatingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             {isUpdatingEmail ? "Sending..." : "Update Email"}
                           </Button>
                         </form>

                         <Separator />

                         {/* --- Password Update Form --- */}
                         <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <h3 className="text-md font-semibold">Update Password</h3>
                            <p className="text-sm text-muted-foreground">
                               Enter a new password for your account.
                            </p>
                           <div className="space-y-2">
                             <Label htmlFor="new-password">New Password</Label>
                             <Input 
                               id="new-password" 
                               type="password" 
                               value={newPassword} 
                               onChange={(e) => setNewPassword(e.target.value)} 
                               required 
                               minLength={6} // Basic check, Supabase enforces its own rules
                               disabled={isUpdatingPassword}
                             />
                           </div>
                           <div className="space-y-2">
                             <Label htmlFor="confirm-password">Confirm New Password</Label>
                             <Input 
                               id="confirm-password" 
                               type="password" 
                               value={confirmPassword} 
                               onChange={(e) => setConfirmPassword(e.target.value)} 
                               required 
                               disabled={isUpdatingPassword}
                             />
                           </div>
                           <Button type="submit" disabled={isUpdatingPassword} className="w-full sm:w-auto">
                             {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             {isUpdatingPassword ? "Updating..." : "Update Password"}
                           </Button>
                         </form>
                       </>
                     )}

                     {provider !== 'email' && (
                        <>
                          <Separator />
                          <p className="text-sm text-muted-foreground">
                            Account details like email and password for accounts signed in via {provider} are managed directly through your {provider} account settings.
                          </p>
                        </>
                     )}
                     {/* --- End Conditional Forms --- */}

                   </CardContent>
                 </Card>
               )}
            </TabsContent>

            {/* Integrations Tab Content */} 
            <TabsContent value="integrations">
                <div className="flex items-center justify-center rounded-lg border border-dashed shadow-sm p-10 min-h-[200px]">
                  <div className="text-center">
                    <Plug className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                    <h3 className="mt-4 text-lg font-semibold">Connect All The Things!</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      This space is currently under construction. Soon you'll be able to integrate VibeKeep with your favorite tools. Stay tuned!
                    </p>
                  </div>
                </div>
            </TabsContent>

          </Tabs>
        </div> {/* End Wrapper Div */}
      </div>
    </div>
  );
} 