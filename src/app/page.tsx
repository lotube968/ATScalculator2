'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loading from './loading';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Directly redirect to the main calculator page, bypassing the welcome flow.
    router.replace('/calculator');
  }, [router]);

  // Show a loading indicator while redirecting.
  return <Loading />;
}
