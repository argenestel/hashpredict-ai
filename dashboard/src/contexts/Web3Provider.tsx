// context/Web3AuthContext.tsx
'use client'
import React, { createContext, useState, useContext, useEffect } from 'react';
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from "@web3auth/base";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { SolanaPrivateKeyProvider } from "@web3auth/solana-provider";

const Web3AuthContext = createContext<{
  web3auth: Web3Auth | null;
  provider: IProvider | null;
  isLoading: boolean;
  user: unknown;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getUserInfo: () => Promise<any>;
} | null>(null);

export const Web3AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [user, setUser] = useState<unknown | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const clientId = "BCClmMtll16L4mPoudHIg7YGcp_NqmD1yqL51J8rCmTODg1iiqS5xODBMTZY1mxs-tjqlvZN8RAuOeAuA3VQEr0"; // get from https://dashboard.web3auth.io

        const chainConfig = {
            chainNamespace: CHAIN_NAMESPACES.SOLANA,
            chainId: "0x3",
            rpcTarget: "https://api.devnet.solana.com",
            displayName: "Solana Devnet",
            blockExplorerUrl: "https://explorer.solana.com/",
            ticker: "SOL",
            tickerName: "Solana",
          };
          
          const privateKeyProvider = new SolanaPrivateKeyProvider({
              config: { chainConfig },
            });
          const web3auth = new Web3Auth({
              clientId,
              web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
              privateKeyProvider,
            });
          

        const openloginAdapter = new OpenloginAdapter({
          adapterSettings: {
            network: "testnet",
            uxMode: "popup",
          },
        });
        web3auth.configureAdapter(openloginAdapter);
        setWeb3auth(web3auth);

        await web3auth.initModal();
        if (web3auth.provider) {
          setProvider(web3auth.provider);
        };
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, []);

  const login = async () => {
    if (!web3auth) {
      console.log("web3auth not initialized yet");
      return;
    }
    const web3authProvider = await web3auth.connect();
    setProvider(web3authProvider);
    const user = await web3auth.getUserInfo();
    setUser(user);
  };

  const logout = async () => {
    if (!web3auth) {
      console.log("web3auth not initialized yet");
      return;
    }
    await web3auth.logout();
    setProvider(null);
    setUser(null);
  };

  const getUserInfo = async () => {
    if (!web3auth) {
      console.log("web3auth not initialized yet");
      return;
    }
    const user = await web3auth.getUserInfo();
    return user;
  };

  const value = {
    web3auth,
    provider,
    user,
    isLoading,
    login,
    logout,
    getUserInfo,
  };

  return (
    <Web3AuthContext.Provider value={value}>
      {children}
    </Web3AuthContext.Provider>
  );
};

export const useWeb3Auth = () => {
  const context = useContext(Web3AuthContext);
  if (!context) {
    throw new Error('useWeb3Auth must be used within a Web3AuthProvider');
  }
  return context;
};