

export type KhataEntry = {
  id: string;
  name: string;
  phone: string;
  amount: number;
  type: 'customer' | 'supplier';
  lastActivity: string;
  userId: string;
};

export type Transaction = {
    id: string;
    type: 'gave' | 'got';
    amount: number;
    description?: string;
    createdAt: string;
}

export type UserProfile = {
    id: string;
    email: string;
    shopName: string;
    mobileNumber: string;
    upiId: string;
    subscriptionStatus: 'active' | 'inactive' | 'reactive';
    subscriptionPlan: 'none' | 'basic' | 'premium' | 'trial';
    subscriptionUpdatedAt?: string;
    premiumTrialExpiresAt?: string;
    isAdmin?: boolean;
    password?: string; // Storing the generated password for admin reference
    otpRequestTimestamp?: string; // To trigger OTP sending flow for admin
    otpRequestCount?: number; // To track how many times OTP has been requested
    otpSent?: boolean; // To track if the admin has sent the OTP
    isBlocked?: boolean;
};

export type Calculation = {
  id: string;
  expression: string;
  result: string;
  createdAt: string;
  userId: string;
};
