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
import Link from "next/link";
import { useAuth, useUser } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { AppLogo } from "@/components/ui/app-logo";
import Loading from "../loading";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from "@/components/ui/label";


const formSchema = z.object({
  email: z.string().email({ message: "कृपया वैध ईमेल ॲड्रेस टाका." }),
  password: z.string().min(6, { message: "पासवर्ड किमान ६ अंकी असावा." }),
});

export default function Login() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [forgotPasswordMobile, setForgotPasswordMobile] = useState('');
  const [isDialogOpen, setIsPasswordDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        router.replace('/calculator');
      } else {
        setIsAuthenticating(false);
      }
    }
  }, [user, isUserLoading, router]);

  const handleForgotPassword = () => {
    if (forgotPasswordMobile.length !== 10) {
        toast({
            variant: "destructive",
            title: "अवैध मोबाईल नंबर",
            description: "कृपया तुमचा वैध १०-अंकी मोबाईल नंबर टाका.",
        });
        return;
    }

    const adminWhatsAppNumber = "919860856702";
    const message = `पासवर्ड रीसेट करण्याची विनंती:\nमोबाईल नंबर: ${forgotPasswordMobile}`;
    const whatsappUrl = `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(message)}`;

    toast({
        title: "WhatsApp वर पाठवत आहे...",
        description: "तुमची विनंती ॲडमिनला पाठवली जात आहे.",
    });

    // Use window.open to prevent the current page from going blank
    window.open(whatsappUrl, '_blank');
    setIsPasswordDialogOpen(false);
    setForgotPasswordMobile('');
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "लॉगिन यशस्वी!",
        description: "तुम्हाला कॅल्क्युलेटरवर घेऊन जात आहोत...",
      });
      router.replace("/calculator");
    } catch (error: any) {
      console.error("Login Error:", error);
      let errorMessage = "लॉगिन करताना काहीतरी त्रुटी आली. कृपया पुन्हा प्रयत्न करा.";
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
          errorMessage = 'तुमचा ईमेल किंवा पासवर्ड चुकीचा आहे. कृपया स्पेस न देता पासवर्ड टाका.';
      } else if (error.code === 'auth/too-many-requests') {
          errorMessage = 'खूप जास्त वेळा चुकीचा पासवर्ड टाकल्यामुळे तुमचे खाते तात्पुरते लॉक झाले आहे. कृपया १५ मिनिटे वाट पाहून पुन्हा प्रयत्न करा.';
      } else if (error.message) {
          errorMessage = error.message;
      }

      toast({
        variant: "destructive",
        title: "लॉगिन अयशस्वी",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  if (isAuthenticating || isUserLoading) {
    return <Loading />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md overflow-hidden shadow-2xl border-primary/20">
        <div className="bg-primary/10 p-8 text-foreground flex flex-col items-center text-center">
          <AppLogo className="h-16 w-16 mb-4 text-primary" />
          <h1 className="text-3xl font-bold">स्वागत आहे!</h1>
          <p className="text-muted-foreground">तुमच्या खात्यात लॉगिन करा</p>
        </div>
        <CardContent className="p-8 bg-background">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ईमेल आयडी (Email)</FormLabel>
                    <FormControl>
                      <Input placeholder="तुमचा ईमेल टाका" {...field} />
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
                    <FormLabel>पासवर्ड (Password)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center justify-end text-sm">
                <Button 
                    type="button"
                    variant="link" 
                    className="p-0 h-auto font-medium text-primary hover:underline"
                    onClick={() => setIsPasswordDialogOpen(true)}
                >
                    पासवर्ड विसरलात?
                </Button>
              </div>
              <Button type="submit" className="w-full text-lg font-bold py-6" disabled={isLoading}>
                {isLoading ? (
                  <div className="jumping-dots flex gap-1">
                    <div className="dot dot-1"></div>
                    <div className="dot dot-2"></div>
                    <div className="dot dot-3"></div>
                  </div>
                ) : (
                  'लॉगिन करा'
                )}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">तुमचे खाते नाही का? </span>
            <Link href="/signup" className="font-medium text-primary hover:underline">
              नवीन खाते तयार करा
            </Link>
          </div>
           <Button variant="link" className="w-full mt-4 text-primary" onClick={() => router.push('/calculator')}>
              नंतर करा (Skip)
            </Button>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                  <DialogTitle>पासवर्ड विसरलात?</DialogTitle>
                  <DialogDescription>
                      तुमचा नोंदणीकृत मोबाईल नंबर टाका. ॲडमिनला पासवर्ड रीसेट करण्याची विनंती व्हॉट्सॲपद्वारे पाठवली जाईल.
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="mobile" className="text-right">
                          मोबाईल
                      </Label>
                      <Input
                          id="mobile"
                          placeholder="१०-अंकी मोबाईल नंबर"
                          value={forgotPasswordMobile}
                          onChange={(e) => setForgotPasswordMobile(e.target.value)}
                          className="col-span-3"
                      />
                  </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild>
                      <Button type="button" variant="secondary">
                          रद्द करा
                      </Button>
                  </DialogClose>
                  <Button type="button" onClick={handleForgotPassword}>
                      विनंती पाठवा
                  </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}
