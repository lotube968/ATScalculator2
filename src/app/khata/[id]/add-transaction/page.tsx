
'use client';

import React, { useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  IndianRupee,
  Book,
  Divide,
  X,
  Minus,
  Plus,
  Equal,
  Delete,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useDoc,
  useUser,
  useFirestore,
  useMemoFirebase,
  setDocumentNonBlocking,
  addDocumentNonBlocking,
} from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { KhataEntry } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const buttonStyles = 'rounded-lg w-full h-16 text-2xl font-light focus:outline-none transition-colors duration-200';
const numberButtonStyles = `${buttonStyles} bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600`;
const operatorButtonStyles = `${buttonStyles} bg-primary/80 text-primary-foreground hover:bg-primary/70`;
const topButtonStyles = `${buttonStyles} bg-muted text-foreground hover:bg-muted/80`;


export default function AddTransactionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const entryId = params.id as string;
  const transactionType = searchParams.get('type') as 'gave' | 'got';

  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { user } = useUser();
  const firestore = useFirestore();

  const khataEntryRef = useMemoFirebase(() => {
    if (!user || !firestore || !entryId) return null;
    return doc(firestore, 'users', user.uid, 'khataEntries', entryId);
  }, [user, firestore, entryId]);

  const { data: khataEntry, isLoading: isEntryLoading } = useDoc<KhataEntry>(khataEntryRef);

  const handleButtonClick = (value: string) => {
    if (value === 'C') {
      setAmountStr('');
    } else if (value === 'del') {
      setAmountStr((prev) => prev.slice(0, -1));
    } else if (['+', '-', '*', '/'].includes(value)) {
        if (amountStr === '' || ['+', '-', '*', '/'].includes(amountStr.slice(-1))) return;
        setAmountStr(amountStr + value);
    } else if (value === '.' && amountStr.includes('.')) {
      return;
    } else {
      setAmountStr((prev) => prev + value);
    }
  };

  const calculateAmount = () => {
    try {
        if (!amountStr) return 0;
        // Basic eval - consider a safer evaluation method for production
        // A safer way to evaluate mathematical expressions
        const result = new Function(`'use strict'; return (${amountStr})`)();
        return Number(result.toFixed(2));
    } catch (error) {
        console.error("Calculation error in transaction:", error);
        toast({
            variant: 'destructive',
            title: 'त्रुटी',
            description: 'अवैध गणना.',
        });
        return null;
    }
  };

  const handleSave = () => {
    if (!user || !firestore || !khataEntry || isSaving) return;

    const calculatedAmount = calculateAmount();
    if (calculatedAmount === null || isNaN(calculatedAmount) || calculatedAmount <= 0) {
      toast({
        variant: 'destructive',
        title: 'त्रुटी',
        description: 'कृपया वैध रक्कम प्रविष्ट करा.',
      });
      return;
    }
    
    setIsSaving(true);
    
    let amountChange = 0;
    if (khataEntry.type === 'customer') {
      // 'gave' means you gave goods/credit to customer -> their balance due increases (becomes more negative/less positive)
      // 'got' means you got money from customer -> their balance due decreases (becomes less negative/more positive)
      amountChange = transactionType === 'gave' ? -calculatedAmount : calculatedAmount;
    } else { // supplier
      // 'gave' means you gave money to supplier -> your balance due decreases (becomes less positive/more negative)
      // 'got' means you got goods/credit from supplier -> your balance due increases (becomes more positive/less negative)
      amountChange = transactionType === 'gave' ? -calculatedAmount : calculatedAmount;
    }
    
    const newTotalAmount = khataEntry.amount + amountChange;

    const transactionsRef = collection(
      firestore,
      'users',
      user.uid,
      'khataEntries',
      khataEntry.id,
      'transactions'
    );
    addDocumentNonBlocking(transactionsRef, {
      type: transactionType,
      amount: calculatedAmount,
      description: description,
      createdAt: new Date().toISOString(),
    });

    const entryRef = doc(
      firestore,
      'users',
      user.uid,
      'khataEntries',
      khataEntry.id
    );
    setDocumentNonBlocking(
      entryRef,
      {
        amount: newTotalAmount,
        lastActivity: new Date().toISOString(),
      },
      { merge: true }
    );

    toast({
      title: 'यशस्वी',
      description: 'व्यवहार जतन झाला.',
    });
    router.push(`/khata/${entryId}`);
  };

  const renderButton = (value: string | React.ReactNode, style: string, onClick: () => void, className = '') => (
    <Button
      variant="ghost"
      className={cn(style, className)}
      onClick={onClick}
    >
        {value}
    </Button>
  );
  
  let headerText, amountColor, saveButtonText, saveButtonColor;
  
  if (khataEntry) {
    const isCredit = (khataEntry.type === 'customer' && transactionType === 'got') || (khataEntry.type === 'supplier' && transactionType === 'gave');
    if (transactionType === 'gave') {
        headerText = `तुम्ही ${khataEntry.name} ला दिले`;
        amountColor = 'text-red-500';
        saveButtonText = 'दिले जतन करा';
        saveButtonColor = 'bg-red-600 hover:bg-red-700';
    } else { // 'got'
        headerText = `तुम्ही ${khataEntry.name} कडून घेतले`;
        amountColor = 'text-green-500';
        saveButtonText = 'घेतले जतन करा';
        saveButtonColor = 'bg-green-600 hover:bg-green-700';
    }
  }


  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-primary p-4 text-primary-foreground">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft />
        </Button>
        <h1 className={cn("text-lg font-semibold")}>{isEntryLoading ? <Skeleton className="h-6 w-48" /> : headerText}</h1>
      </header>

      <main className="flex flex-1 flex-col justify-between p-4">
        <div className='flex-grow'>
          <div className="relative mb-4">
            <IndianRupee className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8", amountColor)} />
            <div
              className={cn("w-full bg-transparent text-right text-5xl font-bold h-20 pr-4 pl-14 flex items-center justify-end", amountColor)}
            >
              {amountStr || '0'}
            </div>
          </div>

          <div className="relative">
            <Book className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="वर्णन (उदा. दूध, चहा)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="pl-10 text-lg h-14"
            />
          </div>
        </div>

        <div>
            <div className="grid grid-cols-4 gap-2 mb-4">
                {renderButton('C', topButtonStyles, () => handleButtonClick('C'))}
                {renderButton(<Delete />, topButtonStyles, () => handleButtonClick('del'))}
                {renderButton('%', topButtonStyles, () => handleButtonClick('%'))}
                {renderButton(<Divide />, operatorButtonStyles, () => handleButtonClick('/'))}

                {renderButton('7', numberButtonStyles, () => handleButtonClick('7'))}
                {renderButton('8', numberButtonStyles, () => handleButtonClick('8'))}
                {renderButton('9', numberButtonStyles, () => handleButtonClick('9'))}
                {renderButton(<X />, operatorButtonStyles, () => handleButtonClick('*'))}

                {renderButton('4', numberButtonStyles, () => handleButtonClick('4'))}
                {renderButton('5', numberButtonStyles, () => handleButtonClick('5'))}
                {renderButton('6', numberButtonStyles, () => handleButtonClick('6'))}
                {renderButton(<Minus />, operatorButtonStyles, () => handleButtonClick('-'))}

                {renderButton('1', numberButtonStyles, () => handleButtonClick('1'))}
                {renderButton('2', numberButtonStyles, () => handleButtonClick('2'))}
                {renderButton('3', numberButtonStyles, () => handleButtonClick('3'))}
                {renderButton(<Plus />, operatorButtonStyles, () => handleButtonClick('+'))}

                {renderButton('0', numberButtonStyles, () => handleButtonClick('0'), 'col-span-2')}
                {renderButton('.', numberButtonStyles, () => handleButtonClick('.'))}
                {renderButton(<Equal />, operatorButtonStyles, () => setAmountStr(String(calculateAmount() ?? '')))}
            </div>

            <Button
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                    "w-full text-lg font-bold py-6",
                    saveButtonColor
                )}
            >
            {isSaving ? (
                <div className="jumping-dots flex gap-1">
                    <div className="dot dot-1 !w-2 !h-2"></div>
                    <div className="dot dot-2 !w-2 !h-2"></div>
                    <div className="dot dot-3 !w-2 !h-2"></div>
                </div>
            ) : (
                saveButtonText
            )}
            </Button>
        </div>
      </main>
    </div>
  );
}
