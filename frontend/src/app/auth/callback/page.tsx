'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from "@aptos-labs/wallet-adapter-react";


export default function AuthCallback() {
  const { connect, account } = useWallet();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    let attempts = 0;
    const maxAttempts = 3;

    const handleCallback = async () => {
      if (!mounted) return;

      try {
        console.log(`[AuthCallback] Attempt ${attempts + 1}/${maxAttempts}`);
        
        if (account) {
          console.log('[AuthCallback] Account already exists, redirecting');
          router.push('/hub/dashboard');
          return;
        }

        await connect("Keyless Guest Wallet");
        
        if (mounted) {
          console.log('[AuthCallback] Connection successful');
          router.push('/hub/dashboard');
        }
      } catch (error) {
        console.error('[AuthCallback] Error:', error);
        
        if (mounted && attempts < maxAttempts - 1) {
          attempts++;
          console.log(`[AuthCallback] Retrying in 2s (${attempts}/${maxAttempts})`);
          setTimeout(handleCallback, 2000);
        } else if (mounted) {
          console.error('[AuthCallback] All attempts failed');
          router.push('/?error=auth_failed');
        }
      }
    };

    handleCallback();

    return () => {
      mounted = false;
    };
  }, [connect, router, account]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Processing Login...</h2>
        <p className="mb-2">Please wait while we complete your authentication.</p>
        <p className="text-sm text-gray-500">This may take a few moments...</p>
      </div>
    </div>
  );
}
