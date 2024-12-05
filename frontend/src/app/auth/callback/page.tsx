'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Loader2 } from "lucide-react";

const predictionMarketFacts = [
  "Prediction markets have shown up to 90% accuracy in forecasting election outcomes.",
  "The first modern prediction market was created in 1988 at the University of Iowa.",
  "Prediction markets helped forecast the success of many product launches.",
  "Traders in prediction markets often outperform expert opinions.",
  "Decentralized prediction markets remove the need for traditional bookmakers.",
  "Market prices can aggregate information from thousands of participants.",
  "Prediction markets can forecast everything from weather to technological breakthroughs.",
  "Studies show prediction markets are less prone to common cognitive biases.",
];

export default function AuthCallback() {
  const { connect, account, connected } = useWallet();
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [currentFact, setCurrentFact] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const checkExistingAuth = async () => {
      const hasStoredAccount = localStorage.getItem("@aptos/account");
      const hasStoredKeyPair = localStorage.getItem("@aptos/ekp");

      if (hasStoredAccount && hasStoredKeyPair) {
        try {
          // If we have stored credentials, attempt to use them
          await connect("Google Login");
          router.push('/hub/dashboard');
          return true;
        } catch (error) {
          console.error("Failed to restore session:", error);
          // Clear invalid stored credentials
          localStorage.removeItem("@aptos/account");
          localStorage.removeItem("@aptos/ekp");
          return false;
        }
      }
      return false;
    };

    checkExistingAuth().then((isAuthenticated) => {
      setIsCheckingAuth(false);
      if (!isAuthenticated) {
        // Only start the new auth flow if we're not already authenticated
        handleNewAuth();
      }
    });
  }, []);

  // Animation effects
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 1, 100));
    }, 100);

    const factInterval = setInterval(() => {
      setCurrentFact(prev => (prev + 1) % predictionMarketFacts.length);
    }, 5000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(factInterval);
    };
  }, []);

  const handleNewAuth = async () => {
    let mounted = true;
    let attempts = 0;
    const maxAttempts = 3;

    const attemptAuth = async () => {
      if (!mounted) return;
      try {
        console.log(`[AuthCallback] Attempt ${attempts + 1}/${maxAttempts}`);
        
        if (account) {
          console.log('[AuthCallback] Account already exists, redirecting');
          router.push('/hub/dashboard');
          return;
        }
        
        await connect("Google Login");
        
        if (mounted) {
          console.log('[AuthCallback] Connection successful');
          router.push('/hub/dashboard');
        }
      } catch (error) {
        console.error('[AuthCallback] Error:', error);
        
        if (mounted && attempts < maxAttempts - 1) {
          attempts++;
          console.log(`[AuthCallback] Retrying in 2s (${attempts}/${maxAttempts})`);
          setTimeout(attemptAuth, 1000);
        } else if (mounted) {
          console.error('[AuthCallback] All attempts failed');
          router.push('/?error=auth_failed');
        }
      }
    };

    attemptAuth();
    return () => {
      mounted = false;
    };
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-navy-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-navy-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-navy-800 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Processing Login
          </h2>
          
          <div className="flex justify-center mb-6">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>

          <div className="w-full bg-gray-200 dark:bg-navy-700 rounded-full h-2 mb-6">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mb-4 text-gray-700 dark:text-gray-300">
            Please wait while we complete your authentication
          </p>

          <div className="mt-8 p-4 bg-gray-50 dark:bg-navy-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">
              Did you know?
            </p>
            <p className="text-gray-800 dark:text-gray-200 transition-all duration-500">
              {predictionMarketFacts[currentFact]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
