
'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  IndianRupee,
  Phone,
  FileText,
  Receipt,
  Download,
  Share2,
  QrCode,
  X,
  Trash2,
  Pencil,
  BookOpen,
  Home,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  useDoc,
  useUser,
  useFirestore,
  useMemoFirebase,
  useCollection,
  setDocumentNonBlocking,
} from '@/firebase';
import { doc, collection, orderBy, query, getDocs, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { KhataEntry, Transaction, UserProfile } from '@/lib/types';
import QRCode from 'qrcode';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Loading from '../../loading';

const TransactionItem = ({ item, entryType }: { item: Transaction, entryType: 'customer' | 'supplier' }) => {
  const isGave = item.type === 'gave';
  const amountColor = isGave ? 'text-red-500' : 'text-green-500';

  return (
    <div className="flex justify-between border-b p-3">
      <div>
        <p className="text-sm">
          {format(new Date(item.createdAt), 'dd MMM, yyyy - hh:mm a')}
        </p>
        <p className="text-xs text-muted-foreground">{item.description}</p>
      </div>
      <div className={cn('flex items-center font-bold', amountColor)}>
        <IndianRupee className="h-4 w-4" />
        {item.amount.toLocaleString('en-IN')}
      </div>
    </div>
  );
};

export default function KhataEntryDetailsPage() {
  const params = useParams();
  const entryId = params.id as string;
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [qrCodeUrl, setQrCodeUrl] = React.useState('');
  const [qrCodeCanvas, setQrCodeCanvas] = useState<HTMLCanvasElement | null>(null);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [loadingButton, setLoadingButton] = useState<'gave' | 'got' | null>(null);


  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData } = useDoc<UserProfile>(userDocRef);

  const khataEntryRef = useMemoFirebase(() => {
    if (!user || !firestore || !entryId) return null;
    return doc(firestore, 'users', user.uid, 'khataEntries', entryId);
  }, [user, firestore, entryId]);

  const { data: khataEntry, isLoading: isEntryLoading, refetch } =
    useDoc<KhataEntry>(khataEntryRef);

  const transactionsRef = useMemoFirebase(() => {
    if (!khataEntryRef) return null;
    return query(
      collection(khataEntryRef, 'transactions'),
      orderBy('createdAt', 'desc')
    );
  }, [khataEntryRef]);

  const { data: transactions, isLoading: areTransactionsLoading } =
    useCollection<Transaction>(transactionsRef);

    const generateQrCode = async (amount: string) => {
        if (!userData?.upiId || !userData?.shopName || !amount || parseFloat(amount) <= 0) {
            setQrCodeUrl('');
            setQrCodeCanvas(null);
            toast({
                variant: 'destructive',
                title: 'त्रुटी',
                description: 'QR कोड निर्माण करण्यासाठी कृपया प्रोफाइलमध्ये UPI आयडी आणि दुकानाचे नाव जोडा.',
            });
            return;
        }

        try {
            const upiId = userData.upiId;
            const shopName = userData.shopName;
            const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${amount}&cu=INR`;
            
            const canvas = document.createElement('canvas');
            await QRCode.toCanvas(canvas, upiLink, { width: 280, margin: 1 });

            setQrCodeUrl(canvas.toDataURL('image/png'));
            setQrCodeCanvas(canvas);

        } catch (err) {
            console.error('Failed to generate QR code', err);
            setQrCodeUrl('');
            setQrCodeCanvas(null);
            toast({ title: 'Error', description: 'Failed to generate QR Code.', variant: 'destructive' });
        }
    };

  const handleSharePayment = async () => {
    if (!khataEntry || !userData) {
        toast({ title: 'Error', description: 'Could not get user details.', variant: 'destructive' });
        return;
    }

    if (!khataEntry.phone) {
        toast({ title: 'No Phone Number', description: 'Please add a phone number for this customer to share.', variant: 'destructive' });
        return;
    }

    const amountValue = Math.abs(amount);
    const shareText = `Dear ${khataEntry.name}, please pay ₹${amountValue} to ${userData.shopName}.`;

    // Attempt to share the image file if possible
    if (qrCodeCanvas && navigator.share) {
        qrCodeCanvas.toBlob(async (blob) => {
            if (!blob) {
                toast({ variant: 'destructive', title: 'Share Failed', description: 'Could not create QR code image.' });
                return;
            }

            const file = new File([blob], 'qrcode.png', { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Payment Request',
                        text: shareText,
                    });
                    return; // Success, so exit
                } catch (error) {
                    console.error('Web Share API failed, falling back to WhatsApp link.', error);
                    // Fall through to the WhatsApp link method
                }
            } else {
                 // Fall through to the WhatsApp link method
                 console.log('Cannot share files, falling back to WhatsApp link.');
            }
        }, 'image/png');
    }
    
    // Fallback: Open WhatsApp link with text message
    const whatsappUrl = `https://wa.me/91${khataEntry.phone}?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareHistory = async () => {
    if (!khataEntry || !transactions || !userData) {
      toast({
        variant: 'destructive',
        title: 'त्रुटी',
        description: 'संपूर्ण माहिती लोड होण्याची प्रतीक्षा करा.',
      });
      return;
    }

    let report = `*${userData.shopName} - व्यवहार इतिहास*\n\n`;
    report += `*ग्राहक:* ${khataEntry.name}\n`;
    report += `*दिनांक:* ${format(new Date(), 'dd MMM, yyyy')}\n`;
    report += '-----------------------------------\n';
    report += '| तारीख | तुम्ही दिले | तुम्ही घेतले |\n';
    report += '-----------------------------------\n';

    // Transactions are already sorted descending, reverse for chronological order
    [...transactions].reverse().forEach(tx => {
      const date = format(new Date(tx.createdAt), 'dd/MM/yy');
      const gaveAmount = tx.type === 'gave' ? tx.amount : 0;
      const gotAmount = tx.type === 'got' ? tx.amount : 0;
      
      const gaveStr = gaveAmount > 0 ? `₹${gaveAmount.toLocaleString('en-IN')}` : '-';
      const gotStr = gotAmount > 0 ? `₹${gotAmount.toLocaleString('en-IN')}` : '-';
      
      report += `| ${date} | ${gaveStr.padEnd(10)} | ${gotStr.padEnd(12)} |\n`;
      if(tx.description) {
        report += `  (${tx.description})\n`
      }
    });

    report += '-----------------------------------\n';
    report += `*${balanceText}*\n`;
    report += '-----------------------------------\n';
    report += 'Thank you!';

    try {
        if (navigator.share) {
            await navigator.share({
                title: 'Transaction History',
                text: report,
            });
        } else {
            throw new Error('Web Share API not supported.');
        }
    } catch (error) {
        console.error('Error sharing transaction history:', error);
        toast({
            title: 'शेअर अयशस्वी',
            description: 'तुमचा ब्राउझर थेट शेअरिंगला सपोर्ट करत नाही. आम्ही तुम्हाला WhatsApp वर पुनर्निर्देशित करत आहोत.',
            variant: 'destructive',
        });
        // Fallback to original WhatsApp link if sharing fails or is not supported
        if (khataEntry.phone) {
            const whatsappUrl = `https://wa.me/91${khataEntry.phone}?text=${encodeURIComponent(report)}`;
            window.open(whatsappUrl, '_blank');
        } else {
             toast({
                title: 'त्रुटी',
                description: 'ग्राहक फोन नंबर उपलब्ध नाही.',
                variant: 'destructive',
            });
        }
    }
  };

  const handleDownloadPdf = () => {
    if (!khataEntry || !transactions || !userData) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Wait for all data to load before downloading.',
      });
      return;
    }

    const doc = new jsPDF();
    
    // Add Shop Name, Customer Name, and Date
    doc.setFontSize(18);
    doc.text(`${userData.shopName} - Transaction History`, 14, 22);
    doc.setFontSize(12);
    doc.text(`Customer: ${khataEntry.name}`, 14, 30);
    doc.text(`Date: ${format(new Date(), 'dd MMMM, yyyy')}`, 14, 36);

    const tableColumn = ["Date", "Description", "Gave (Rs)", "Got (Rs)"];
    const tableRows: (string | number)[][] = [];

    // Reverse transactions for chronological order in PDF
    [...transactions].reverse().forEach(tx => {
      const txData = [
        format(new Date(tx.createdAt), 'dd/MM/yy hh:mm a'),
        tx.description || '-',
        tx.type === 'gave' ? tx.amount.toLocaleString('en-IN') : '-',
        tx.type === 'got' ? tx.amount.toLocaleString('en-IN') : '-',
      ];
      tableRows.push(txData);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 50,
        headStyles: { fillColor: [22, 163, 74] }, // Green header
        styles: { fontSize: 10 },
        didDrawPage: (data) => {
            // To handle multi-page, we re-apply font settings
        }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY;
    
    // Add Net Balance at the end
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.text('Net Balance:', 14, finalY + 10);
    doc.text(balanceText.replace(/₹/g, 'Rs. '), 45, finalY + 10);

    doc.save(`${khataEntry.name}_transactions.pdf`);
  };

  const handleDeleteEntry = async () => {
    if (!khataEntryRef || !firestore) return;
    try {
        // To do a transactional delete, we use a batch
        const batch = writeBatch(firestore);

        // First, get all transactions in the subcollection
        const transactionsSnapshot = await getDocs(collection(khataEntryRef, 'transactions'));
        transactionsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Then, delete the main entry document
        batch.delete(khataEntryRef);

        await batch.commit();

        toast({
            title: 'यशस्वी',
            description: `${khataEntry?.name} ची नोंद हटवली आहे.`,
        });
        router.push('/khata');
    } catch (error) {
        console.error("Error deleting entry:", error);
        toast({
            variant: 'destructive',
            title: 'त्रुटी',
            description: 'नोंद हटवण्यात अयशस्वी.',
        });
    }
  };

  const handlePhoneUpdate = () => {
    if (khataEntryRef && newPhoneNumber) {
        setDocumentNonBlocking(khataEntryRef, { phone: newPhoneNumber }, { merge: true })
            .catch(err => console.error("Error updating phone number:", err));
        toast({
            title: 'यशस्वी',
            description: 'मोबाईल नंबर अद्यतनित झाला आहे.',
        });
        refetch(); // Refetch the entry data to show the update
    }
  };

  const handleNavigation = (type: 'gave' | 'got') => {
    setLoadingButton(type);
    router.push(`/khata/${entryId}/add-transaction?type=${type}`);
  };


  const getInitials = (name: string) => {
    if (!name) return '';
    const words = name.split(' ');
    if (words.length > 1) {
      return words.map((w) => w[0]).join('').toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const amount = khataEntry?.amount || 0;

  let balanceText = '';
  let balanceColor = 'text-foreground';
  let showQrButton = false;

  if (khataEntry?.type === 'customer') {
    if (amount < 0) { // Customer owes you (Debit for them)
        balanceText = `तुम्हाला मिळतील: ₹${Math.abs(amount).toLocaleString('en-IN')}`;
        balanceColor = 'text-red-500';
        showQrButton = true;
    } else if (amount > 0) { // You owe customer / Advance (Credit for them)
        balanceText = `तुम्ही द्याल: ₹${amount.toLocaleString('en-IN')}`;
        balanceColor = 'text-green-500';
    } else {
        balanceText = 'हिशोब पूर्ण';
    }
  } else if (khataEntry?.type === 'supplier') {
      if (amount > 0) { // You owe the supplier
          balanceText = `तुम्ही द्याल: ₹${amount.toLocaleString('en-IN')}`;
          balanceColor = 'text-green-500';
      } else if (amount < 0) { // Supplier owes you / Advance
          balanceText = `तुम्हाला मिळतील: ₹${Math.abs(amount).toLocaleString('en-IN')}`;
          balanceColor = 'text-red-500';
      } else {
          balanceText = 'हिशोब पूर्ण';
      }
  }


  if (isEntryLoading || !user || !khataEntry) {
    return <Loading />;
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-primary p-4 text-primary-foreground">
        <div className="flex items-center gap-2">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ArrowLeft />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>तुम्हाला कुठे जायचे आहे?</AlertDialogTitle>
                        <AlertDialogDescription>
                            तुम्ही कॅल्क्युलेटर किंवा उधार बुकच्या मुख्य पेजवर परत जाऊ शकता.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center flex-col sm:flex-col sm:space-x-0 gap-2">
                        <AlertDialogAction onClick={() => router.push('/calculator')} className="flex items-center gap-2">
                            <Home className="h-4 w-4" />
                            कॅल्क्युलेटरवर जा
                        </AlertDialogAction>
                         <AlertDialogAction onClick={() => router.push('/khata')} className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            उधार बुकवर जा
                        </AlertDialogAction>
                        <AlertDialogCancel>रद्द करा</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{getInitials(khataEntry.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{khataEntry.name}</p>
              <div className="flex items-center gap-2">
                 <p className={cn('text-xs font-bold', balanceColor)}>
                    {balanceText}
                </p>
                {showQrButton && (
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-primary-foreground" onClick={() => generateQrCode(String(Math.abs(amount)))}>
                        <QrCode className="h-4 w-4" />
                    </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center">
            {khataEntry.phone ? (
                <a href={`tel:${khataEntry.phone}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Phone />
                    </Button>
                </a>
            ) : (
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="link" className="text-primary-foreground p-1 h-auto text-xs">
                            Add Number
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add/Edit Mobile Number</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                           <Label htmlFor="phoneNumber">Mobile Number</Label>
                           <Input 
                                id="phoneNumber"
                                placeholder="Enter mobile number"
                                defaultValue={khataEntry.phone}
                                onChange={e => setNewPhoneNumber(e.target.value)}
                           />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" onClick={handlePhoneUpdate}>Save</Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-500">
                        <Trash2 />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>तुम्ही नक्की आहात का?</AlertDialogTitle>
                    <AlertDialogDescription>
                        ही क्रिया पूर्ववत करता येणार नाही. हे कायमचे हटवले जाईल
                        <span className='font-bold'> {khataEntry.name}</span> यांची नोंद आणि त्यांच्या सर्व व्यवहारांची माहिती हटवली जाईल.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>रद्द करा</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive hover:bg-destructive/90">हटवा</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {qrCodeUrl && (
             <Card className="w-full max-w-sm mb-4 relative mx-auto">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => { setQrCodeUrl(''); setQrCodeCanvas(null); }}
                >
                    <X className="h-5 w-5" />
                </Button>
                <CardHeader className="p-4 pb-2">
                     <CardTitle className="text-xl text-center text-primary font-semibold">Payment QR Code</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center gap-2 p-4">
                    <Image src={qrCodeUrl} alt="UPI QR Code" width={280} height={280} className="rounded-lg border" />
                    <Button onClick={handleSharePayment} className="w-full mt-2 text-lg py-6">
                        <Share2 className="mr-2 h-5 w-5" />
                        Share to Customer
                    </Button>
                </CardContent>
            </Card>
        )}
        <div className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">बिलनुसार</span>
          </div>
          <Badge variant="outline">चालू</Badge>
        </div>

        <div className="mt-4">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">
            व्यवहार
          </h2>
          {areTransactionsLoading ? (
            <div>
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="space-y-2">
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
          ) : transactions && transactions.length > 0 ? (
            [...transactions].map((tx) => <TransactionItem key={tx.id} item={tx} entryType={khataEntry.type} />)
          ) : (
            <p className="p-4 text-center text-muted-foreground">
              अद्याप कोणतेही व्यवहार नाहीत.
            </p>
          )}
        </div>
      </main>

      <footer className="sticky bottom-0 grid grid-cols-2 gap-4 border-t bg-background p-4">
        <Button
          onClick={() => handleNavigation('gave')}
          disabled={loadingButton === 'gave'}
          className="w-full bg-red-600 hover:bg-red-700"
        >
          {loadingButton === 'gave' ? (
            <div className="jumping-dots flex gap-1">
              <div className="dot dot-1 !h-2 !w-2"></div>
              <div className="dot dot-2 !h-2 !w-2"></div>
              <div className="dot dot-3 !h-2 !w-2"></div>
            </div>
          ) : (
            'तुम्ही दिले ₹'
          )}
        </Button>
        <Button
          onClick={() => handleNavigation('got')}
          disabled={loadingButton === 'got'}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {loadingButton === 'got' ? (
            <div className="jumping-dots flex gap-1">
              <div className="dot dot-1 !h-2 !w-2"></div>
              <div className="dot dot-2 !h-2 !w-2"></div>
              <div className="dot dot-3 !h-2 !w-2"></div>
            </div>
          ) : (
            'तुम्ही घेतले ₹'
          )}
        </Button>

        <div className="col-span-2 flex justify-around">
          <Button variant="link" className="text-primary">
            <FileText className="mr-2 h-4 w-4" />
            रिपोर्ट
          </Button>
          <Button variant="link" className="text-primary" onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" />
            डाउनलोड
          </Button>
          <Button variant="link" className="text-primary" onClick={handleShareHistory}>
            <Share2 className="mr-2 h-4 w-4" />
            शेअर
          </Button>
        </div>
      </footer>
    </div>
  );
}
