import {
  Account,
  AccountAuthenticator,
  AnyRawTransaction,
  Aptos,
  AptosConfig,
  Network,
  SigningScheme,
  EphemeralKeyPair,
  KeylessAccount
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
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;

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
  readonly name: string = "Google Login";
  readonly url: string = "https://aptos.dev";
  readonly icon = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwcHgiIGhlaWdodD0iODAwcHgiIHZpZXdCb3g9Ii0zIDAgMjYyIDI2MiIgY21zbnM9Imh0dHBzOi8vd3d3Lnd3b3JrZ29vZ2xlLm9yZy8yMDAwL3N2ZyIgIHByZXNlcnZlQXNwZWN0UmF0aW89eD1YbVhNbmd4XlhhMi8gbGVzYXM5QTI4MmJhdDgwPE1FNGPHNlc0c3S6NScoBaQhLQzcQA==zeyUl"; // Add your icon here
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

    const loginUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=id_token&scope=openid+email+profile&nonce=${this.ephemeralKeyPair.nonce}&redirect_uri=${REDIRECT_URI}&client_id=${GOOGLE_CLIENT_ID}`




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
        timeoutSecs: 30,   // Increase timeout for proof generation
        proverTimeout: 30  // Add prover timeout
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

signAndSubmitTransaction = async (input: any) => {
  try {
    if (!this.keylessAccount) {
      throw new Error("No active keyless account");
    }

    console.log('[signAndSubmitTransaction] Input:', input);

    // Extract transaction data from input
    const { transaction } = input;
    const { payload } = input;

    // Build the transaction in the correct format
    const formattedTransaction = {
      function: input.payload.function,
      functionalArguments: input.payload.functionArguments,
      typeArguments: input.payload.typeArguments || []
    };

    console.log('[signAndSubmitTransaction] Formatted transaction:', formattedTransaction);

    const pendingTxn = await this.aptos.transaction.build.simple({
      sender: this.keylessAccount.accountAddress,
      data: {
          function: payload.function,
	  functionArguments: payload.functionArguments,
	  typeArguments: payload.typeArguments || []
      }
    });

    // 3. Sign
const senderAuthenticator = this.aptos.transaction.sign({
  signer: this.keylessAccount,
  transaction: pendingTxn,
});

// 4. Submit
const committedTransaction = await this.aptos.transaction.submit.simple({
  transaction: pendingTxn,
  senderAuthenticator,
});


// 5. Wait
const executedTransaction = await this.aptos.waitForTransaction({ transactionHash: committedTransaction.hash });

    console.log('[signAndSubmitTransaction] Transaction submitted:', {
      hash: executedTransaction.hash
    });

    // Wait for transaction confirmation
    const response = await this.aptos.waitForTransaction({
      transactionHash: executedTransaction.hash
    });

    console.log('[signAndSubmitTransaction] Transaction confirmed:', {
      hash: executedTransaction.hash,
      success: response.success
    });

    return {
      status: UserResponseStatus.APPROVED,
      args: response
    };

  } catch (error) {
    console.error('[signAndSubmitTransaction] Error:', {
      error,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : String(error)
    });
    
    throw error;
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


  private debugAccountState() {
    return {
      hasKeylessAccount: !!this.keylessAccount,
      accountsLength: this._accounts.length,
      hasEphemeralKeyPair: !!this.ephemeralKeyPair,
      ephemeralKeyPairExpired: this.ephemeralKeyPair?.isExpired(),
      storedAccountExists: !!localStorage.getItem('@aptos/account'),
      storedKeyPairExists: !!localStorage.getItem('@aptos/ekp'),
    };
  }
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
    transaction: AnyRawTransaction,
    asFeePayer?: boolean,
  ) => {
    if (!this.keylessAccount) {
      throw new Error("No active keyless account");
    }

    if (asFeePayer) {
      const auth = await this.keylessAccount.signAsFeePayer(transaction);
      return { status: UserResponseStatus.APPROVED, args: auth };
    }

    const auth = await this.keylessAccount.sign(transaction);
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
