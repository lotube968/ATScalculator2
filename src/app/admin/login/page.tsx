"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth, useUser } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { AppLogo } from "@/components/ui/app-logo";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export default function AdminLogin() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true); // Used for initial auth check

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "lotube968@gmail.com",
      password: "445566",
    },
  });

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        user.getIdTokenResult().then((tokenResult) => {
          if (tokenResult.claims.admin || user.email === 'lotube968@gmail.com') {
            router.replace('/admin');
          } else {
            // User is logged in but not an admin, sign them out from the admin attempt
            auth.signOut().catch((err) => console.error("Error signing out:", err));
            setIsAuthenticating(false);
            toast({
              variant: "destructive",
              title: "Access Denied",
              description: "You do not have administrative privileges."
            });
          }
        }).catch((error) => {
          console.error("Error getting ID token result:", error);
          setIsAuthenticating(false);
        });
      } else {
        // No user is logged in
        setIsAuthenticating(false);
      }
    }
  }, [user, isUserLoading, router, auth, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const tokenResult = await userCredential.user.getIdTokenResult();
      
      // Super admin check is now more robust
      if (!tokenResult.claims.admin && userCredential.user.email !== 'lotube968@gmail.com') {
          await auth.signOut(); // Sign out the non-admin user
          throw new Error("You do not have administrative privileges.");
      }
      toast({
          title: "Login Successful",
          description: "Redirecting to admin panel...",
      });
      router.replace("/admin");
    } catch (error: any) {
      console.error("Admin Login Error:", error);
      let errorMessage = "तुमच्या खात्याचा ईमेल किंवा पासवर्ड चुकीचा आहे.";
      
      if (error.code === 'auth/user-not-found') {
          errorMessage = "हे ॲडमिन खाते अस्तित्वात नाही. कृपया आधी साइन-अप करा.";
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          errorMessage = "पासवर्ड चुकीचा आहे. कृपया स्पेस न देता पासवर्ड टाका.";
      } else if (error.code === 'auth/too-many-requests') {
          errorMessage = "खूप जास्त वेळा चुकीचा पासवर्ड टाकल्यामुळे तुमचे खाते तात्पुरते लॉक झाले आहे. कृपया १५ मिनिटे वाट पाहून पुन्हा प्रयत्न करा.";
      } else if (error.message) {
          errorMessage = error.message;
      }

      toast({
        variant: "destructive",
        title: "Login Failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  // A simple loading or signed-in state before redirect
  if (isAuthenticating) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="jumping-dots flex gap-2">
                <div className="dot dot-1"></div>
                <div className="dot dot-2"></div>
                <div className="dot dot-3"></div>
            </div>
        </div>
    )
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md overflow-hidden shadow-2xl border-primary/20">
        <div className="bg-primary/10 p-8 text-foreground flex flex-col items-center text-center">
          <AppLogo className="h-16 w-16 mb-4 text-primary" />
          <h1 className="text-3xl font-bold">Admin Login</h1>
          <p className="text-muted-foreground">Log in to access the admin panel</p>
        </div>
        <CardContent className="p-8 bg-background">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full text-lg font-bold py-6" disabled={isLoading}>
                {isLoading ? (
                  <div className="jumping-dots flex gap-1">
                    <div className="dot dot-1 !w-2 !h-2"></div>
                    <div className="dot dot-2 !w-2 !h-2"></div>
                    <div className="dot dot-3 !w-2 !h-2"></div>
                  </div>
                ) : (
                  'Login'
                )}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don&apos;t have an account? </span>
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Create one here
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
