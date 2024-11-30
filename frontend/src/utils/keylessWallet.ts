import {
  Account,
  AccountAuthenticator,
  AnyRawTransaction,
  Aptos,
  AptosConfig,
  Network,
  SigningScheme,
  EphemeralKeyPair,
  KeylessAccount,
  SimpleTransaction
} from "@aptos-labs/ts-sdk";
import {
  APTOS_CHAINS,
  AccountInfo,
  AptosConnectMethod,
  AptosDisconnectMethod,
  AptosGetAccountMethod,
  AptosGetNetworkMethod,
  AptosSignMessageMethod,
  AptosSignTransactionMethod,
  AptosWallet,
  WalletAccount,
  AptosFeatures,
  UserResponseStatus,
  IdentifierArray,
} from "@aptos-labs/wallet-standard";

// Constants
const GOOGLE_CLIENT_ID = "281045837828-lgh4at0piiv178b3flfqsuo1qn0boesh.apps.googleusercontent.com";
const REDIRECT_URI = typeof window !== 'undefined' ? 
  `${window.location.origin}/auth/callback` : 
  `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;

// Storage helpers
const storeEphemeralKeyPair = (ekp: EphemeralKeyPair): void => {
  localStorage.setItem("@aptos/ekp", JSON.stringify({
    data: Array.from(ekp.bcsToBytes()),
    nonce: ekp.nonce
  }));
};

const getLocalEphemeralKeyPair = (): EphemeralKeyPair | undefined => {
  try {
    const stored = localStorage.getItem("@aptos/ekp");
    if (!stored) return undefined;
    const data = JSON.parse(stored);
    return EphemeralKeyPair.fromBytes(new Uint8Array(data.data));
  } catch (error) {
    console.warn("Failed to decode keypair from localStorage", error);
    return undefined;
  }
};

const storeKeylessAccount = (account: KeylessAccount): void => {
  if (!account.proof) {
    console.error('Attempted to store account without proof');
    throw new Error('Cannot store account without proof');
  }

  localStorage.setItem("@aptos/account", JSON.stringify({
    data: Array.from(account.bcsToBytes())
  }));
};
const getLocalKeylessAccount = (): KeylessAccount | undefined => {
  try {
    const stored = localStorage.getItem("@aptos/account");
    if (!stored) return undefined;
    const data = JSON.parse(stored);
    return KeylessAccount.fromBytes(new Uint8Array(data.data));
  } catch (error) {
    console.warn("Failed to decode account from localStorage", error);
    return undefined;
  }
};

export class KeylessWalletAccount implements WalletAccount {
  address: string;
  publicKey: Uint8Array;
  chains: IdentifierArray;
  features: IdentifierArray;
  signingScheme: SigningScheme;
  label?: string;

  constructor(account: KeylessAccount) {
    this.address = account.accountAddress.toString();
    this.publicKey = account.publicKey.toUint8Array();
    this.chains = APTOS_CHAINS;
    this.features = ["aptos:connect"];
    this.signingScheme = SigningScheme.Ed25519;
    this.label = "Keyless Account";
  }
}

export class KeylessWallet implements AptosWallet {
  readonly version = "1.0.0";
  readonly name: string = "Keyless Guest Wallet";
  readonly url: string = "https://aptos.dev";
  readonly icon = "data:image/png;base64,..."; // Add your icon here
  readonly chains: IdentifierArray = APTOS_CHAINS;

  private _accounts: KeylessWalletAccount[] = [];
  get accounts(): readonly WalletAccount[] {
    return this._accounts;
  }

  private aptos: Aptos;
  private keylessAccount?: KeylessAccount;
  private ephemeralKeyPair?: EphemeralKeyPair;

  constructor() {
    const aptosConfig = new AptosConfig({ network: Network.TESTNET });
    this.aptos = new Aptos(aptosConfig);

    // Restore existing account and keypair
    const storedAccount = getLocalKeylessAccount();
    if (storedAccount) {
      this.keylessAccount = storedAccount;
      this._accounts = [new KeylessWalletAccount(storedAccount)];
    }

    const storedKeypair = getLocalEphemeralKeyPair();
    if (storedKeypair && !storedKeypair.isExpired()) {
      this.ephemeralKeyPair = storedKeypair;
    }
  }

  get features(): AptosFeatures {
    return {
      "aptos:connect": {
        version: "1.0.0",
        connect: this.connect.bind(this),
      },
      "aptos:network": {
        version: "1.0.0",
        network: this.network.bind(this),
      },
      "aptos:disconnect": {
        version: "1.0.0",
        disconnect: this.disconnect.bind(this),
      },
      "aptos:signTransaction": {
        version: "1.0.0",
        signTransaction: this.signTransaction.bind(this),
      },
      "aptos:signMessage": {
        version: "1.0.0",
        signMessage: this.signMessage.bind(this),
      },
      "aptos:onAccountChange": {
        version: "1.0.0",
        onAccountChange: this.onAccountChange.bind(this),
      },
      "aptos:onNetworkChange": {
        version: "1.0.0",
        onNetworkChange: this.onNetworkChange.bind(this),
      },
      "aptos:account": {
        version: "1.0.0",
        account: this.getAccount.bind(this),
      },
      "aptos:signAndSubmitTransaction": {
        version: "1.1.0",
        signAndSubmitTransaction: this.signAndSubmitTransaction.bind(this) 
      }
    };
  }

  private async initGoogleAuth(): Promise<void> {
    if (!this.ephemeralKeyPair || this.ephemeralKeyPair.isExpired()) {
      this.ephemeralKeyPair = EphemeralKeyPair.generate();
      storeEphemeralKeyPair(this.ephemeralKeyPair);
    }

    const loginUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=id_token&scope=openid+email+profile&nonce=${this.ephemeralKeyPair.nonce}&redirect_uri=${window.location.origin}/auth/callback&client_id=${GOOGLE_CLIENT_ID}`

    window.location.href = loginUrl;
    return new Promise(() => {});
  }


private async deriveKeylessAccount(jwt: string): Promise<KeylessAccount> {
  if (!this.ephemeralKeyPair) {
    throw new Error("No ephemeral keypair available");
  }

  console.log('[deriveKeylessAccount] Starting with nonce:', this.ephemeralKeyPair.nonce);

  try {
    // First derive the account and wait for proof
    this.keylessAccount = await this.aptos.deriveKeylessAccount({
      ephemeralKeyPair: this.ephemeralKeyPair,
      jwt,
      proofFetchCallback: async (status) => {
        console.log('[proofFetchCallback] Status:', status);
        if (status.status === "Failed") {
          throw new Error(`Proof generation failed: ${status.error}`);
        }
        return Promise.resolve();
      },
      options: {
        waitForProof: true, // Explicitly wait for proof
        timeoutSecs: 120,   // Increase timeout for proof generation
        proverTimeout: 120  // Add prover timeout
      }
    });

    if (!this.keylessAccount) {
      throw new Error("Failed to derive account");
    }

    // Wait for proof to be available
    console.log('[deriveKeylessAccount] Waiting for proof generation...');
    let retries = 0;
    const maxRetries = 10;
    const retryDelay = 3000;

    while (retries < maxRetries && !this.keylessAccount.proof) {
      console.log(`[deriveKeylessAccount] Waiting for proof (attempt ${retries + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      retries++;
    }

    if (!this.keylessAccount.proof) {
      throw new Error("Proof generation timeout");
    }

    console.log('[deriveKeylessAccount] Account derived successfully:', {
      address: this.keylessAccount.accountAddress.toString(),
      hasProof: true
    });

    // Store the account only after we have the proof
    storeKeylessAccount(this.keylessAccount);
    this._accounts = [new KeylessWalletAccount(this.keylessAccount)];

    return this.keylessAccount;
  } catch (error) {
    console.error('[deriveKeylessAccount] Error:', error);
    throw error;
  }
}


signAndSubmitTransaction = async (payload: AnyRawTransaction) => {
  try {
    if (!this.keylessAccount) {
      throw new Error("No active keyless account");
    }

    console.log('[signAndSubmitTransaction] Starting transaction submission', this.keylessAccount.accountAddress);

    // First sign the transaction
    
    // Submit the transaction using the aptos instance
    const pendingTx = await this.aptos.signAndSubmitTransaction({
      signer: this.keylessAccount,
      transaction: payload
    });

    console.log('[signAndSubmitTransaction] Transaction submitted:', {
      hash: pendingTx.hash
    });

    // Wait for transaction to be confirmed
    const txnResponse = await this.aptos.waitForTransaction({
      transactionHash: pendingTx.hash
    });

    console.log('[signAndSubmitTransaction] Transaction confirmed:', {
      hash: pendingTx.hash,
      success: txnResponse.success
    });

    return {
      status: UserResponseStatus.APPROVED,
      args: {
        hash: pendingTx.hash,
        response: txnResponse
      }
    };
  } catch (error) {
    console.error('[signAndSubmitTransaction] Error:', {
      error,
      message: error instanceof Error ? error.message : String(error)
    });
    
    throw error instanceof Error ? error : new Error(String(error));
  }
};

connect = async () => {
  try {
    console.log('[connect] Starting connection flow');
    
    if (typeof window !== 'undefined' && window.location.pathname === '/auth/callback') {
      console.log('[connect] Processing callback');
      const jwt = this.parseJWTFromURL(window.location.href);
      
      if (!jwt) {
        console.error('[connect] No JWT found in URL');
        throw new Error("No JWT found in URL");
      }

      const account = await this.deriveKeylessAccount(jwt);
      
      if (!account.proof) {
        throw new Error("Account created but proof is missing");
      }

      return {
        status: UserResponseStatus.APPROVED,
        args: new AccountInfo({
          address: account.accountAddress,
          publicKey: account.publicKey,
        }),
      };
    } else {
      console.log('[connect] Initiating Google auth');
      await this.initGoogleAuth();
      return {
        status: UserResponseStatus.PENDING,
        args: undefined,
      };
    }
  } catch (error) {
    console.error('[connect] Error:', error);
    throw error;
  }
}


  private async handleCallback(jwt: string): Promise<void> {
    if (!this.ephemeralKeyPair) {
      throw new Error("No ephemeral keypair available");
    }

    this.keylessAccount = await this.aptos.deriveKeylessAccount({
      ephemeralKeyPair: this.ephemeralKeyPair,
      jwt,
      proofFetchCallback: async (status) => {
        if (status.status === "Failed") {
          console.error("Proof fetch failed:", status.error);
        }

        return Promise.resolve();
      }
    });
    

    storeKeylessAccount(this.keylessAccount);
    this._accounts = [new KeylessWalletAccount(this.keylessAccount)];
    
    // Redirect to dashboard after successful auth
    window.location.href = '/hub/dashboard';
  }

  private parseJWTFromURL(url: string): string | null {
    const urlObject = new URL(url);
    const fragment = urlObject.hash.substring(1);
    const params = new URLSearchParams(fragment);
    return params.get('id_token');
  }

  getAccount: AptosGetAccountMethod = async () => {
    if (!this.keylessAccount) {
      throw new Error("No active keyless account");
    }
    return new AccountInfo({
      address: this.keylessAccount.accountAddress,
      publicKey: this.keylessAccount.publicKey,
    });
  };


  network: AptosGetNetworkMethod = async () => {
    const network = await this.aptos.getLedgerInfo();
    return {
      name: Network.TESTNET,
      chainId: network.chain_id,
      url: "https://fullnode.testnet.aptoslabs.com/v1",
    };
  };

  disconnect: AptosDisconnectMethod = async () => {
    this.keylessAccount = undefined;
    this.ephemeralKeyPair = undefined;
    this._accounts = [];
    localStorage.removeItem('@aptos/account');
    localStorage.removeItem('@aptos/ekp');
    return Promise.resolve();
  };

  signTransaction: AptosSignTransactionMethod = async (
    transaction: SimpleTransaction,
    asFeePayer?: boolean,
  ) => {
    if (!this.keylessAccount) {
      throw new Error("No active keyless account");
    }

    if (asFeePayer) {
      const auth = this.keylessAccount.signAsFeePayer(transaction);
      return { status: UserResponseStatus.APPROVED, args: auth };
    }

    const auth = this.keylessAccount.sign(transaction);
    return { status: UserResponseStatus.APPROVED, args: auth };
  };

  signMessage: AptosSignMessageMethod = async (input: any) => {
    if (!this.keylessAccount) {
      throw new Error("No active keyless account");
    }

    const messageToSign = `Aptos\nKeylessWallet\n${this.keylessAccount.accountAddress.toString()}\n${input.nonce}\n${input.chainId}\n${input.message}`;
    const encodedMessage = new TextEncoder().encode(messageToSign);
    const signature = await this.keylessAccount.sign(encodedMessage);

    return {
      status: UserResponseStatus.APPROVED,
      args: {
        address: this.keylessAccount.accountAddress.toString(),
        fullMessage: messageToSign,
        message: input.message,
        nonce: input.nonce,
        prefix: "APTOS",
        signature,
      },
    };
  };

  onAccountChange = async () => Promise.resolve();
  onNetworkChange = async () => Promise.resolve();
}
