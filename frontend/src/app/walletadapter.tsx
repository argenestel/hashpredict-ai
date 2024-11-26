"use client";

import { PetraWallet } from "petra-plugin-wallet-adapter";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";
import { PropsWithChildren } from "react";
import { MyWallet } from "../utils/standardWallet";
import { registerWallet } from "@aptos-labs/wallet-standard";

// Register the example wallet on page load
if (typeof window !== "undefined") {
  const myWallet = new MyWallet();
  registerWallet(myWallet);
}

function Wallet({ children }: PropsWithChildren) {
  // Initialize wallets array with Petra wallet
  const wallets = [
    new PetraWallet(),
    // Add any other wallet adapters here if needed
  ];

  return (
    <AptosWalletAdapterProvider
      plugins={wallets}
      autoConnect={true}
      dappConfig={{
        network: Network.TESTNET,
        // This enables Aptos Connect (guest wallet) functionality
        aptosConnect: {
          // Replace with your dapp ID from Aptos Labs
          dappId: "57fa42a9-29c6-4f1e-939c-4eefa36d9ff5",
        },
        // Optional: Add your Aptos API key if you have one
        aptosApiKey: process.env.NEXT_PUBLIC_APTOS_API_KEY,
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}

export default Wallet;
