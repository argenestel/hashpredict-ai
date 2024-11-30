"use client";

import { PetraWallet } from "petra-plugin-wallet-adapter";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";
import { PropsWithChildren } from "react";
import { MyWallet } from "../utils/standardWallet";
import {KeylessWallet} from "../utils/keylessWallet";
import { registerWallet } from "@aptos-labs/wallet-standard";
import toast, { Toaster } from "react-hot-toast";

function Wallet({ children }: PropsWithChildren) {
  // Initialize wallets array with Petra wallet
  const wallets = [new PetraWallet()];

  // Register the MyWallet instance for guest login
  if (typeof window !== "undefined") {
    try {
      const myWallet = new MyWallet();
      const keylessWallet = new KeylessWallet(); 
      registerWallet(myWallet);
      registerWallet(keylessWallet);
    } catch (error) {
      console.error("Failed to register guest wallet:", error);
    }
  }

  return (
    <>
      <AptosWalletAdapterProvider
        plugins={wallets}
        autoConnect={true}
        dappConfig={{
          network: Network.TESTNET,
          aptosConnect: {
            dappId: "57fa42a9-29c6-4f1e-939c-4eefa36d9ff5",
          },
          aptosApiKey: process.env.NEXT_PUBLIC_APTOS_API_KEY,
        }}
        onError={(error) => {
          toast.error(error?.message || "An unknown wallet error occurred", {
            duration: 4000,
            position: "top-right",
          });
        }}
      >
        {children}
        <Toaster />
      </AptosWalletAdapterProvider>
    </>
  );
}

export default Wallet;
