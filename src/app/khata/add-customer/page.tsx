
'use client';

import { ArrowLeft, Contact, UserPlus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const formSchema = z.object({
  name: z.string().min(1, 'नाव आवश्यक आहे'),
  phone: z.string().optional(),
});

const IndiaFlagIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 21 15"
    width="21"
    height="15"
  >
    <rect width="21" height="5" fill="#F93" />
    <rect y="5" width="21" height="5" fill="#FFF" />
    <rect y="10" width="21" height="5" fill="#128807" />
    <path
      d="M10.5 9.5a2 2 0 100-4 2 2 0 000 4z"
      fill="none"
      stroke="#000080"
      strokeWidth="0.5"
    />
    {[...Array(24)].map((_, i) => (
       <line
        key={i}
        x1="10.5"
        y1="7.5"
        x2="10.5"
        y2="5.5"
        transform={`rotate(${i * 15} 10.5 7.5)`}
        stroke="#000080"
        strokeWidth="0.25"
      />
    ))}
  </svg>
);


export default function AddCustomerPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'त्रुटी',
        description: 'पार्टी जोडण्यासाठी तुम्हाला लॉग इन करणे आवश्यक आहे.',
      });
      return;
    }
    setIsLoading(true);
    const khataEntriesRef = collection(firestore, 'users', user.uid, 'khataEntries');
    
    addDocumentNonBlocking(khataEntriesRef, {
      name: values.name,
      phone: values.phone || '',
      type: 'customer', // Always set to customer
      amount: 0,
      lastActivity: new Date().toISOString(),
      userId: user.uid,
    })
    .then(() => {
        toast({
            title: 'यशस्वी',
            description: `${values.name} तुमच्या उधार पुस्तकात जोडले गेले आहे.`,
        });
        router.push('/khata');
    })
    .catch((error) => {
        console.error('Error adding document: ', error);
        toast({
            variant: 'destructive',
            title: 'त्रुटी',
            description: 'पार्टी जोडण्यात अयशस्वी. कृपया पुन्हा प्रयत्न करा.',
        });
        setIsLoading(false);
    });
  };

  const handleSelectContact = async () => {
    if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
      try {
        const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: false });
        if (contacts.length > 0) {
          const contact = contacts[0];
          if (contact.name && contact.name.length > 0) {
            form.setValue('name', contact.name[0]);
          }
          if (contact.tel && contact.tel.length > 0) {
            const phoneNumber = contact.tel[0].replace(/[^0-9]/g, '').slice(-10);
            form.setValue('phone', phoneNumber);
          }
        }
      } catch (ex) {
        console.error('Error selecting contact.', ex);
         toast({
          variant: 'destructive',
          title: 'त्रुटी',
          description: 'संपर्क निवडू शकलो नाही. कृपया परवानग्या तपासा.',
        });
      }
    } else {
       toast({
          variant: 'destructive',
          title: 'समर्थित नाही',
          description: 'तुमच्या डिव्हाइसवर किंवा ब्राउझरवर संपर्क निवडक समर्थित नाही.',
        });
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-primary p-4 text-primary-foreground">
        <Link href="/khata">
          <Button variant="ghost" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">नवीन ग्राहक जोडा</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={handleSelectContact}>
              <Contact className="h-5 w-5" />
              संपर्कांमधून निवडा
            </Button>
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>नाव</FormLabel>
                  <FormControl>
                    <Input placeholder="नाव प्रविष्ट करा" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>मोबाईल नंबर (Optional)</FormLabel>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                       <IndiaFlagIcon />
                       <span className="pl-2 text-sm">+91</span>
                    </div>
                     <FormControl>
                        <Input type="tel" placeholder="मोबाईल नंबर प्रविष्ट करा" className="pl-20" {...field} />
                     </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full text-lg font-bold py-6 flex items-center justify-center gap-2" disabled={isLoading}>
                {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin-colors" />
                ) : (
                    <UserPlus className="h-5 w-5" />
                )}
                <span>
                    {isLoading ? 'जोडत आहे...' : 'ग्राहक जोडा'}
                </span>
            </Button>
          </form>
        </Form>
      </main>
    </div>
  );
}
