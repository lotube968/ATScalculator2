'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, useCollection } from '@/firebase';
import { doc, collection, increment, deleteField } from 'firebase/firestore';
import Link from 'next/link';
import { User, Pencil, Share2, X, Book, Mic, Search, History, Shield, CheckCheck, KeyRound, Ban, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { KhataEntry, UserProfile, Calculation } from '@/lib/types';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';
import { AppLogo } from '@/components/ui/app-logo';
import { Switch } from "@/components/ui/switch"
import Loading from '@/app/loading';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

const buttonStyles = 'rounded-lg w-full text-2xl md:text-3xl font-light focus:outline-none transition-colors duration-200';
const numberButtonStyles = `${buttonStyles} bg-slate-700 text-white hover:bg-slate-600`;
const operatorButtonStyles = `${buttonStyles} bg-primary/80 text-primary-foreground hover:bg-primary/70`;
const topButtonStyles = `${buttonStyles} bg-muted text-foreground hover:bg-muted/80`;

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.4,6.4C16.8,4.8,14.5,3.8,12,3.8C7.3,3.8,3.5,7.6,3.5,12.3C3.5,14,4,15.6,4.9,16.9L3,21l4.2-2.1 C8.2,19.6,9.9,20,12,20h0c4.7,0,8.5-3.8,8.5-8.5C20.5,9.5,19.6,7.6,18.4,6.4z"
        fill="#25D366"
        strokeWidth="1"
      />
      <path
        d="M16.4,13.9c-0.2-0.1-1.4-0.7-1.6-0.8c-0.2-0.1-0.4-0.1-0.5,0.1c-0.2,0.2-0.6,0.8-0.8,0.9 c-0.1,0.1-0.3,0.2-0.5,0.1c-0.2-0.1-1-0.4-1.9-1.2c-0.7-0.6-1.2-1.4-1.3-1.6c-0.1-0.2,0-0.4,0.1-0.5C9.9,10.7,10,10.6,10.1,10.4 c0.1-0.1,0.2-0.2,0.2-0.4c0.1-0.1,0-0.2,0-0.4C10.2,9.6,9.8,8.6,9.6,8.1C9.4,7.6,9.3,7.7,9.1,7.7C9,7.7,8.8,7.7,8.7,7.7 c-0.2,0-0.4,0.1-0.5,0.2C8,8.1,7.5,8.6,7.5,9.6C7.5,10.6,8,11.5,8.2,11.7c0.1,0.2,1.4,2.2,3.4,3c0.5,0.2,0.9,0.3,1.2,0.4 c0.5,0.1,0.9,0.1,1.3,0c0.3-0.2,1.1-0.6,1.3-1.1C16.6,14.4,16.6,14,16.4,13.9z"
        fill="white"
        stroke="none"
      />
    </svg>
);

const GPayIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M10.15 12.43H13.84V14.28H10.15V12.43Z" fill="#34A853"/>
        <path d="M19.3 9.45H16.14C16.14 8.65 15.89 7.91 15.46 7.29L17.58 5.17C18.79 6.38 19.52 7.97 19.52 9.74C19.52 9.64 19.3 9.45 19.3 9.45Z" fill="#EA4335"/>
        <path d="M6.42 7.29C5.99 7.91 5.86 8.65 5.86 9.45H4.7C4.7 9.45 4.5 9.64 4.5 9.74C4.5 7.97 5.21 6.38 6.42 5.17L8.54 7.29C8.11 7.91 6.85 7.29 6.42 7.29Z" fill="#FBBC05"/>
        <path d="M17.58 18.83L15.46 16.71C15.89 16.09 16.14 15.35 16.14 14.55H19.3C19.3 14.55 19.52 14.36 19.52 14.26C19.52 16.03 18.79 17.62 17.58 18.83Z" fill="#4285F4"/>
        <path d="M8.54 16.71L6.42 18.83C7.63 20.04 9.21 20.77 10.98 20.77V18.15C9.72 17.72 8.54 16.71 8.54 16.71Z" fill="#34A853"/>
        <path d="M4.5 14.26C4.5 14.36 4.7 14.55 4.7 14.55H5.86C5.86 15.35 6.11 16.09 6.54 16.71L8.43 14.82C7.54 14.55 4.5 14.26 4.5 14.26Z" fill="#4285F4"/>
        <path d="M10.98 3.23C9.21 3.23 7.63 3.96 6.42 5.17L8.54 7.29C9.21 6.4 10.98 5.79 10.98 4.8V3.23Z" fill="#EA4335"/>
        <path d="M14.57 7.29L16.46 5.17C15.25 3.96 13.67 3.23 11.9 3.23V5.68C12.33 6.11 14.14 6.85 14.57 7.29Z" fill="#FBBC05"/>
        <path d="M12 10.15C11.53 10.15 11.15 10.53 11.15 11V15.71C11.15 16.18 11.53 16.56 12 16.56C12.47 16.56 12.85 16.18 12.85 15.71V11C12.85 10.53 12.47 10.15 12 10.15Z" fill="#4285F4"/>
        <path d="M12.42 7.44C10.76 7.44 9.38 8.45 8.95 9.87H15.04C14.61 8.45 13.66 7.44 12.42 7.44Z" fill="#EA4335"/>
    </svg>
);


const OtpInput = ({ otp, setOtp }: { otp: string[], setOtp: (otp: string[]) => void }) => {
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (element: HTMLInputElement, index: number) => {
        if (isNaN(Number(element.value))) return;

        const newOtp = [...otp];
        newOtp[index] = element.value;
        setOtp(newOtp);

        // Focus next input
        if (element.nextSibling && element.value) {
            (element.nextSibling as HTMLInputElement).focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === "Backspace" && !otp[index] && e.currentTarget.previousSibling) {
            (e.currentTarget.previousSibling as HTMLInputElement).focus();
        }
    };

    return (
        <div className="flex justify-center gap-2">
            {otp.map((data, index) => {
                return (
                    <Input
                        key={index}
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={data}
                        onChange={(e) => handleChange(e.target, index)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        onFocus={(e) => e.target.select()}
                        ref={el => inputsRef.current[index] = el}
                        className="w-12 h-14 text-center text-2xl font-bold"
                    />
                );
            })}
        </div>
    );
};


export default function Calculator() {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [isCalculated, setIsCalculated] = useState(false);
  const [newUpiId, setNewUpiId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrCodeCanvas, setQrCodeCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isSubscriptionQr, setIsSubscriptionQr] = useState(false);
  const [subscriptionQrPlan, setSubscriptionQrPlan] = useState<'basic' | 'premium'>('premium');
  const [isListening, setIsListening] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchResult, setCustomerSearchResult] = useState<{id?: string, name: string, balance: string, message: string} | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [isSubscriptionMode, setIsSubscriptionMode] = useState(true);
  const [isKhataLoading, setIsKhataLoading] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium' | null>(null);
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [qrCountdown, setQrCountdown] = useState<number | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAdminButtonVisible, setIsAdminButtonVisible] = useState(false);

  
  const audioContextRef = useRef<AudioContext | null>(null);

  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  
  const khataEntriesRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'khataEntries');
  }, [user, firestore]);
  

  const { data: khataEntries } = useCollection<KhataEntry>(khataEntriesRef);

  const { data: userData, isLoading: isProfileLoading, refetch } = useDoc<UserProfile>(userDocRef);
  const isBlocked = userData?.isBlocked === true;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      toast({
        title: "कसे इन्स्टॉल करावे",
        description: "तुमच्या ब्राउझरच्या मेनूवर (तीन ठिपके) क्लिक करा आणि 'Add to Home Screen' किंवा 'Install App' निवडा.",
      });
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (qrCountdown !== null && qrCountdown > 0) {
        timer = setInterval(() => {
            setQrCountdown(prev => (prev ? prev - 1 : 0));
        }, 1000);
    } else if (qrCountdown === 0) {
        setQrCodeUrl('');
        setQrCodeCanvas(null);
        setQrCountdown(null);
        toast({
            title: "Time Expired",
            description: "The subscription QR code has expired. Please generate a new one.",
            variant: "destructive"
        });
    }
    return () => clearInterval(timer);
  }, [qrCountdown, toast]);

  useEffect(() => {
    // Initialize AudioContext on client-side after mount
    if (typeof window !== 'undefined') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitContext)();
    }
  }, []);

  const playClickSound = () => {
    if (isSoundOn && audioContextRef.current) {
        const context = audioContextRef.current;
        if (context.state === 'suspended') {
            context.resume();
        }
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(200, context.currentTime); // Pitch
        gainNode.gain.setValueAtTime(0.5, context.currentTime); // Volume
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.1);

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start();
        oscillator.stop(context.currentTime + 0.1);
    }
  };
  
  useEffect(() => {
    // By default, subscription mode is on.
    // If the user is logged in and their subscription is inactive or they are blocked, turn it off.
    if (user && (userData?.subscriptionStatus === 'inactive' || isBlocked)) {
      setIsSubscriptionMode(false);
    } else if (user) {
      setIsSubscriptionMode(true);
    }
  }, [user, userData, isBlocked]);


  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (userDocRef && userData) {
        if (userData.subscriptionStatus === 'active') {
            let expiryTime: number | null = null;
            let isTrial = false;

            // Check for trial expiry first
            if (userData.subscriptionPlan === 'trial' && userData.premiumTrialExpiresAt) {
                const trialExpiry = new Date(userData.premiumTrialExpiresAt).getTime();
                if (Date.now() < trialExpiry) {
                    expiryTime = trialExpiry;
                    isTrial = true;
                } else {
                     // Trial has already expired, set to inactive immediately
                    setDocumentNonBlocking(userDocRef, { subscriptionStatus: 'inactive', subscriptionPlan: 'none' }, { merge: true });
                    return;
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
                        // If it was a trial that expired, also reset the plan
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
            const expiryTime = new Date(userData.subscriptionUpdatedAt).getTime() + 10 * 1000; // 10 seconds
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

  const calculate = useCallback((exp: string): string => {
    if (!exp) return '0';
    try {
        // Sanitize expression
        let sanitized = exp.replace(/×/g, '*').replace(/÷/g, '/');

        // Handle percentage calculations correctly
        sanitized = sanitized.replace(/(\d+(\.\d+)?)%/g, '($1/100)');
        
        // Handle cases like '100-10%' -> '100 - (100 * (10/100))'
        sanitized = sanitized.replace(/(\d+(\.\d+)?)\s*([+\-*/])\s*(\d+(\.\d+)?)%/g, (match, p1, _, p3, p4) => {
            return `${p1} ${p3} (${p1} * ${p4}/100)`;
        });

        // A safer way to evaluate mathematical expressions
        const res = new Function(`'use strict'; return (${sanitized})`)();
        
        // Format to a reasonable number of decimal places
        return String(Number(res.toFixed(4)));
    } catch (error) {
        console.error("Calculation Error:", error);
        // Return last valid result or 'Error'
        return result !== 'Error' ? result : 'Error';
    }
  }, [result]);

  useEffect(() => {
    if (isCalculated) return;
    
    let currentExpression = expression;
    // If expression ends with an operator, calculate up to that point
    if (['÷', '×', '-', '+'].includes(expression.slice(-1))) {
      currentExpression = expression.slice(0, -1);
    }

    if(currentExpression){
        const liveResult = calculate(currentExpression);
        if (liveResult !== 'Error') {
            setResult(liveResult);
        }
        
        // Check for secret admin code
        if (currentExpression === '2404') {
            setIsAdminButtonVisible(true);
        }
    } else {
        setResult('0');
    }
  }, [expression, isCalculated, calculate]);


  const handleShowSubscriptionQr = (plan: 'basic' | 'premium' = 'premium') => {
    if (!userData?.mobileNumber) {
        toast({
            title: "User Data Loading",
            description: "User data is still loading. Please try again in a moment.",
            variant: "destructive"
        });
        return;
    }
    const amount = plan === 'premium' ? 50 : 30;
    setSubscriptionQrPlan(plan);
    generateQrCode(String(amount), true);
    setQrCountdown(600); // Start 10 minute timer
  };

  const generateQrCode = async (amount: string, isSubscription = false) => {
    const upiId = isSubscription ? '9860856702@okbizaxis' : userData?.upiId;
    const shopName = isSubscription ? 'ATS' : userData?.shopName;

    if (!upiId || !shopName || !amount || parseFloat(amount) <= 0) {
        setQrCodeUrl('');
        setQrCodeCanvas(null);
        return;
    }

    try {
        const userMobile = userData?.mobileNumber || '';
        const note = isSubscription ? `Subscription for ${userMobile}` : `Payment to ${shopName}`;
        
        const finalAmount = isSubscription ? amount : result;
        
        const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${finalAmount}&cu=INR&tn=${encodeURIComponent(note)}`;

        const canvas = document.createElement('canvas');
        const canvasWidth = 320;
        const canvasHeight = 480;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Could not get canvas context');
        }

        // Draw rounded rectangle background
        const cornerRadius = 20;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(0, cornerRadius);
        ctx.arcTo(0, 0, cornerRadius, 0, cornerRadius);
        ctx.lineTo(canvasWidth - cornerRadius, 0);
        ctx.arcTo(canvasWidth, 0, canvasWidth, cornerRadius, cornerRadius);
        ctx.lineTo(canvasWidth, canvasHeight - cornerRadius);
        ctx.arcTo(canvasWidth, canvasHeight, canvasWidth - cornerRadius, canvasHeight, cornerRadius);
        ctx.lineTo(cornerRadius, canvasHeight);
        ctx.arcTo(0, canvasHeight, 0, canvasHeight - cornerRadius, cornerRadius);
        ctx.closePath();
        ctx.fill();

        // Top blue part
        ctx.fillStyle = '#00B9F1'; // Light blue top
        const topPartHeight = 80;
        ctx.beginPath();
        ctx.moveTo(0, cornerRadius);
        ctx.arcTo(0, 0, cornerRadius, 0, cornerRadius);
        ctx.lineTo(canvasWidth - cornerRadius, 0);
        ctx.arcTo(canvasWidth, 0, canvasWidth, cornerRadius, cornerRadius);
        ctx.lineTo(canvasWidth, topPartHeight);
        ctx.lineTo(0, topPartHeight);
        ctx.closePath();
        ctx.fill();
        
        // Shop Name in top bar
        ctx.fillStyle = 'white';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(shopName, canvasWidth / 2, topPartHeight / 2);

        // Amount
        ctx.fillStyle = 'black';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`₹${finalAmount}`, canvasWidth / 2, topPartHeight + 50);

        // QR Code
        const qrCanvas = document.createElement('canvas');
        await QRCode.toCanvas(qrCanvas, upiLink, { width: 180, margin: 1 });
        ctx.drawImage(qrCanvas, (canvasWidth - 180) / 2, topPartHeight + 90);
        
        // Bottom dark blue section
        const bottomY = topPartHeight + 320;
        ctx.fillStyle = '#002E6E'; // Dark blue bottom
        ctx.fillRect(0, bottomY, canvasWidth, 80);

        // "accepted upi payment" text
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('accepted upi payment', canvasWidth / 2, bottomY + 25);
        
        // UPI ID below text
        ctx.fillStyle = '#A0B8D0'; // Lighter blue for UPI ID
        ctx.font = '14px Arial';
        ctx.fillText(`UPI ID: ${upiId}`, canvasWidth / 2, bottomY + 55);

        setQrCodeUrl(canvas.toDataURL('image/png'));
        setQrCodeCanvas(canvas);
        setIsSubscriptionQr(isSubscription);

    } catch (err) {
        console.error('Failed to generate QR code', err);
        setQrCodeUrl('');
        setQrCodeCanvas(null);
        toast({ title: 'Error', description: 'Failed to generate QR Code.', variant: 'destructive' });
    }
};

  const handleShare = async () => {
    if (!qrCodeCanvas || !userData) return;
  
    const subAmount = subscriptionQrPlan === 'premium' ? '50' : '30';
    const amount = isSubscriptionQr ? subAmount : result;
    const shopName = isSubscriptionQr ? "ATS" : userData.shopName;
    const shareText = `Amount: ₹${amount}\nPayment Request from ${shopName}`;
  
    qrCodeCanvas.toBlob(async (blob) => {
        if (!blob) {
            toast({
                variant: 'destructive',
                title: 'शेअर अयशस्वी',
                description: 'QR कोड इमेज तयार करता आली नाही.',
            });
            return;
        }

        const file = new File([blob], 'qrcode.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'Payment QR Code',
                    text: shareText,
                });
            } catch (error) {
                console.error('Share failed:', error);
                // Fallback to downloading if sharing is cancelled or fails
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'qrcode.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } else {
             // Fallback for browsers that don't support navigator.share with files
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'qrcode.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({
                title: 'QR Code डाऊनलोड झाला',
                description: 'तुमचा ब्राउझर थेट शेअरिंगला सपोर्ट करत नाही. QR कोड डाउनलोड झाला आहे.',
            });
        }
    }, 'image/png');
  };
  

  const handleUpiUpdate = () => {
    if (userDocRef && newUpiId) {
      setDocumentNonBlocking(userDocRef, { upiId: newUpiId }, { merge: true });
      toast({
        title: 'Success',
        description: 'Your UPI ID has been updated.',
      });
      refetch(); // Refetch the user data to show the update
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not update UPI ID. Please try again.',
      });
    }
  };

  const handleButtonClick = (value: string) => {
    playClickSound();

    if (value === 'AC') {
      setExpression('');
      setResult('0');
      setQrCodeUrl('');
      setQrCodeCanvas(null);
      setIsCalculated(false);
      return;
    } 
    
    if (value === 'C') {
      setExpression(expression.slice(0, -1));
      setIsCalculated(false);
      setQrCodeUrl('');
      setQrCodeCanvas(null);
      return;
    } 
    
    if (value === '=') {
      if (!expression || isCalculated) return;
      const finalResult = calculate(expression);
      setResult(finalResult);
      setExpression(finalResult); // Set expression to result for chaining
      setIsCalculated(true);
      
      // Check for secret code in result
      if (finalResult === '2404') {
          setIsAdminButtonVisible(true);
      }

      if (finalResult !== 'Error') {
        const newCalculation: Calculation = {
          id: String(Date.now()),
          expression: expression,
          result: finalResult,
          createdAt: new Date().toISOString(),
          userId: user?.uid || 'guest'
        };

        try {
          const historyString = localStorage.getItem('calculationHistory');
          let history: Calculation[] = historyString ? JSON.parse(historyString) : [];
          history.unshift(newCalculation); // Add new calculation to the beginning
          history = history.slice(0, 5); // Keep only the last 5
          localStorage.setItem('calculationHistory', JSON.stringify(history));
        } catch (e) {
          console.error("Could not save history to localStorage", e);
        }

        if (isSubscriptionMode && userData?.subscriptionStatus === 'inactive') {
            // This is handled by the Get Subscription dialog now
            return;
        }

        if (isSubscriptionMode && userData?.subscriptionStatus === 'active' && !isBlocked) {
          generateQrCode(finalResult);
        }
      }
      return;
    }
    
    const isOperator = '÷×-+.%'.includes(value);

    if (isCalculated) {
        if (isOperator) {
            // Start new calculation with the previous result
            setExpression(result + value);
        } else {
            // Start a fresh calculation
            setExpression(value);
        }
        setIsCalculated(false);
    } else {
        // Prevent multiple operators in a row
        const lastCharIsOperator = '÷×-+.'.includes(expression.slice(-1));
        if (lastCharIsOperator && isOperator && value !== '%') {
            // Replace the last operator
            setExpression(expression.slice(0, -1) + value);
        } else {
            setExpression(expression + value);
        }
    }
    setQrCodeUrl('');
    setQrCodeCanvas(null);
};


  const handleHelpClick = () => {
    window.open('https://wa.me/9860856702', '_blank');
  };

  // Levenshtein distance function for fuzzy string matching
  const levenshteinDistance = (a: string, b: string): number => {
    const an = a ? a.length : 0;
    const bn = b ? b.length : 0;
    if (an === 0) return bn;
    if (bn === 0) return an;
    const matrix = Array(an + 1).fill(null).map(() => Array(bn + 1).fill(null));

    for (let i = 0; i <= an; i++) matrix[i][0] = i;
    for (let j = 0; j <= bn; j++) matrix[0][j] = j;

    for (let i = 1; i <= an; i++) {
        for (let j = 1; j <= bn; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    return matrix[an][bn];
  };

  const searchKhataEntry = (searchText: string) => {
    const normalizedSearchText = searchText.toLowerCase().trim();
    if (!khataEntries) {
        setCustomerSearchResult({ name: "Udhar Book Empty", balance: "N/A", message: "Please add a customer to your Udhar book first." });
        return;
    }

    let bestMatch: KhataEntry | null = null;
    let minDistance = Infinity;

    // First, try to find an exact match or substring match
    for (const entry of khataEntries) {
        const entryName = entry.name.toLowerCase();
        if (normalizedSearchText.includes(entryName)) {
            bestMatch = entry;
            minDistance = 0;
            break;
        }
        if (entryName.includes(normalizedSearchText)) {
            bestMatch = entry;
            minDistance = 0;
            break;
        }
    }

    // If no exact/substring match, use Levenshtein distance for fuzzy matching
    if (bestMatch === null) {
      for (const entry of khataEntries) {
          const entryName = entry.name.toLowerCase();
          // Find the best possible match within the long search text
          const words = normalizedSearchText.split(' ');
          for (let i = 0; i < words.length; i++) {
              for (let j = i; j < words.length; j++) {
                  const subPhrase = words.slice(i, j + 1).join(' ');
                  const distance = levenshteinDistance(subPhrase, entryName);
                  if (distance < minDistance) {
                      minDistance = distance;
                      bestMatch = entry;
                  }
              }
          }
      }
    }
    
    const foundEntry = (bestMatch && minDistance <= bestMatch.name.length * 0.8) ? bestMatch : null;


    if (foundEntry) {
        let balance = 'Settled';
        let message = `Balance for ${foundEntry.name} is settled.`;
        if (foundEntry.amount !== 0) {
            balance = `₹${Math.abs(foundEntry.amount)}`;
            if (foundEntry.type === 'customer' && foundEntry.amount > 0) { 
                message = `You owe ${foundEntry.name}:`;
            } else if (foundEntry.type === 'customer' && foundEntry.amount < 0) { 
                message = `${foundEntry.name} owes you:`;
            } else if (foundEntry.type === 'supplier' && foundEntry.amount > 0) {
                message = `You owe ${foundEntry.name}:`;
            } else if (foundEntry.type === 'supplier' && foundEntry.amount < 0) {
                message = `${foundEntry.name} owes you (Advance):`;
            }
        }
        setCustomerSearchResult({ id: foundEntry.id, name: foundEntry.name, balance, message });
    } else {
        setCustomerSearchResult({ name: "Not Found", balance: "N/A", message: `Customer '${searchText}' was not found in your Udhar book.` });
    }
  }

  const handleVoiceSearch = () => {
    if (!['premium', 'trial'].includes(userData?.subscriptionPlan || '')) {
        handleShowSubscriptionQr('premium');
        toast({ title: "Upgrade to Premium", description: "Voice search is a premium feature. Please upgrade your plan." });
        return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        variant: 'destructive',
        title: 'Unsupported',
        description: 'Voice search is not supported on your browser.',
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      toast({
          variant: 'destructive',
          title: 'Voice Search Error',
          description: event.error === 'no-speech' ? 'No speech was detected.' : 'An error occurred during speech recognition.',
      });
    };

    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript;
      searchKhataEntry(speechResult);
    };
    
    recognition.start();
  };

  const handleCustomerSearch = () => {
      if (customerSearch) {
          searchKhataEntry(customerSearch);
      }
  }

  const handleEditEntry = () => {
    if (customerSearchResult?.id) {
      router.push(`/khata/${customerSearchResult.id}`);
    }
    setCustomerSearchResult(null);
  };

  const handleVerifyOtp = async () => {
      if (!user || !user.email || !userDocRef) return;
      
      const enteredOtp = otp.join("");
      if (enteredOtp.length !== 6) {
          toast({ variant: 'destructive', title: 'त्रुटी', description: 'कृपया ६-अंकी OTP प्रविष्ट करा.' });
          return;
      }

      setIsVerifying(true);
      try {
          const credential = EmailAuthProvider.credential(user.email, enteredOtp);
          await reauthenticateWithCredential(user, credential);

          // OTP (password) is correct. Now grant 7-day premium trial.
          const trialExpiryDate = new Date();
          trialExpiryDate.setDate(trialExpiryDate.getDate() + 7);

          setDocumentNonBlocking(userDocRef, {
              subscriptionStatus: 'active',
              subscriptionPlan: 'trial',
              premiumTrialExpiresAt: trialExpiryDate.toISOString(),
              subscriptionUpdatedAt: new Date().toISOString() // Also set this to be safe
          }, { merge: true });

          toast({ title: 'यशस्वी!', description: 'तुमचे ७-दिवसांचे प्रीमियम ट्रायल आता सक्रिय झाले आहे.' });
          setOtp(new Array(6).fill("")); // Reset OTP input
          // The dialog will be closed by the DialogClose button

      } catch (error: any) {
          console.error("OTP Verification Error:", error);
          let errorMessage = 'एक अनपेक्षित त्रुटी आली.';
          if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
              errorMessage = 'तुम्ही टाकलेला OTP चुकीचा आहे.';
          } else if (error.message) {
              errorMessage = error.message;
          }
          toast({ variant: "destructive", title: "पडताळणी अयशस्वी", description: errorMessage });
      } finally {
          setIsVerifying(false);
      }
  };

  const handleRequestOtp = () => {
      if (!userDocRef) return;
      try {
          const updates = {
              otpRequestTimestamp: new Date().toISOString(),
              otpRequestCount: increment(1),
              otpSent: false
          };
          setDocumentNonBlocking(userDocRef, updates, { merge: true });
          toast({
              title: "विनंती पाठवली!",
              description: "तुमची OTP साठी विनंती पाठवली आहे. ॲडमिन लवकरच तुम्हाला WhatsApp वर OTP पाठवेल.",
              duration: 7000
          });
      } catch (error) {
          console.error("OTP Request Error:", error);
          toast({
              variant: "destructive",
              title: "त्रुटी",
              description: "OTP विनंती पाठवण्यात अयशस्वी. कृपया पुन्हा प्रयत्न करा.",
          });
      }
  };
  
  const renderButton = (value: string, style: string, className = '') => (
    <Button variant="ghost" className={cn(style, className, qrCodeUrl ? 'h-14 md:h-16 text-xl md:text-2xl' : 'h-16 md:h-20 text-2xl md:text-3xl')} onClick={() => handleButtonClick(value)}>
      {value}
    </Button>
  );

  const getQrCodeContent = () => {
    if (isSubscriptionQr) {
        const subAmount = subscriptionQrPlan === 'premium' ? 50 : 30;
        const message = `Pay for your ${subscriptionQrPlan} subscription.`;
        const userMessage = userData?.mobileNumber ? ` User: ${userData.mobileNumber}` : '';
        return {
            title: "Subscription Payment",
            shopName: "ATS",
            upiId: "9860856702@okbizaxis",
            amount: String(subAmount),
            message: `${message}${userMessage}`
        }
    }
    return {
        title: "Payment Request",
        shopName: userData?.shopName,
        upiId: userData?.upiId,
        amount: result,
        message: `Payment request from ${userData?.shopName}`
    }
  }
  const qrCodeContent = getQrCodeContent();
  const isSubscriptionActive = userData?.subscriptionStatus === 'active';
  const needsVerification = user && !isBlocked && userData?.subscriptionStatus === 'inactive' && !userData.subscriptionUpdatedAt && !userData.premiumTrialExpiresAt;

  const handleKhataClick = () => {
    if (!['premium', 'trial'].includes(userData?.subscriptionPlan || '')) {
        handleShowSubscriptionQr('premium');
        toast({ title: "Upgrade to Premium", description: "Udhar Book is a premium feature. Please upgrade your plan." });
        return;
    }
    setIsKhataLoading(true);
    router.push('/khata');
    // No need to set it to false, as the component will unmount on navigation
  };
  
  const handleHistoryClick = () => {
    router.push('/history');
  };

  return (
    <div className="flex flex-col items-center p-2 md:p-4 w-full h-full">
        <AlertDialog open={!!customerSearchResult} onOpenChange={(open) => !open && setCustomerSearchResult(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>{customerSearchResult?.name}</AlertDialogTitle>
                <AlertDialogDescription className='text-lg'>
                   {customerSearchResult?.message} <br />
                   <span className='font-bold text-xl text-foreground'>{customerSearchResult?.balance}</span>
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setCustomerSearchResult(null)}>Close</AlertDialogCancel>
                    {customerSearchResult?.id && (
                        <AlertDialogAction onClick={handleEditEntry}>Edit Entry</AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <div className={cn("absolute top-4 right-4 flex flex-col items-end gap-2 z-10")}>
            <div className={cn("flex items-center gap-2", qrCodeUrl ? 'hidden' : 'flex')}>
                 <Label htmlFor="sound-mode" className="text-xs text-muted-foreground pr-1">
                    Sound
                </Label>
                <div className="flex items-center p-1 rounded-full bg-muted">
                    <Switch
                        id="sound-mode"
                        checked={isSoundOn}
                        onCheckedChange={setIsSoundOn}
                        aria-label="Toggle sound"
                    />
                </div>
            </div>
             <div className={cn("flex items-center gap-2", qrCodeUrl ? 'hidden' : 'flex')}>
                 <Label htmlFor="subscription-mode" className="text-xs text-muted-foreground pr-1">
                    {isSubscriptionMode ? 'Subscription' : 'Normal'}
                </Label>
                <div className={cn("flex items-center p-1 rounded-full", isSubscriptionMode && !isBlocked ? "animated-switch-bg" : "bg-muted")}>
                    <Switch
                        id="subscription-mode"
                        checked={isSubscriptionMode}
                        onCheckedChange={setIsSubscriptionMode}
                        disabled={isBlocked}
                        aria-label="Toggle subscription mode"
                    />
                </div>
            </div>
             <div className={cn("flex items-center gap-1", qrCodeUrl ? 'hidden' : 'flex')}>
                {user && (userData?.isAdmin || isAdminButtonVisible) && (
                  <Link href="/admin">
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full">
                        <Shield className="h-5 w-5" />
                    </Button>
                  </Link>
                )}
                {user && (
                    <Link href="/profile">
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full">
                        <User className="h-5 w-5" />
                    </Button>
                    </Link>
                )}
                <Button variant="ghost" size="icon" onClick={handleHelpClick} className="w-8 h-8 rounded-full">
                    <WhatsAppIcon className="h-5 w-5" />
                </Button>
                <ThemeToggle />
            </div>
        </div>
        
        <div className={cn("w-full max-w-md flex flex-col gap-2 transition-all duration-300 h-full", qrCodeUrl ? 'justify-start pt-4' : 'justify-center')}>
            {user && qrCodeUrl && (
                <Card className="w-full max-w-sm mb-4 relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => { setQrCodeUrl(''); setQrCodeCanvas(null); setQrCountdown(null); }}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xl text-center text-primary font-semibold">{qrCodeContent.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center gap-2 p-4">
                        <Image src={qrCodeUrl} alt="UPI QR Code" width={320} height={480} className="rounded-md" />
                        {isSubscriptionQr && qrCountdown !== null && (
                            <div className="text-center my-2">
                                <p className="text-sm text-muted-foreground">QR code expires in:</p>
                                <p className="text-lg font-bold text-destructive">{formatTime(qrCountdown)}</p>
                            </div>
                        )}
                        <Button onClick={handleShare} className="w-full mt-2">
                            {isSubscriptionQr ? (
                                <>
                                    <GPayIcon className="mr-2 h-6 w-6" />
                                    Share with GPay
                                </>
                            ) : (
                                <>
                                    <Share2 className="mr-2 h-4 w-4" />
                                    Share QR Code
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className={cn("w-full", qrCodeUrl ? 'block' : 'block')}>
                {isBlocked && (
                     <div className="w-full p-1.5 rounded-lg border border-destructive bg-destructive/10 text-destructive-foreground text-center mb-2">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-medium">
                            <Ban className="h-3 w-3" />
                            <p>तुमचे खाते ब्लॉक केले आहे.</p>
                        </div>
                    </div>
                )}
                <div className={cn("flex items-center justify-between gap-2 mb-2 pt-12 md:pt-0", qrCodeUrl ? 'hidden' : 'flex')}>
                    <div className="flex items-center gap-2">
                        <AppLogo className="h-5 w-5 text-primary" />
                        <h1 className="text-lg font-bold text-left text-primary">ATS calculator</h1>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleInstallApp} className="text-xs h-8">
                        <Download className="mr-1 h-3 w-3" /> Install App
                    </Button>
                </div>
                 <div className={cn("text-left text-xs md:text-sm mb-2 h-9", qrCodeUrl ? 'hidden' : 'block', isBlocked ? '!hidden' : 'block' )}>
                    { user ? (
                        <>
                            {needsVerification ? (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white animate-pulse flex items-center gap-2" onClick={handleRequestOtp}>
                                            <KeyRound className="h-4 w-4" />
                                            Verify OTP
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Verify Your Account</DialogTitle>
                                            <DialogDescription>
                                                Please enter the 6-digit OTP sent to you by the admin via WhatsApp to start your 7-day free premium trial.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4">
                                            <OtpInput otp={otp} setOtp={setOtp} />
                                        </div>
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button type="button" variant="secondary">Cancel</Button>
                                            </DialogClose>
                                            <Button type="button" onClick={handleVerifyOtp} disabled={isVerifying}>
                                                {isVerifying ? 'Verifying...' : 'Verify OTP'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            ) : null}
                            {userData && !isSubscriptionActive && !isBlocked ? (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button size="sm" className="bg-green-200 hover:bg-green-300 text-green-800 animate-pulse">Get Subscription</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Choose Your Plan</DialogTitle>
                                        </DialogHeader>
                                        <RadioGroup onValueChange={(v: 'basic' | 'premium') => setSelectedPlan(v)} className="my-4">
                                            <Label htmlFor="basic" className="flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                                <div>
                                                    <p className="font-bold">Basic Plan</p>
                                                    <p className="text-sm text-muted-foreground">Calculator QR Only</p>
                                                </div>
                                                <p className="font-bold text-lg">₹30</p>
                                                <RadioGroupItem value="basic" id="basic" />
                                            </Label>
                                            <Label htmlFor="premium" className="flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                                 <div>
                                                    <p className="font-bold">Premium Plan</p>
                                                    <p className="text-sm text-muted-foreground">Calculator + Udhar Book</p>
                                                </div>
                                                <p className="font-bold text-lg">₹50</p>
                                                <RadioGroupItem value="premium" id="premium" />
                                            </Label>
                                        </RadioGroup>
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button type="button" onClick={() => selectedPlan && handleShowSubscriptionQr(selectedPlan)} disabled={!selectedPlan}>
                                                    Generate QR to Pay
                                                </Button>
                                            </DialogClose>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            ) : null}
                            {isSubscriptionActive && !isBlocked && countdown !== null ? (
                                <div className="text-xs text-muted-foreground">
                                    Subscription ({userData?.subscriptionPlan}): {countdown}
                                </div>
                            ) : null}
                            {isSubscriptionActive && !isBlocked && userData?.upiId ? (
                                <div className="flex items-center justify-start gap-2">
                                <p className="text-muted-foreground text-xs">
                                    UPI: <span className="font-semibold text-foreground">{userData.upiId}</span>
                                </p>
                                <Dialog>
                                    <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-5 w-5">
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Edit UPI ID</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="upiId" className="text-right">
                                            UPI ID
                                        </Label>
                                        <Input
                                            id="upiId"
                                            defaultValue={userData.upiId}
                                            onChange={e => setNewUpiId(e.target.value)}
                                            className="col-span-3"
                                        />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                        <Button type="submit" onClick={handleUpiUpdate}>
                                            Save changes
                                        </Button>
                                        </DialogClose>
                                    </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                                </div>
                            ) : null}
                        </>
                    ) : !isUserLoading ? (
                         <Link href="/signup">
                            <Button className="bg-green-600 hover:bg-green-700 text-white animate-pulse" size="sm">Get Subscription</Button>
                        </Link>
                    ) : null}
                </div>
            </div>
        
            <div className={cn("flex flex-col items-center gap-2", qrCodeUrl ? 'justify-start' : 'flex-grow justify-center')}>
                <div
                className={cn(
                    'bg-background/50 border border-border w-full p-2 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-300'
                )}
                >
                    <div className="text-right p-2 md:p-4 mb-1">
                        <p className="text-muted-foreground text-xl md:text-3xl truncate h-8 md:h-10">{expression || ' '}</p>
                        <p className="text-foreground text-3xl md:text-5xl font-light">{result}</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {renderButton('AC', topButtonStyles)}
                        {renderButton('C', topButtonStyles)}
                        {renderButton('%', topButtonStyles)}
                        {renderButton('÷', operatorButtonStyles)}

                        {renderButton('7', numberButtonStyles)}
                        {renderButton('8', numberButtonStyles)}
                        {renderButton('9', numberButtonStyles)}
                        {renderButton('×', operatorButtonStyles)}

                        {renderButton('4', numberButtonStyles)}
                        {renderButton('5', numberButtonStyles)}
                        {renderButton('6', numberButtonStyles)}
                        {renderButton('-', operatorButtonStyles)}

                        {renderButton('1', numberButtonStyles)}
                        {renderButton('2', numberButtonStyles)}
                        {renderButton('3', numberButtonStyles)}
                        {renderButton('+', operatorButtonStyles)}

                        {renderButton('0', numberButtonStyles, 'col-span-2')}
                        {renderButton('.', numberButtonStyles)}
                        {renderButton('=', operatorButtonStyles)}
                    </div>
                </div>

                 { isSubscriptionMode && (
                    <div className="w-full mt-4 grid grid-cols-2 gap-4 justify-center items-start">
                       <div className="w-full">
                         <Button variant="outline" className="w-full" onClick={handleKhataClick} disabled={isKhataLoading}>
                            {isKhataLoading ? (
                                <div className="jumping-dots flex gap-1">
                                    <div className="dot dot-1 !w-2 !h-2"></div>
                                    <div className="dot dot-2 !w-2 !h-2"></div>
                                    <div className="dot dot-3 !w-2 !h-2"></div>
                                </div>
                            ) : (
                                <>
                                <Book className="mr-2 h-4 w-4" />
                                Udhar Book
                                </>
                            )}
                        </Button>
                       </div>
                       <div className="w-full">
                         <Button variant="outline" className="w-full" onClick={handleHistoryClick}>
                            <History className="mr-2 h-4 w-4" />
                            History
                        </Button>
                       </div>
                       <div className="col-span-2 flex flex-col items-center gap-2">
                            <Button 
                                variant="default"
                                className={cn('h-20 w-20 rounded-full flex items-center justify-center transition-all', isListening ? 'animate-color-mouth' : 'bg-primary')}
                                onClick={handleVoiceSearch}
                                disabled={!user}
                            >
                                <Mic className={cn("h-10 w-10 text-primary-foreground transition-transform", isListening ? 'scale-110' : '')} />
                            </Button>
                            <Label className='text-sm text-muted-foreground'>Search Customer by Voice</Label>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="secondary" className="w-full col-span-2">
                                    <Search className="mr-2 h-4 w-4" />
                                    Search Customer
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Search Customer</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="customerName" className="text-right">
                                    Name
                                </Label>
                                <Input
                                    id="customerName"
                                    placeholder="Enter customer name"
                                    onChange={e => setCustomerSearch(e.target.value)}
                                    className="col-span-3"
                                />
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                <Button type="submit" onClick={handleCustomerSearch}>
                                    Search
                                </Button>
                                </DialogClose>
                            </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                 )}
              </div>
          </div>
      </div>
    );
}
