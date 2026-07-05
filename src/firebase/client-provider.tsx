
'use client';

import React, { type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, indexedDBLocalPersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

// Initialize Firebase app only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence,
});
const firestore = getFirestore(
  app,
  (firebaseConfig as any).firestoreDatabaseId && (firebaseConfig as any).firestoreDatabaseId !== "(default)"
    ? (firebaseConfig as any).firestoreDatabaseId
    : undefined
);

try {
  enableIndexedDbPersistence(firestore).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn(
        'Firestore persistence failed to enable. This is likely due to multiple tabs open.'
      );
    } else if (err.code === 'unimplemented') {
      console.warn(
        'Firestore persistence is not available in this browser environment.'
      );
    } else {
        console.error("Error enabling Firestore persistence", err);
    }
  });
} catch (error) {
    console.error("Firebase persistence initialization error:", error);
}


export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  return (
    <FirebaseProvider
      firebaseApp={app}
      auth={auth}
      firestore={firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
