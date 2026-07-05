
'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Calculation } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
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
} from "@/components/ui/alert-dialog";

const HistoryItem = ({ calculation }: { calculation: Calculation }) => {
  return (
    <div className="flex items-center justify-between p-3 border-b">
      <div>
        <p className="font-mono text-sm text-muted-foreground">{calculation.expression}</p>
        <p className="text-lg font-bold">= {calculation.result}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        {format(new Date(calculation.createdAt), 'dd MMM, hh:mm a')}
      </p>
    </div>
  );
};

export default function HistoryPage() {
  const [calculations, setCalculations] = useState<Calculation[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    try {
      const historyString = localStorage.getItem('calculationHistory');
      if (historyString) {
        setCalculations(JSON.parse(historyString));
      } else {
        setCalculations([]);
      }
    } catch (error) {
      console.error("Failed to load history from localStorage", error);
      setCalculations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleClearHistory = () => {
    try {
        localStorage.removeItem('calculationHistory');
        setCalculations([]);
        toast({ title: "Success", description: "Calculation history has been cleared." });
    } catch(error) {
        console.error("Error clearing history from localStorage: ", error);
        toast({ title: "Error", description: "Failed to clear history.", variant: "destructive" });
    }
  };


  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-primary p-4 text-primary-foreground">
        <Button variant="ghost" size="icon" onClick={() => router.push('/calculator')}>
          <ArrowLeft />
        </Button>
        <h1 className="text-lg font-semibold">Calculation History</h1>
      </header>
      <main className="flex-1 p-4">
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
            <CardDescription>Here are your 5 most recent calculations stored on this device.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border-b">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : calculations && calculations.length > 0 ? (
              calculations.map((calc) => <HistoryItem key={calc.id} calculation={calc} />)
            ) : (
              <p className="text-center text-muted-foreground py-8">No history found.</p>
            )}
          </CardContent>
          {calculations && calculations.length > 0 && (
             <CardFooter>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className='w-full'>
                            <Trash2 className="mr-2 h-4 w-4" /> Clear History
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your calculation history from this device.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearHistory}>
                            Yes, clear history
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
          )}
        </Card>
      </main>
    </div>
  );
}
