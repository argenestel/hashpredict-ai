'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import routes from 'routes';
import { getActiveRoute, isWindowAvailable } from 'utils/navigation';
import React from 'react';
import Navbar from 'components/navbar';
import BottomNav from 'components/navbar/bottomnav';

export default function Admin({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (isWindowAvailable()) {
      document.documentElement.dir = 'ltr';
      const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-navy-900">
      <div className="hidden md:block">
        <Navbar isMobile={false}        />
      </div>
      <main className="flex-grow w-full px-4 sm:px-6 lg:px-8 pb-16 md:pb-0">
        <div className="max-w-7xl mx-auto py-6">
          {children}
        </div>
      </main>
      <div className="md:hidden fixed bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </div>
  );
}