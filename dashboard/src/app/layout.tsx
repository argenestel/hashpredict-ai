// app/layout.tsx
'use client'
import React, { ReactNode } from 'react';
import AppWrappers from './AppWrappers';

import { DynamicContextProvider, DynamicWidget } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import Wallet from './walletadapter';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body id={'root'}>

<Wallet>
          <AppWrappers>
          <DynamicContextProvider
    settings={{
      environmentId: '8d1a0fcf-94bc-4ca7-bbe0-0d36017f8084',
      walletConnectors: [ EthereumWalletConnectors ],
    }}>
            {children}
            </DynamicContextProvider>

          </AppWrappers>

          </Wallet>
      </body>
    </html>
  );
}