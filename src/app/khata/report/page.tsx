
'use client';

import {
  ArrowLeft,
  Download,
  FileText,
  IndianRupee,
  Share2,
} from 'lucide-react';
import Link from 'next/link';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
  useDoc,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { KhataEntry, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Loading from '../loading';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReportSummary = ({ entries, isLoading }: { entries: KhataEntry[] | null, isLoading: boolean }) => {
  const { toGive, toGet, netBalance, netBalanceText } = useMemo(() => {
    if (!entries) return { toGive: 0, toGet: 0, netBalance: 0, netBalanceText: '' };

    let toGiveTotal = 0;
    let toGetTotal = 0;

    entries.forEach((entry) => {
      if (entry.type === 'customer') {
        if (entry.amount < 0) {
          toGetTotal += Math.abs(entry.amount);
        } else if (entry.amount > 0) {
          toGiveTotal += entry.amount;
        }
      } else if (entry.type === 'supplier') {
        if (entry.amount > 0) {
          toGiveTotal += entry.amount;
        } else if (entry.amount < 0) {
          toGetTotal += Math.abs(entry.amount);
        }
      }
    });

    const balance = toGiveTotal - toGetTotal;
    let balanceText = '';
    if (balance > 0) {
        balanceText = `तुम्ही द्याल (Net): ₹${balance.toLocaleString('en-IN')}`;
    } else if (balance < 0) {
        balanceText = `तुम्हाला मिळतील (Net): ₹${Math.abs(balance).toLocaleString('en-IN')}`;
    } else {
        balanceText = 'एकूण शिल्लक: ₹0';
    }


    return { toGive: toGiveTotal, toGet: toGetTotal, netBalance: balance, netBalanceText: balanceText };
  }, [entries]);

  if (isLoading) {
    return (
      <Card className="rounded-xl shadow-md">
        <CardHeader>
          <CardTitle>रिपोर्ट सारांश</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="flex flex-col items-center gap-1 p-2">
              <p className="text-sm text-muted-foreground">एकूण देणे</p>
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="flex flex-col items-center gap-1 p-2">
              <p className="text-sm text-muted-foreground">एकूण येणे</p>
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
          <div className="mt-4 text-center">
             <Skeleton className="h-6 w-40 mx-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl shadow-md">
      <CardHeader>
        <CardTitle>रिपोर्ट सारांश</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="flex flex-col items-center gap-1 rounded-lg bg-green-500/10 p-2">
            <p className="text-sm text-green-800 dark:text-green-300">एकूण देणे</p>
            <p className="flex items-center text-lg font-bold text-green-600">
              <IndianRupee className="h-5 w-5" />
              {toGive.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg bg-red-500/10 p-2">
            <p className="text-sm text-red-800 dark:text-red-300">एकूण येणे</p>
            <p className="flex items-center text-lg font-bold text-red-500">
              <IndianRupee className="h-5 w-5" />
              {toGet.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
        <div className={cn("mt-4 text-center text-lg font-bold", netBalance > 0 ? 'text-green-600' : netBalance < 0 ? 'text-red-500' : 'text-foreground' )}>
            {netBalanceText}
        </div>
      </CardContent>
    </Card>
  );
};

export default function ReportPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isProfileLoading } =
    useDoc<UserProfile>(userDocRef);

  const khataEntriesRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'khataEntries');
  }, [user, firestore]);

  const { data: khataEntries, isLoading: areKhataEntriesLoading } =
    useCollection<KhataEntry>(khataEntriesRef);

  const { toGive, toGet } = useMemo(() => {
    if (!khataEntries) return { toGive: 0, toGet: 0 };

    let toGiveTotal = 0;
    let toGetTotal = 0;

    khataEntries.forEach((entry) => {
        if (entry.type === 'customer') {
            if (entry.amount < 0) toGetTotal += Math.abs(entry.amount);
            else if (entry.amount > 0) toGiveTotal += entry.amount;
        } else if (entry.type === 'supplier') {
            if (entry.amount > 0) toGiveTotal += entry.amount;
            else if (entry.amount < 0) toGetTotal += Math.abs(entry.amount);
        }
    });

    return { toGive: toGiveTotal, toGet: toGetTotal };
  }, [khataEntries]);


  const generateReportText = () => {
    if (!khataEntries || !userData) return '';
    let text = `*${userData.shopName} - संपूर्ण रिपोर्ट*\n`;
    text += `*दिनांक:* ${format(new Date(), 'dd MMM, yyyy')}\n\n`;
    
    text += '*पार्टीची यादी:*\n';
    khataEntries.forEach(entry => {
        let amountText = '';
        if(entry.amount !== 0){
            if((entry.type === 'customer' && entry.amount < 0) || (entry.type === 'supplier' && entry.amount < 0)){
                amountText = `तुम्हाला मिळतील: ₹${Math.abs(entry.amount).toLocaleString('en-IN')}`;
            } else {
                 amountText = `तुम्ही द्याल: ₹${entry.amount.toLocaleString('en-IN')}`;
            }
        } else {
            amountText = 'हिशोब पूर्ण';
        }
        text += `- ${entry.name} (${entry.type}): ${amountText}\n`;
    });
    
    text += '\n-----------------------------------\n';
    text += `*एकूण देणे:* ₹${toGive.toLocaleString('en-IN')}\n`;
    text += `*एकूण येणे:* ₹${toGet.toLocaleString('en-IN')}\n`;
    text += '-----------------------------------\n';

    const netBalance = toGive - toGet;
    if(netBalance > 0) {
        text += `*एकूण बाकी (तुम्ही द्याल):* ₹${netBalance.toLocaleString('en-IN')}\n`;
    } else if (netBalance < 0) {
        text += `*एकूण बाकी (तुम्हाला मिळतील):* ₹${Math.abs(netBalance).toLocaleString('en-IN')}\n`;
    } else {
        text += '*एकूण बाकी: हिशोब पूर्ण*\n';
    }
     text += '-----------------------------------\n';
     text += `\n${userData.shopName} द्वारे व्युत्पन्न.`;

    return text;
  }

  const handleShareReport = async () => {
      const reportText = generateReportText();
      if(!reportText) {
          toast({ title: 'त्रुटी', description: 'रिपोर्ट तयार करता आला नाही.' });
          return;
      }
      try {
           if (navigator.share) {
                await navigator.share({
                    title: 'उधार बुक रिपोर्ट',
                    text: reportText,
                });
            } else {
                throw new Error('Web Share API not supported.');
            }
      } catch(error) {
          console.error('Error sharing report:', error);
          toast({ variant: "destructive", title: "शेअर अयशस्वी", description: "तुमचा ब्राउझर थेट शेअरिंगला सपोर्ट करत नाही." });
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(reportText)}`;
          window.open(whatsappUrl, '_blank');
      }
  };

  const handleDownloadPdf = () => {
    if (!khataEntries || !userData) {
      toast({
        variant: 'destructive',
        title: 'त्रुटी',
        description: 'रिपोर्ट डाउनलोड करण्यासाठी डेटा लोड होण्याची प्रतीक्षा करा.',
      });
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(`${userData.shopName} - Report`, 14, 22);
    doc.setFontSize(12);
    doc.text(`Date: ${format(new Date(), 'dd MMM, yyyy')}`, 14, 30);

    const tableColumn = ['Name (Type)', 'Balance (Rs)'];
    const tableRows: (string | number)[][] = [];

    khataEntries.forEach((entry) => {
      let amountText = '';
       if(entry.amount !== 0){
            if((entry.type === 'customer' && entry.amount < 0) || (entry.type === 'supplier' && entry.amount < 0)){
                amountText = `To Get: ${Math.abs(entry.amount).toLocaleString('en-IN')}`;
            } else {
                 amountText = `To Give: ${entry.amount.toLocaleString('en-IN')}`;
            }
        } else {
            amountText = 'Settled';
        }
      const row = [`${entry.name} (${entry.type})`, amountText];
      tableRows.push(row);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      headStyles: { fillColor: [22, 163, 74] },
      styles: { fontSize: 10 },
      theme: 'grid',
    });

    let finalY = (doc as any).lastAutoTable.finalY;

    doc.setFontSize(12);
    doc.text('Report Summary:', 14, finalY + 10);
    doc.setFontSize(10);
    doc.text(`Total to Give: Rs ${toGive.toLocaleString('en-IN')}`, 14, finalY + 16);
    doc.text(`Total to Get: Rs ${toGet.toLocaleString('en-IN')}`, 14, finalY + 22);
    
    const netBalance = toGive - toGet;
    let netBalanceText = '';
     if(netBalance > 0) {
        netBalanceText = `Net Balance (You Give): Rs ${netBalance.toLocaleString('en-IN')}`;
    } else if (netBalance < 0) {
        netBalanceText = `Net Balance (You Get): Rs ${Math.abs(netBalance).toLocaleString('en-IN')}`;
    } else {
        netBalanceText = 'Net Balance: Settled';
    }
    
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.text(netBalanceText, 14, finalY + 30);

    doc.save(`${userData.shopName}_report.pdf`);
  };

  if (isProfileLoading || areKhataEntriesLoading) {
    return <Loading />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-primary p-4 text-primary-foreground">
        <Link href="/khata">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-lg font-semibold">संपूर्ण रिपोर्ट</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <ReportSummary entries={khataEntries} isLoading={areKhataEntriesLoading} />
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>सर्व नोंदी</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>नाव</TableHead>
                        <TableHead>प्रकार</TableHead>
                        <TableHead className="text-right">शिल्लक रक्कम</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {khataEntries && khataEntries.length > 0 ? (
                        khataEntries.map((entry) => {
                             let amountColor = 'text-foreground';
                             let amountPrefix = '';
                             if (entry.type === 'customer') {
                                if (entry.amount < 0) {
                                    amountColor = 'text-red-500';
                                    amountPrefix = 'येणे';
                                } else if (entry.amount > 0) {
                                    amountColor = 'text-green-500';
                                    amountPrefix = 'ऍडव्हान्स';
                                }
                            } else { // supplier
                                if (entry.amount > 0) {
                                    amountColor = 'text-green-500';
                                    amountPrefix = 'देणे';
                                } else if (entry.amount < 0) {
                                    amountColor = 'text-red-500';
                                    amountPrefix = 'ऍडव्हान्स';
                                }
                            }

                            return (
                                <TableRow key={entry.id}>
                                    <TableCell className="font-medium">{entry.name}</TableCell>
                                    <TableCell className='capitalize'>{entry.type}</TableCell>
                                    <TableCell className={cn('text-right font-bold', amountColor)}>
                                        {entry.amount !== 0 ? (
                                            <div className='flex flex-col items-end'>
                                                <span>₹{Math.abs(entry.amount).toLocaleString('en-IN')}</span>
                                                <span className='text-xs font-normal'>{amountPrefix}</span>
                                            </div>
                                        ) : "₹0"}
                                    </TableCell>
                                </TableRow>
                            )
                        })
                        ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center">
                            कोणत्याही नोंदी आढळल्या नाहीत.
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                     <TableFooter>
                        <TableRow>
                            <TableCell colSpan={2} className="font-bold">एकूण देणे</TableCell>
                            <TableCell className="text-right font-bold text-green-500">₹{toGive.toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell colSpan={2} className="font-bold">एकूण येणे</TableCell>
                            <TableCell className="text-right font-bold text-red-500">₹{toGet.toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </CardContent>
        </Card>
      </main>

      <footer className="sticky bottom-0 grid grid-cols-2 gap-4 border-t bg-background p-4">
        <Button variant="outline" onClick={handleShareReport}>
          <Share2 className="mr-2 h-4 w-4" />
          शेअर रिपोर्ट
        </Button>
        <Button onClick={handleDownloadPdf}>
          <Download className="mr-2 h-4 w-4" />
          PDF डाउनलोड करा
        </Button>
      </footer>
    </div>
  );
}
