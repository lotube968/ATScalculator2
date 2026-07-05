
'use client';

import {
  ArrowLeft,
  Bell,
  BookCopy,
  ChevronRight,
  FileText,
  IndianRupee,
  Search,
  UserPlus,
  Info,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState, useEffect } from 'react';
import { KhataEntry, UserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Loading from './loading';

const SummaryCard = ({ entries, isLoading }: { entries: KhataEntry[] | null, isLoading: boolean }) => {
    const { toGive, toGet } = useMemo(() => {
    if (!entries) return { toGive: 0, toGet: 0 };
    
    let toGiveTotal = 0;
    let toGetTotal = 0;

    entries.forEach(entry => {
        if (entry.type === 'customer') {
            if (entry.amount < 0) { // Customer owes you
                toGetTotal += Math.abs(entry.amount);
            } else if (entry.amount > 0) { // You owe customer / Customer paid in advance
                toGiveTotal += entry.amount;
            }
        } else if (entry.type === 'supplier') {
            if (entry.amount > 0) { // You owe supplier
                toGiveTotal += entry.amount;
            } else if (entry.amount < 0) { // Supplier owes you / Supplier paid you in advance
                toGetTotal += Math.abs(entry.amount);
            }
        }
    });

    return { toGive: toGiveTotal, toGet: toGetTotal };
  }, [entries]);

  if (isLoading) {
      return (
          <Card className="rounded-xl shadow-md">
              <CardContent className="p-4">
                  <div className="grid grid-cols-3 divide-x">
                       <div className="flex flex-col items-center gap-1 px-2">
                           <p className="text-sm text-muted-foreground">तुम्ही द्याल</p>
                           <Skeleton className="h-5 w-12" />
                       </div>
                       <div className="flex flex-col items-center gap-1 px-2">
                           <p className="text-sm text-muted-foreground">तुम्हाला मिळतील</p>
                           <Skeleton className="h-5 w-12" />
                       </div>
                       <div className="flex flex-col items-center gap-1 px-2">
                           <p className="text-sm text-muted-foreground">QR कलेक्शन</p>
                           <Skeleton className="h-5 w-12" />
                       </div>
                  </div>
                   <div className="mt-4 flex items-center justify-center">
                        <Button variant="link" className="text-primary">
                            <FileText className="mr-2 h-4 w-4" />
                            रिपोर्ट पहा
                        </Button>
                    </div>
              </CardContent>
          </Card>
      )
  }

  return (
    <Card className="rounded-xl shadow-md">
      <CardContent className="p-4">
        <div className="grid grid-cols-3 divide-x">
          <div className="flex flex-col items-center gap-1 px-2">
            <p className="text-sm text-muted-foreground">तुम्ही द्याल</p>
            <p className="flex items-center font-bold text-green-500">
              <IndianRupee className="h-4 w-4" /> {toGive.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1 px-2">
            <p className="text-sm text-muted-foreground">तुम्हाला मिळतील</p>
            <p className="flex items-center font-bold text-red-500">
              <IndianRupee className="h-4 w-4" /> {toGet.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1 px-2">
            <div className="flex items-center">
              <p className="text-sm text-muted-foreground">QR कलेक्शन</p>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="flex items-center font-bold">
              <IndianRupee className="h-4 w-4" /> 0
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center">
          <Link href="/khata/report">
            <Button variant="link" className="text-primary">
              <FileText className="mr-2 h-4 w-4" />
              रिपोर्ट पहा
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

const CustomerListItem = ({ item, shopName, isLoading, onClick }: { item: KhataEntry, shopName?: string, isLoading: boolean, onClick: () => void }) => {
    const { toast } = useToast();

    const getInitials = (name: string) => {
        if (!name) return '';
        const words = name.split(' ');
        if (words.length > 1) {
            return words.map(w => w[0]).join('').toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    }

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds} सेकंदांपूर्वी`;
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes} मिनिटांपूर्वी`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} तासांपूर्वी`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays} दिवसांपूर्वी`;
        const diffInWeeks = Math.floor(diffInDays / 7);
         if (diffInWeeks < 4) return `${diffInWeeks} आठवड्यांपूर्वी`;
        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) return `${diffInMonths} महिन्यांपूर्वी`;
        const diffInYears = Math.floor(diffInDays / 365);
        return `${diffInYears} वर्षांपूर्वी`;
    }
    
    const amount = item.amount || 0;
    let amountColor = 'text-foreground';
    let amountText = '';
    let displayAmount = Math.abs(amount).toLocaleString('en-IN');

    if (item.type === 'customer') {
        if (amount < 0) { // Customer owes you (Debit for them)
            amountColor = 'text-red-500';
            amountText = 'तुम्हाला मिळतील';
        } else if (amount > 0) { // You owe customer / Advance (Credit for them)
            amountColor = 'text-green-500';
            amountText = 'ऍडव्हान्स';
        }
    } else { // supplier
        if (amount > 0) { // You owe supplier
            amountColor = 'text-green-500';
            amountText = 'तुम्ही द्याल';
        } else if (amount < 0) { // Supplier owes you / Advance
            amountColor = 'text-red-500';
            amountText = 'ऍडव्हान्स';
        }
    }
    
    const handleRemind = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!item.phone) {
            toast({
                variant: 'destructive',
                title: 'त्रुटी',
                description: 'ग्राहक फोन नंबर उपलब्ध नाही.',
            });
            return;
        }

        const pendingAmount = Math.abs(amount).toLocaleString('en-IN');
        const message = `Dear ${item.name},\n\nThis is a friendly reminder that your payment of ₹${pendingAmount} is pending for your account with ${shopName || 'us'}.\n\nPlease pay as soon as possible.\n\nThank you!`;
        
        const whatsappUrl = `https://wa.me/91${item.phone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }

    return (
      <div className="flex items-center justify-between border-b p-3 cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{getInitials(item.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
                <p className="font-semibold">{item.name}</p>
                {isLoading && (
                    <div className="jumping-dots flex gap-1">
                        <div className="dot dot-1 !w-1.5 !h-1.5"></div>
                        <div className="dot dot-2 !w-1.5 !h-1.5"></div>
                        <div className="dot dot-3 !w-1.5 !h-1.5"></div>
                    </div>
                )}
            </div>
            <p className="text-xs text-muted-foreground">{getTimeAgo(item.lastActivity)}</p>
          </div>
        </div>
        <div className="text-right">
            {amount !== 0 ? (
                <>
                    <p className={cn('flex items-center font-bold', amountColor)}>
                        <IndianRupee className="h-4 w-4" />
                        {displayAmount}
                    </p>
                    <p className="text-xs text-muted-foreground">{amountText}</p>
                </>
            ) : null}
          {item.type === 'customer' && amount < 0 && (
            <Button variant="link" className="h-auto p-0 text-xs text-primary" onClick={handleRemind}>
              आठवण करा <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
};

const PartyList = ({ entries, isLoading, type, shopName, onEntryClick, loadingEntryId }: { entries: KhataEntry[] | null, isLoading: boolean, type: 'customer' | 'supplier', shopName?: string, onEntryClick: (id: string) => void, loadingEntryId: string | null }) => {
    const filteredEntries = useMemo(() => {
        if (!entries) return [];
        return entries.filter(e => e.type === type);
    }, [entries, type]);

    if (isLoading) {
        return (
            <div>
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between border-b p-3">
                         <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className='space-y-2'>
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                         </div>
                         <div className="text-right space-y-2">
                             <Skeleton className="h-4 w-16" />
                         </div>
                    </div>
                ))}
            </div>
        )
    }

    if (!filteredEntries || filteredEntries.length === 0) {
        return <p className="p-4 text-center text-muted-foreground">{type === 'customer' ? 'ग्राहक सूची रिकामी आहे.' : 'पुरवठादार सूची रिकामी आहे.'}</p>
    }

    return (
        <div>
            {filteredEntries.map((item) => (
                <CustomerListItem 
                    key={item.id} 
                    item={item} 
                    shopName={shopName} 
                    isLoading={loadingEntryId === item.id}
                    onClick={() => onEntryClick(item.id)}
                />
            ))}
        </div>
    )
}

const KhataDisclaimerDialog = ({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) => {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="text-destructive" />
                        महत्त्वाची सूचना (Disclaimer)
                    </AlertDialogTitle>
                    <AlertDialogDescription className='text-left'>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>
                                हा डेटा पाहण्यासाठी तुमचे प्रीमियम सबस्क्रिप्शन सक्रिय असणे आवश्यक आहे. सबस्क्रिप्शन संपल्यास, तुम्हाला हा डेटा दिसणार नाही.
                            </li>
                            <li className="font-semibold">
                                हा सर्व डेटा लोकल सर्व्हरवर सेव्ह केला जातो. कोणत्याही तांत्रिक समस्येमुळे तुमचा डेटा गहाळ झाल्यास, आमची कोणतीही जबाबदारी राहणार नाही.
                            </li>
                            <li>
                                कृपया तुमच्या महत्त्वाच्या व्यवहारांची नोंद तुमच्या वैयक्तिक वहीत किंवा इतर सुरक्षित ठिकाणी करून ठेवा.
                            </li>
                        </ul>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => onOpenChange(false)}>समजले</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default function KhataBookPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingEntryId, setLoadingEntryId] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const router = useRouter();


  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);
  
  const { data: userData, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const khataEntriesRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'khataEntries');
  }, [user, firestore]);

  const { data: khataEntries, isLoading: areKhataEntriesLoading } = useCollection<KhataEntry>(khataEntriesRef);

  useEffect(() => {
    const hasSeenDisclaimer = localStorage.getItem('khataDisclaimerSeen');
    if (!hasSeenDisclaimer) {
        setShowDisclaimer(true);
        localStorage.setItem('khataDisclaimerSeen', 'true');
    }
  }, []);

  const filteredKhataEntries = useMemo(() => {
    if (!khataEntries) return null;
    if (!searchTerm) return khataEntries;
    return khataEntries.filter(entry =>
        entry.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [khataEntries, searchTerm]);
  
  const handleAddCustomerClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsAddingCustomer(true);
    router.push('/khata/add-customer');
  };

  const handleEntryClick = (id: string) => {
    setLoadingEntryId(id);
    router.push(`/khata/${id}`);
  };

  if(areKhataEntriesLoading || isProfileLoading) {
      return <Loading />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
       <KhataDisclaimerDialog open={showDisclaimer} onOpenChange={setShowDisclaimer} />

        <header className="sticky top-0 z-10 flex h-16 items-center justify-between bg-primary p-4 text-primary-foreground">
            <div className="flex items-center gap-2">
            <Link href="/calculator">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft />
                </Button>
            </Link>
            <BookCopy className="h-6 w-6" />
            <h1 className="text-lg font-semibold">
                {isProfileLoading ? <Skeleton className="h-6 w-32" /> : userData?.shopName || 'उधार पुस्तक'}
            </h1>
            </div>
            <div className="relative">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Bell />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="text-destructive" />
                        महत्त्वाची सूचना (Disclaimer)
                    </AlertDialogTitle>
                    <AlertDialogDescription className='text-left'>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>
                                हा डेटा पाहण्यासाठी तुमचे प्रीमियम सबस्क्रिप्शन सक्रिय असणे आवश्यक आहे. सबस्क्रिप्शन संपल्यास, तुम्हाला हा डेटा दिसणार नाही.
                            </li>
                            <li className="font-semibold">
                                हा सर्व डेटा लोकल सर्व्हरवर सेव्ह केला जातो. कोणत्याही तांत्रिक समस्येमुळे तुमचा डेटा गहाळ झाल्यास, आमची कोणतीही जबाबदारी राहणार नाही.
                            </li>
                            <li>
                                कृपया तुमच्या महत्त्वाच्या व्यवहारांची नोंद तुमच्या वैयक्तिक वहीत किंवा इतर सुरक्षित ठिकाणी करून ठेवा.
                            </li>
                        </ul>
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogAction>समजले</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            </div>
        </header>


      <main className="flex-1 overflow-y-auto pb-32">
        <Tabs defaultValue="customer" className="w-full">
          <TabsList className="m-4 grid w-auto grid-cols-2 bg-primary/10 p-1">
            <TabsTrigger value="customer">ग्राहक</TabsTrigger>
            <TabsTrigger value="supplier">पुरवठादार</TabsTrigger>
          </TabsList>
          <div className="px-4">
            <SummaryCard entries={khataEntries} isLoading={areKhataEntriesLoading} />
          </div>

          <div className="relative my-4 px-4">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="पार्टी शोधा..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-base h-12"
            />
          </div>

          <TabsContent value="customer">
             <PartyList entries={filteredKhataEntries} isLoading={areKhataEntriesLoading} type="customer" shopName={userData?.shopName} onEntryClick={handleEntryClick} loadingEntryId={loadingEntryId} />
          </TabsContent>
          <TabsContent value="supplier">
             <PartyList entries={filteredKhataEntries} isLoading={areKhataEntriesLoading} type="supplier" shopName={userData?.shopName} onEntryClick={handleEntryClick} loadingEntryId={loadingEntryId} />
          </TabsContent>
        </Tabs>
      </main>

      <div className="fixed bottom-16 right-4">
        <Button
          onClick={handleAddCustomerClick}
          className={cn(
            "h-14 w-14 rounded-full bg-red-600 shadow-lg hover:bg-red-700",
            isAddingCustomer && "loading-spinner-border"
          )}
          disabled={isAddingCustomer}
        >
          {isAddingCustomer ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : (
            <UserPlus className="h-7 w-7" />
          )}
        </Button>
      </div>

      <footer className="sticky bottom-0 grid grid-cols-3 items-center border-t bg-background text-center">
        <Button variant="ghost" className="flex flex-col h-16 gap-1 text-primary">
          <UserPlus className="h-6 w-6" />
          <span className='text-xs'>पार्ट्या</span>
        </Button>
         <div className='flex justify-center'>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="flex flex-col h-20 w-20 rounded-full bg-primary text-primary-foreground items-center justify-center -mt-8 shadow-lg">
                        <div className='bg-white text-primary rounded-full p-2'>
                            <IndianRupee className="h-6 w-6" />
                        </div>
                        <span className='text-xs mt-1'>कर्ज</span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Coming Soon!</AlertDialogTitle>
                        <AlertDialogDescription>
                            हे फीचर लवकरच येत आहे. आम्ही यावर काम करत आहोत.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction>ठीक आहे</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" className="flex flex-col h-16 gap-1">
                  <Info className="h-6 w-6" />
                  <span className='text-xs'>अधिक</span>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <BookCopy />
                        उधार बुकबद्दल माहिती
                    </AlertDialogTitle>
                    <AlertDialogDescription className='text-left'>
                        उधार बुक हे तुमच्या व्यवसायातील उधारीचे व्यवहार सोप्या पद्धतीने सांभाळण्यासाठी डिझाइन केले आहे. तुम्ही ग्राहक आणि पुरवठादार दोघांचेही हिशोब ठेवू शकता.
                        <ul className="list-disc space-y-2 pl-5 mt-2">
                            <li><b>ग्राहक जोडा:</b> &apos;पार्टी जोडा&apos; बटणावर क्लिक करून नवीन ग्राहक किंवा पुरवठादार जोडा.</li>
                            <li><b>व्यवहार नोंदवा:</b> &apos;तुम्ही दिले&apos; आणि &apos;तुम्ही घेतले&apos; बटणे वापरून प्रत्येक व्यवहाराची नोंद करा.</li>
                            <li><b>रिपोर्ट पहा:</b> कोणत्याही पार्टीच्या पेजवर जाऊन तुम्ही त्यांचा संपूर्ण व्यवहार इतिहास पाहू शकता, शेअर करू शकता किंवा PDF मध्ये डाउनलोड करू शकता.</li>
                        </ul>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction>समजले</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </footer>
    </div>
  );
}
