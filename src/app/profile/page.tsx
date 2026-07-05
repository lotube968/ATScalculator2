
"use client";

import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { useRouter } from "next/navigation";
import { doc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/firebase/provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { UserProfile } from "@/lib/types";

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);
  
  const { data: userData, isLoading: isProfileLoading, refetch } = useDoc<UserProfile>(userDocRef);
  const [countdown, setCountdown] = useState<string | null>(null);

   useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    if (userData && userDocRef) {
        if (userData.subscriptionStatus === 'active') {
            let expiryTime: number | null = null;
            let isTrial = false;

            // Check for trial expiry first
            if (userData.subscriptionPlan === 'trial' && userData.premiumTrialExpiresAt) {
                const trialExpiry = new Date(userData.premiumTrialExpiresAt).getTime();
                if (Date.now() < trialExpiry) {
                    expiryTime = trialExpiry;
                    isTrial = true;
                }
            }
            
            // If not in a valid trial, check for regular subscription expiry
            if (!isTrial && userData.subscriptionUpdatedAt) {
                const startDate = new Date(userData.subscriptionUpdatedAt);
                expiryTime = new Date(startDate.setDate(startDate.getDate() + 30)).getTime();
            }
            
            if (expiryTime) {
                const updateCountdown = () => {
                    const now = Date.now();
                    const remaining = Math.max(0, (expiryTime as number) - now);
                    
                    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

                    if (days > 0) setCountdown(`${days}d ${hours}h left`);
                    else if (hours > 0) setCountdown(`${hours}h ${minutes}m left`);
                    else setCountdown(`${minutes}m ${seconds}s left`);

                    if (remaining <= 0) {
                        const finalUpdates: Partial<UserProfile> = { subscriptionStatus: 'inactive' };
                        if (isTrial) {
                            finalUpdates.subscriptionPlan = 'none';
                        }
                        setDocumentNonBlocking(userDocRef, finalUpdates, { merge: true });
                        setCountdown(null);
                        clearInterval(timer);
                    }
                };
                updateCountdown();
                timer = setInterval(updateCountdown, 1000);
            }

        } else if (userData.subscriptionStatus === 'reactive' && userData.subscriptionUpdatedAt) {
            const expiryTime = new Date(userData.subscriptionUpdatedAt).getTime() + 10 * 1000;
            const updateCountdown = () => {
                const now = Date.now();
                const remaining = Math.max(0, expiryTime - now);
                if (remaining <= 0) {
                    setDocumentNonBlocking(userDocRef, { subscriptionStatus: 'active', subscriptionUpdatedAt: new Date().toISOString() }, { merge: true });
                    setCountdown(null);
                    clearInterval(timer);
                } else {
                    setCountdown(`${Math.ceil(remaining / 1000)}s`);
                }
            };
            updateCountdown();
            timer = setInterval(updateCountdown, 1000);
        } else {
            setCountdown(null);
        }
    }
    
    return () => clearInterval(timer);
  }, [userData, userDocRef]);


  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <CardHeader className="items-center text-center">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2 mt-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-52" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6 mt-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const getInitials = (email = "") => email?.[0]?.toUpperCase() ?? 'U';

  const isSubscriptionActive = userData?.subscriptionStatus === 'active' || userData?.subscriptionStatus === 'reactive';
  const isTrialPlan = userData?.subscriptionPlan === 'trial';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md overflow-hidden shadow-2xl border-primary/20 relative">
        <Link href="/calculator">
          <Button variant="ghost" size="icon" className="absolute top-4 left-4">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <CardHeader className="items-center bg-primary/10 p-8 text-center pt-16">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={user.photoURL ?? undefined} />
            <AvatarFallback className="text-3xl bg-primary/20">{getInitials(userData?.email)}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl">{userData?.shopName}</CardTitle>
          <CardDescription>{userData?.email}</CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-4">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Mobile Number:</p>
            <p className="text-lg">{userData?.mobileNumber || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">UPI ID:</p>
            <p className="text-lg">{userData?.upiId || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Subscription Plan:</p>
             <p className="text-lg font-semibold capitalize flex items-center gap-2">
                {userData?.subscriptionPlan}
                {isTrialPlan && isSubscriptionActive && <span className="text-xs font-medium text-blue-500 bg-blue-100 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full">Trial Period</span>}
             </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Subscription Status:</p>
            <div className="flex items-center gap-2">
                <p className={`text-lg font-semibold capitalize ${isSubscriptionActive ? 'text-green-500' : 'text-red-500'}`}>
                    {userData?.subscriptionStatus}
                </p>
                {isSubscriptionActive && countdown !== null && (
                    <span className="text-sm text-muted-foreground">({countdown})</span>
                )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
