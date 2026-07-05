
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useAuth, useUser, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, getDocs } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Shield, UserX, UserCheck, PlusCircle, ArrowLeft, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import type { User as AuthUser } from 'firebase/auth';
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from '@/components/ui/card';
import { AppLogo } from '@/components/ui/app-logo';

const addAdminSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
});

type AddAdminForm = z.infer<typeof addAdminSchema>;

const AdminRow = ({ adminProfile, currentUser, onAdminUpdate }: { adminProfile: UserProfile, currentUser: AuthUser, onAdminUpdate: (id: string, updates: Partial<UserProfile>) => void }) => {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isLoading, setIsLoading] = useState(false);

    const handleRevokeAdmin = () => {
        if (!firestore) return;
        setIsLoading(true);
        const userDocRef = doc(firestore, 'users', adminProfile.id);
        
        setDocumentNonBlocking(userDocRef, { isAdmin: false }, { merge: true })
            .then(() => {
                onAdminUpdate(adminProfile.id, { isAdmin: false });
                toast({ title: 'Success', description: `Admin access revoked for ${adminProfile.email}.` });
            })
            .catch((error: any) => {
                 console.error("Failed to revoke admin access:", error);
                 toast({ title: 'Error', description: `Failed to revoke admin access: ${error.message}`, variant: 'destructive' });
            })
            .finally(() => {
                setIsLoading(false);
            });
    };
    
    const isSuperAdmin = adminProfile.email === 'lotube968@gmail.com';
    
    return (
        <TableRow>
            <TableCell>{adminProfile.shopName}</TableCell>
            <TableCell>{adminProfile.email}</TableCell>
            <TableCell>{isSuperAdmin ? <Shield className="h-5 w-5 text-yellow-500" /> : <UserCheck className="h-5 w-5 text-green-500" />}</TableCell>
            <TableCell>
                <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleRevokeAdmin} 
                    disabled={isLoading || isSuperAdmin}
                >
                    {isLoading ? "Revoking..." : "Revoke Access"}
                </Button>
            </TableCell>
        </TableRow>
    )
}

export default function ManageAdminsPage() {
  const { user: currentUser, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // This query specifically fetches users who are admins.
  const adminsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), where("isAdmin", "==", true));
  }, [firestore]);

  const { data: initialAdmins, isLoading: areAdminsLoading, error } = useCollection<UserProfile>(adminsCollectionRef);
  const [admins, setAdmins] = useState<UserProfile[] | null>(null);

  useEffect(() => {
      if(initialAdmins) {
          setAdmins(initialAdmins);
      }
  }, [initialAdmins]);
  
  const form = useForm<AddAdminForm>({
    resolver: zodResolver(addAdminSchema),
    defaultValues: { email: "" },
  });

  const { isSubmitting: isAddingAdmin } = form.formState;

  const handleAddAdmin: SubmitHandler<AddAdminForm> = async (data) => {
    if (!currentUser || !firestore) return;
    
    // Find user by email from the full user list to get their ID
    const usersQuery = query(collection(firestore, 'users'), where("email", "==", data.email));
    const querySnapshot = await getDocs(usersQuery);

    if (querySnapshot.empty) {
        toast({ title: 'Error', description: `User with email ${data.email} not found.`, variant: 'destructive' });
        return;
    }

    try {
        const userToMakeAdminDoc = querySnapshot.docs[0];
        const userDocRef = doc(firestore, 'users', userToMakeAdminDoc.id);
        
        setDocumentNonBlocking(userDocRef, { isAdmin: true }, { merge: true });

        toast({ title: 'Success', description: `Admin access granted to ${data.email}.` });
        
        // Manually update the local state to show the new admin
        const newAdminProfile = { id: userToMakeAdminDoc.id, ...userToMakeAdminDoc.data() } as UserProfile;
        setAdmins(currentAdmins => {
            if (currentAdmins && !currentAdmins.find(a => a.id === newAdminProfile.id)) {
                return [...currentAdmins, { ...newAdminProfile, isAdmin: true }];
            }
            return currentAdmins;
        });

        form.reset();
    } catch (error: any) {
        console.error("Error adding admin:", error);
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };


  useEffect(() => {
    if (isAuthLoading) return;

    if (!currentUser) {
      router.replace('/admin/login');
      return;
    }
    
    // Only the super admin can access this page
    if (currentUser.email !== 'lotube968@gmail.com') {
      toast({
        title: "Access Denied",
        description: "You do not have permission to manage admins.",
        variant: "destructive"
      });
      router.replace('/admin');
    } else {
        setIsSuperAdmin(true);
    }
  }, [currentUser, isAuthLoading, router, toast]);

  const handleAdminUpdate = useCallback((id: string, updates: Partial<UserProfile>) => {
    // When admin status is revoked, they are no longer an admin, so we remove them from the list
    if (updates.isAdmin === false) {
        setAdmins(currentAdmins => currentAdmins?.filter(a => a.id !== id) || null);
    }
  }, []);

  if (isAuthLoading || !currentUser || !isSuperAdmin) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center p-6">
            <div className="flex flex-col items-center gap-4">
                <AppLogo className="h-24 w-24 text-primary animate-pulse" />
                <div className="jumping-dots flex gap-2">
                    <div className="dot dot-1"></div>
                    <div className="dot dot-2"></div>
                    <div className="dot dot-3"></div>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center mb-6 gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/admin')}>
                <ArrowLeft />
            </Button>
            <div className='flex items-center gap-3'>
                <Users className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">Manage Admins</h1>
            </div>
        </div>

        <Card className='mb-6'>
            <CardContent className='pt-6'>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddAdmin)} className="flex items-end gap-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem className='flex-grow'>
                                    <FormLabel>Grant Admin Access</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter user's email address" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isAddingAdmin}>
                            {isAddingAdmin ? 'Granting...' : 'Grant Access'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>

        <h2 className="text-2xl font-semibold mb-4">
            Admin List ({admins?.length || 0})
        </h2>

        <div className="rounded-lg border border-primary/20 backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow className='border-primary/20'>
                <TableHead>Shop Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areAdminsLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : admins && admins.length > 0 ? (
                admins.map((admin) => (
                  <AdminRow key={admin.id} adminProfile={admin} currentUser={currentUser} onAdminUpdate={handleAdminUpdate} />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No admins found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
