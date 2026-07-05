
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useAuth, useUser, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, getDoc, query, where, updateDoc, deleteField } from 'firebase/firestore';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Shield, UserX, UserCheck, PlusCircle, Trash2, Edit, Users, KeyRound, MessageSquare, Ban, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { AppLogo } from '@/components/ui/app-logo';
import { createUserWithEmailAndPassword, updatePassword } from 'firebase/auth';
import Loading from '../loading';
import { Badge } from '@/components/ui/badge';

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

const UserRow = ({ userProfile, currentUser, isSuperAdminUser, onUserUpdate, onUserDelete }: { userProfile: UserProfile, currentUser: AuthUser, isSuperAdminUser: boolean, onUserUpdate: (id: string, updates: Partial<UserProfile>) => void, onUserDelete: (id: string) => void }) => {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  
  const getSubscriptionEndDate = () => {
    if (userProfile.subscriptionStatus === 'active') {
        if (userProfile.subscriptionPlan === 'trial' && userProfile.premiumTrialExpiresAt) {
            return new Date(userProfile.premiumTrialExpiresAt);
        }
        if (userProfile.subscriptionUpdatedAt) {
            const startDate = new Date(userProfile.subscriptionUpdatedAt);
            const endDate = new Date(startDate.getTime());
            endDate.setDate(startDate.getDate() + 30);
            return endDate;
        }
    }
    return null;
  }

  const subscriptionEndDate = getSubscriptionEndDate();

  const handleWhatsAppReminder = () => {
    if (!userProfile.mobileNumber) {
        toast({ title: 'Error', description: 'User does not have a mobile number.', variant: 'destructive'});
        return;
    }

    // For active users, send a subscription reminder.
    const endDate = getSubscriptionEndDate();
    if (!endDate) {
        toast({ title: 'Info', description: 'User does not have an active subscription to remind about.'});
        return;
    }
    const formattedEndDate = endDate.toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short'});
    const message = `Dear ${userProfile.shopName},\n\nThis is a friendly reminder that your subscription is ending on ${formattedEndDate}.\nPlease renew to continue enjoying our services.\n\nThank you!`;

    const whatsappUrl = `https://wa.me/91${userProfile.mobileNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleStatusChange = (newStatus: 'active' | 'inactive' | 'reactive') => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', userProfile.id);
    
    const updates: Partial<UserProfile> = { subscriptionStatus: newStatus };
    if (newStatus === 'active' || newStatus === 'reactive') {
      updates.subscriptionUpdatedAt = new Date().toISOString();
      // Clear trial expiration if manually activating
      updates.premiumTrialExpiresAt = deleteField() as any;
    }

    setDocumentNonBlocking(userDocRef, updates, { merge: true })
        .then(() => {
            onUserUpdate(userProfile.id, updates);
            toast({ title: 'Success', description: `${userProfile.shopName}'s status updated to ${newStatus}.` });
        })
        .catch((error: any) => {
            console.error("Failed to update status: ", error);
            toast({ title: 'Error', description: `Failed to update status: ${error.message}`, variant: 'destructive' });
        });
  };

  const handlePlanChange = (newPlan: 'none' | 'basic' | 'premium' | 'trial') => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', userProfile.id);
    const updates: Partial<UserProfile> = {
        subscriptionPlan: newPlan,
        subscriptionUpdatedAt: new Date().toISOString(),
    };

    if (newPlan === 'trial') {
        const trialExpiryDate = new Date();
        trialExpiryDate.setDate(trialExpiryDate.getDate() + 7);
        updates.premiumTrialExpiresAt = trialExpiryDate.toISOString();
    } else {
        updates.premiumTrialExpiresAt = deleteField() as any;
    }

    setDocumentNonBlocking(userDocRef, updates, { merge: true })
        .then(() => {
            onUserUpdate(userProfile.id, updates);
            toast({ title: 'Success', description: `${userProfile.shopName}'s plan updated to ${newPlan}.` });
        })
        .catch((error: any) => {
            console.error("Failed to update plan: ", error);
            toast({ title: 'Error', description: `Failed to update plan: ${error.message}`, variant: 'destructive' });
        });
  };
  
  const handleAdminChange = (newIsAdmin: boolean) => {
    if (!isSuperAdminUser || !firestore) return;
    setIsAdminLoading(true);
    const userDocRef = doc(firestore, 'users', userProfile.id);
    
    setDocumentNonBlocking(userDocRef, { isAdmin: newIsAdmin }, { merge: true })
        .then(() => {
            onUserUpdate(userProfile.id, { isAdmin: newIsAdmin });
            toast({ title: 'Success', description: `Admin status for ${userProfile.shopName} updated.` });
        })
        .catch((error: any) => {
            console.error("Error updating admin status:", error);
            toast({ title: 'Error', description: `Failed to update admin status: ${error.message}`, variant: 'destructive' });
        })
        .finally(() => {
            setIsAdminLoading(false);
        });
  };

  const handleDelete = () => {
    if (!firestore) return;
    setIsDeleting(true);
    const userDocRef = doc(firestore, 'users', userProfile.id);
    
    deleteDocumentNonBlocking(userDocRef)
        .then(() => {
            toast({ title: 'User Deleted', description: `${userProfile.shopName} has been deleted from Firestore.` });
            onUserDelete(userProfile.id);
        })
        .catch((error: any) => {
             console.error("Error deleting user:", error);
             toast({ title: 'Error Deleting User', description: error.message, variant: 'destructive'});
        })
        .finally(() => {
            setIsDeleting(false);
        });
  };

  const handleResetPassword = () => {
    if (!firestore) return;
    
    // Auto-open the dialog
    setIsPasswordDialogOpen(true);

    const randomPassword = Math.floor(100000 + Math.random() * 900000).toString();
    
    setIsUpdatingPassword(true);
    const userDocRef = doc(firestore, 'users', userProfile.id);
    // Set otpSent to false when generating a new password
    setDocumentNonBlocking(userDocRef, { password: randomPassword, otpSent: false }, { merge: true })
        .then(() => {
            onUserUpdate(userProfile.id, { password: randomPassword, otpSent: false });
            setNewPassword(randomPassword);
            toast({ title: 'Password Generated', description: `New password created. Send it to the user.` });
        })
        .catch((error: any) => {
            console.error("Error generating new password:", error);
            toast({ title: 'Error', description: `Failed to generate new password: ${error.message}`, variant: 'destructive' });
        })
        .finally(() => {
            setIsUpdatingPassword(false);
        });
  };
  
  const sendNewPasswordViaWhatsApp = () => {
    if (!newPassword || !userProfile.mobileNumber || !firestore) return;
    
    const message = `Hello ${userProfile.shopName},\nYour new OTP for account verification is: ${newPassword}\nPlease use this to log in.`;
    const whatsappUrl = `https://wa.me/91${userProfile.mobileNumber}?text=${encodeURIComponent(message)}`;
    
    // Update otpSent status in Firestore
    const userDocRef = doc(firestore, 'users', userProfile.id);
    setDocumentNonBlocking(userDocRef, { otpSent: true }, { merge: true })
        .then(() => {
            onUserUpdate(userProfile.id, { otpSent: true });
            // Open WhatsApp and close dialog
            window.open(whatsappUrl, '_blank');
            setIsPasswordDialogOpen(false);
            setNewPassword('');
        })
        .catch((error: any) => {
             console.error("Error updating OTP status:", error);
            toast({ title: 'Error', description: `Failed to update OTP status: ${error.message}`, variant: 'destructive' });
        });
  }

  const handleBlockToggle = (isBlocked: boolean) => {
    if (!firestore) return;
    setIsBlocking(true);
    const userDocRef = doc(firestore, 'users', userProfile.id);
    setDocumentNonBlocking(userDocRef, { isBlocked }, { merge: true })
        .then(() => {
            onUserUpdate(userProfile.id, { isBlocked });
            toast({ title: 'Success', description: `${userProfile.shopName} has been ${isBlocked ? 'blocked' : 'unblocked'}.` });
        })
        .catch((error: any) => {
            console.error("Error updating block status:", error);
            toast({ title: 'Error', description: `Failed to update block status: ${error.message}`, variant: 'destructive' });
        })
        .finally(() => {
            setIsBlocking(false);
        });
  };

  const isHardcodedSuperAdmin = userProfile.email === 'lotube968@gmail.com';
  const isSelf = userProfile.id === currentUser.uid;

  const needsOtp = userProfile.subscriptionStatus === 'inactive' && !userProfile.subscriptionUpdatedAt && !userProfile.premiumTrialExpiresAt;

  return (
    <TableRow className="bg-background/80 hover:bg-muted/60">
        <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => { if(!open) setNewPassword(''); setIsPasswordDialogOpen(open); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reset Password for {userProfile.shopName}</DialogTitle>
                </DialogHeader>
                {!newPassword ? (
                    <>
                    <DialogDescription>
                        Click the button below to generate a new 6-digit password (OTP) for this user. This action is irreversible. The new password can then be sent via WhatsApp.
                    </DialogDescription>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleResetPassword} disabled={isUpdatingPassword}>
                            {isUpdatingPassword ? "Generating..." : "Generate New Password"}
                        </Button>
                    </DialogFooter>
                    </>
                ) : (
                    <>
                    <DialogDescription>
                        A new password has been generated. Send it to the user via WhatsApp.
                    </DialogDescription>
                     <div className="space-y-2">
                        <p><span className="font-semibold">Email:</span> {userProfile.email}</p>
                        <p><span className="font-semibold">New Password (OTP):</span> <span className='font-bold text-lg'>{newPassword}</span></p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsPasswordDialogOpen(false); setNewPassword(''); }}>Close</Button>
                        <Button onClick={sendNewPasswordViaWhatsApp} className='bg-green-600 hover:bg-green-700'>
                            <WhatsAppIcon className="mr-2 h-4 w-4" /> Send on WhatsApp
                        </Button>
                    </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>

      <TableCell className="font-medium flex items-center gap-2">
        {userProfile.shopName}
         <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleWhatsAppReminder}>
            <WhatsAppIcon className="h-4 w-4" />
        </Button>
      </TableCell>
      <TableCell>{userProfile.email}</TableCell>
      <TableCell>{userProfile.mobileNumber || 'N/A'}</TableCell>
      <TableCell>
        {needsOtp ? (
            userProfile.otpSent ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">OTP पाठवला</Badge>
            ) : (
                <Badge 
                    variant="destructive" 
                    className="cursor-pointer bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800"
                    onClick={() => {
                        if (userProfile.password) {
                            setNewPassword(userProfile.password);
                            setIsPasswordDialogOpen(true);
                        } else {
                            handleResetPassword();
                        }
                    }}
                >
                    OTP पाठवा
                </Badge>
            )
        ) : (
             <Badge variant="outline">N/A</Badge>
        )}
      </TableCell>
      <TableCell>
        <Select value={userProfile.subscriptionStatus} onValueChange={handleStatusChange} >
          <SelectTrigger className="w-[120px] bg-background">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="reactive">Reactive</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
       <TableCell>
        <Select value={userProfile.subscriptionPlan} onValueChange={handlePlanChange}>
            <SelectTrigger className="w-[120px] bg-background">
                <SelectValue placeholder="Select plan" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="basic">Basic (₹30)</SelectItem>
                <SelectItem value="premium">Premium (₹50)</SelectItem>
            </SelectContent>
        </Select>
      </TableCell>
      <TableCell>{userProfile.subscriptionUpdatedAt ? new Date(userProfile.subscriptionUpdatedAt).toLocaleString() : 'N/A'}</TableCell>
      <TableCell>{subscriptionEndDate ? subscriptionEndDate.toLocaleString() : 'N/A'}</TableCell>
       <TableCell>
          <div className='flex items-center space-x-2'>
            <Switch
                id={`admin-switch-${userProfile.id}`}
                checked={userProfile.isAdmin || false}
                onCheckedChange={handleAdminChange}
                disabled={isAdminLoading || isSelf || isHardcodedSuperAdmin || !isSuperAdminUser}
                aria-label="Admin status"
            />
            <Label htmlFor={`admin-switch-${userProfile.id}`} className='text-sm'>
              {userProfile.isAdmin ? <UserCheck className="h-5 w-5 text-green-500" /> : <UserX className="h-5 w-5 text-red-500" />}
            </Label>
          </div>
        </TableCell>
        <TableCell>
            <div className="flex items-center justify-center">
                <Switch
                    id={`block-switch-${userProfile.id}`}
                    checked={userProfile.isBlocked || false}
                    onCheckedChange={handleBlockToggle}
                    disabled={isBlocking || isSelf || isHardcodedSuperAdmin}
                    aria-label="Block status"
                />
            </div>
        </TableCell>
        <TableCell className='flex gap-2 items-center'>
             <Button variant="outline" size="icon" className='h-8 w-8' onClick={() => setIsPasswordDialogOpen(true)} disabled={isHardcodedSuperAdmin}>
                <KeyRound className='h-4 w-4'/>
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon" className='h-8 w-8' disabled={isSelf || isHardcodedSuperAdmin}>
                        <Trash2 className='h-4 w-4' />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the account for <span className='font-bold'>{userProfile.shopName}</span> and remove their data from our servers.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? "Deleting..." : "Yes, delete user"}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </TableCell>
    </TableRow>
  );
};


export default function AdminPage() {
  const auth = useAuth();
  const { user: currentUser, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [newUser, setNewUser] = useState<UserProfile | null>(null);
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const usersCollectionRef = useMemoFirebase(() => {
    if (!firestore || !currentUser || !isAdmin) return null;
    return collection(firestore, 'users');
  }, [firestore, currentUser, isAdmin]);

  const { data: initialUsers, isLoading: areUsersLoading, error } = useCollection<UserProfile>(usersCollectionRef);

  useEffect(() => {
    if (initialUsers) {
        setUsers(initialUsers);
    }
  }, [initialUsers]);

  const handleUserUpdate = useCallback((id: string, updates: Partial<UserProfile>) => {
    setUsers(currentUsers => 
        currentUsers?.map(u => u.id === id ? {...u, ...updates} : u) || null
    );
  }, []);

  const handleUserDelete = useCallback((id: string) => {
    setUsers(currentUsers =>
        currentUsers?.filter(u => u.id !== id) || null
    );
  }, []);
  
  const handleUserAdded = (newUserProfile: UserProfile, password?: string) => {
    setUsers(currentUsers => {
        const userExists = currentUsers?.some(u => u.id === newUserProfile.id);
        if (userExists) return currentUsers;
        return [newUserProfile, ...(currentUsers || [])];
    });
    if (password) {
        setNewUser(newUserProfile);
        setNewUserPassword(password);
    }
  };
  
  useEffect(() => {
    if (isAuthLoading) return;
    if (!currentUser) {
        router.replace('/admin/login');
        return;
    }

    const checkAdminStatus = async () => {
        const isUserSuperAdmin = currentUser.email === 'lotube968@gmail.com';
        setIsSuperAdmin(isUserSuperAdmin);

        if (isUserSuperAdmin) {
            setIsAdmin(true);
            return;
        }

        try {
            if (!firestore) return;
            const userDoc = await getDoc(doc(firestore, 'users', currentUser.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const isUserAdmin = userData?.isAdmin === true;
                if (isUserAdmin) {
                    setIsAdmin(true);
                } else {
                    toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
                    auth.signOut().catch(err => console.error("Error signing out:", err));
                    router.replace('/admin/login');
                }
            } else {
                toast({ title: "Access Denied", description: "User profile not found.", variant: "destructive" });
                auth.signOut().catch(err => console.error("Error signing out:", err));
                router.replace('/admin/login');
            }
        } catch (e) {
            console.error("Error fetching user admin status", e);
            toast({ title: "Access Denied", description: "Could not verify admin status.", variant: "destructive" });
            auth.signOut().catch(err => console.error("Error signing out:", err));
            router.replace('/admin/login');
        }
    };
    checkAdminStatus();
  }, [currentUser, isAuthLoading, router, firestore, auth, toast]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    // Sort users: pending OTPs first, then by last update time
    const sortedUsers = [...users].sort((a, b) => {
        const aNeedsOtp = a.subscriptionStatus === 'inactive' && !a.subscriptionUpdatedAt && !a.premiumTrialExpiresAt && !a.otpSent;
        const bNeedsOtp = b.subscriptionStatus === 'inactive' && !b.subscriptionUpdatedAt && !b.premiumTrialExpiresAt && !b.otpSent;

        if (aNeedsOtp && !bNeedsOtp) return -1;
        if (!aNeedsOtp && bNeedsOtp) return 1;

        const dateA = a.otpRequestTimestamp ? new Date(a.otpRequestTimestamp).getTime() : 0;
        const dateB = b.otpRequestTimestamp ? new Date(b.otpRequestTimestamp).getTime() : 0;
        return dateB - dateA;
    });

    if (!searchTerm) return sortedUsers;

    const lowercasedFilter = searchTerm.toLowerCase();

    // Specific search for OTP status
    if (['otp पाठवा', 'otp send', 'send otp'].includes(lowercasedFilter)) {
        return sortedUsers.filter(user => 
            user.subscriptionStatus === 'inactive' && 
            !user.subscriptionUpdatedAt && 
            !user.premiumTrialExpiresAt && 
            !user.otpSent
        );
    }
    if (['otp पाठवला', 'otp sent'].includes(lowercasedFilter)) {
        return sortedUsers.filter(user => 
            user.subscriptionStatus === 'inactive' && 
            !user.subscriptionUpdatedAt && 
            !user.premiumTrialExpiresAt && 
            user.otpSent
        );
    }
    
    // General search
    return sortedUsers.filter((user) => {
      const shopName = user.shopName || '';
      const email = user.email || '';
      const mobileNumber = user.mobileNumber || '';
      const subscriptionStatus = user.subscriptionStatus || '';
      const subscriptionPlan = user.subscriptionPlan || '';

      return (
        shopName.toLowerCase().includes(lowercasedFilter) ||
        email.toLowerCase().includes(lowercasedFilter) ||
        mobileNumber.includes(lowercasedFilter) ||
        subscriptionStatus.toLowerCase().includes(lowercasedFilter) ||
        subscriptionPlan.toLowerCase().includes(lowercasedFilter)
      );
    });
  }, [users, searchTerm]);

  const sendNewUserPasswordViaWhatsApp = useCallback(() => {
    if (!newUser || !newUserPassword || !newUser.mobileNumber) return;
    const message = `Welcome, ${newUser.shopName}!\nYour account has been created.\n\nEmail: ${newUser.email}\nPassword (OTP): ${newUserPassword}\n\nPlease use these details to log in and verify your account.`;
    const whatsappUrl = `https://wa.me/91${newUser.mobileNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setNewUser(null);
    setNewUserPassword('');
    setCountdown(null);
  }, [newUser, newUserPassword]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (newUser && countdown === null) {
      const randomTime = Math.floor(Math.random() * 21) + 20; // 20 to 40
      setCountdown(randomTime);
    }
    if (countdown !== null && countdown > 0) {
        timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
        sendNewUserPasswordViaWhatsApp();
    }
    return () => {
        if (timer) clearTimeout(timer);
    };
  }, [newUser, countdown, sendNewUserPasswordViaWhatsApp]);

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/admin/login');
  }

  if (isAuthLoading || !currentUser || !isAdmin) {
      return <Loading />;
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <Dialog open={!!newUser} onOpenChange={(open) => { if(!open) { setNewUser(null); setNewUserPassword(''); setCountdown(null); } }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>New User Created: {newUser?.shopName}</DialogTitle>
                <DialogDescription>
                    A new account has been created. Send the login details to the user via WhatsApp for verification.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
                <p><span className="font-semibold">Email:</span> {newUser?.email}</p>
                <p><span className="font-semibold">Password (OTP):</span> <span className='font-bold text-lg'>{newUserPassword}</span></p>
            </div>
            <DialogFooter className="flex-col items-center gap-2">
                <div className='flex w-full gap-2'>
                    <Button variant="outline" className="flex-1" onClick={() => { setNewUser(null); setNewUserPassword(''); setCountdown(null); }}>Close</Button>
                    <Button onClick={sendNewUserPasswordViaWhatsApp} className='bg-green-600 hover:bg-green-700 flex-1'>
                        <WhatsAppIcon className="mr-2 h-4 w-4" />
                        Send on WhatsApp
                    </Button>
                </div>
                 {countdown !== null && (
                    <p className="text-sm text-muted-foreground mt-2">
                        Sending OTP automatically in... <span className="font-bold text-primary">{countdown}s</span>
                    </p>
                )}
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <div className='flex items-center gap-3'>
                <Shield className="h-8 w-8 text-primary animate-pulse" />
                <h1 className="text-3xl font-bold animate-color-flash">Admin Panel</h1>
            </div>
            <div className='flex items-center gap-2'>
                <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search user or 'OTP पाठवा'"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-background/50"
                    />
                </div>
                {isSuperAdmin && (
                    <Button onClick={() => router.push('/admin/manage-admins')} variant="outline">
                        <Users className="mr-2 h-4 w-4" /> Manage Admins
                    </Button>
                )}
                 <Button onClick={() => router.push('/admin/change-password')} variant="outline">
                    <KeyRound className="mr-2 h-4 w-4" /> Change Password
                </Button>
                <Button onClick={handleLogout} variant="destructive">Logout</Button>
            </div>
        </div>

        <div className="rounded-lg border border-primary/20 backdrop-blur-sm overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow className='border-primary/20'>
                <TableHead>Shop Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>OTP Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Subscription Ends</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead className="text-center">Block</TableHead>
                <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {areUsersLoading ? (
                [...Array(5)].map((_, i) => (
                    <TableRow key={i} className='border-0'>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-12" /></TableCell>
                        <TableCell className='flex gap-2'><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                ))
                ) : filteredUsers.length > 0 ? (
                filteredUsers.map((userProfile) => (
                    <UserRow key={userProfile.id} userProfile={userProfile} currentUser={currentUser} isSuperAdminUser={isSuperAdmin} onUserUpdate={handleUserUpdate} onUserDelete={handleUserDelete} />
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center">
                    No users found.
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
