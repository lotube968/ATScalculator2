'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { useAuth, useUser, setDocumentNonBlocking } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { AppLogo } from '@/components/ui/app-logo';
import { UserProfile } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';

const IndiaFlagIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 15" width="21" height="15">
      <rect width="21" height="5" fill="#F93" />
      <rect y="5" width="21" height="5" fill="#FFF" />
      <rect y="10" width="21" height="5" fill="#128807" />
      <path d="M10.5 9.5a2 2 0 100-4 2 2 0 000 4z" fill="none" stroke="#000080" strokeWidth="0.5" />
      {[...Array(24)].map((_, i) => ( <line key={i} x1="10.5" y1="7.5" x2="10.5" y2="5.5" transform={`rotate(${i * 15} 10.5 7.5)`} stroke="#000080" strokeWidth="0.25" /> ))}
    </svg>
);

const formSchema = z.object({
  shopName: z.string().min(1, { message: 'तुमच्या दुकानाचे नाव आवश्यक आहे.' }),
  mobileNumber: z.string().length(10, { message: 'कृपया १०-अंकी मोबाईल नंबर टाका.' }),
  email: z.string().email({ message: 'कृपया वैध ईमेल ॲड्रेस टाका.' }),
  upiId: z.string().min(1, { message: 'UPI आयडी आवश्यक आहे.' }),
});

export default function Signup() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shopName: '',
      mobileNumber: '',
      email: '',
      upiId: '',
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;

    // Use hardcoded password for super admin email, random for others
    const passwordToUse = values.email === 'lotube968@gmail.com' ? '445566' : Math.floor(100000 + Math.random() * 900000).toString();

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        passwordToUse
      );
      const user = userCredential.user;

      // 2. Create user profile in Firestore for a 7-day trial
      const trialExpiryDate = new Date();
      trialExpiryDate.setDate(trialExpiryDate.getDate() + 7);

      const newUserProfile: Omit<UserProfile, 'id'> = {
        email: values.email,
        shopName: values.shopName,
        mobileNumber: values.mobileNumber,
        upiId: values.upiId,
        subscriptionStatus: 'active',
        subscriptionPlan: 'trial',
        subscriptionUpdatedAt: new Date().toISOString(),
        premiumTrialExpiresAt: trialExpiryDate.toISOString(),
        isAdmin: values.email === 'lotube968@gmail.com', // Auto-set admin for this email
        password: passwordToUse, // Store password for admin reference
      };


      setDocumentNonBlocking(doc(firestore, 'users', user.uid), newUserProfile)
        .catch(err => console.error("Error creating user profile:", err));
      
      toast({
        title: 'खाते यशस्वीरित्या तयार झाले!',
        description: values.email === 'lotube968@gmail.com' ? 'तुमचा ॲडमिन पासवर्ड 445566 आहे.' : 'तुमचे ७-दिवसांचे प्रीमियम ट्रायल सुरू झाले आहे. ॲडमिन तुम्हाला लवकरच तुमचा पासवर्ड WhatsApp वर पाठवेल.',
        duration: 8000,
      });

      // 3. Redirect to calculator page
      router.push('/calculator');

    } catch (error: any) {
      console.error("Signup error:", error);
      let message = 'एक अनपेक्षित त्रुटी आली.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'हा ईमेल ॲड्रेस आधीच वापरला गेला आहे. कृपया लॉगिन करा.';
      }
      toast({
        variant: 'destructive',
        title: 'साइन-अप अयशस्वी',
        description: message,
      });
    }
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md overflow-hidden shadow-2xl border-primary/20 relative">
        <Button variant="ghost" size="icon" className="absolute top-4 left-4" onClick={() => router.back()}>
          <ArrowLeft />
        </Button>
        <CardHeader className="items-center text-center pt-12">
          <AppLogo className="h-16 w-16 mb-4 text-primary" />
          <CardTitle className="text-2xl font-bold">नवीन खाते तयार करा</CardTitle>
          <CardDescription>तुमची माहिती भरून सुरुवात करा.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="shopName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>तुमच्या दुकानाचे नाव</FormLabel>
                    <FormControl><Input placeholder="दुकानाचे नाव टाका" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )}/>
              <FormField control={form.control} name="mobileNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>मोबाईल नंबर</FormLabel>
                     <div className="relative">
                       <div className="absolute inset-y-0 left-0 flex items-center pl-3"><IndiaFlagIcon /><span className="pl-2 text-sm">+91</span></div>
                       <FormControl><Input type="tel" placeholder="मोबाईल नंबर टाका" className="pl-20" {...field} /></FormControl>
                     </div>
                    <FormMessage />
                  </FormItem>
              )}/>
               <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ईमेल ॲड्रेस</FormLabel>
                    <FormControl><Input type="email" placeholder="ईमेल टाका" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )}/>
               <FormField control={form.control} name="upiId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>UPI आयडी</FormLabel>
                    <FormControl><Input placeholder="UPI आयडी टाका" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )}/>
              <Button type="submit" className="w-full text-lg font-bold py-6" disabled={isSubmitting}>
                {isSubmitting ? 'तयार करत आहे...' : 'खाते तयार करा'}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">तुमच्याकडे आधीपासूनच खाते आहे का? </span>
            <Link href="/login" className="font-medium text-primary hover:underline">
              लॉग इन करा
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
