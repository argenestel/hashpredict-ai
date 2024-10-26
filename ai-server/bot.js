import { AptosClient, AptosAccount, HexString, CoinClient } from "aptos";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const NODE_URL = "https://fullnode.testnet.aptoslabs.com";
const client = new AptosClient(NODE_URL);
const coinClient = new CoinClient(client);

const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULEADDRESS;
const FAUCET_URL = "https://faucet.testnet.aptoslabs.com";
const SHARE_AMOUNT = 10000000; // 0.1 APT
const MIN_BALANCE = 20000000; // 0.2 APT
const FAUCET_AMOUNT = 100000000; // 1 APT request amount

function generateRandomName() {
    const adjectives = ['Happy', 'Lucky', 'Sunny', 'Clever', 'Swift', 'Brave', 'Bright', 'Cool', 'Wild', 'Calm'];
    const nouns = ['Tiger', 'Eagle', 'Dolphin', 'Falcon', 'Wolf', 'Bear', 'Lion', 'Hawk', 'Fox', 'Owl'];
    const numbers = Math.floor(Math.random() * 1000);
    
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${randomAdjective}${randomNoun}${numbers}`;
}

class PredictionBot {
    constructor(privateKeys, repeatIntervalHours = 6) {
        this.accounts = privateKeys.map(
            (key) => new AptosAccount(HexString.ensure(key).toUint8Array())
        );
        this.running = false;
        this.predictionsCache = new Map();
        this.repeatIntervalMs = repeatIntervalHours * 60 * 60 * 1000;
        this.accountSetupStatus = new Map();
    }

    async requestFaucet(address) {
        try {
            await axios.post(FAUCET_URL + '/mint', null, {
                params: {
                    amount: FAUCET_AMOUNT,
                    address: address,
                },
            });
            console.log(`✅ Faucet requested successfully for ${address}`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for transaction to settle
            return true;
        } catch (error) {
            console.error(`❌ Faucet request failed for ${address}:`, error.message);
            return false;
        }
    }

    async checkUserExists(address) {
        try {
            // Ensure address is properly formatted as a string
            const addressStr = address.toString();
            const result = await client.view({
                function: `${MODULE_ADDRESS}::user_account::has_claimed_account`,
                type_arguments: [],
                arguments: [addressStr]
            });
            return result[0];
        } catch (error) {
            if (error.message && error.message.includes("ApiError")) {
                // Try alternative way to check user existence
                try {
                    const result = await client.view({
                        function: `${MODULE_ADDRESS}::user_account::get_user_info`,
                        type_arguments: [],
                        arguments: [address.toString()]
                    });
                    return true;
                } catch (innerError) {
                    if (innerError.message && innerError.message.includes("does not exist")) {
                        return false;
                    }
                    console.error('Error in alternative user check:', innerError);
                }
            }
            console.error('Error checking user existence:', error);
            return false;
        }
    }

    async createUserAccount(account) {
        try {
            const username = generateRandomName();
            console.log(`Attempting to create account with username: ${username}`);

            // Check balance before attempting creation
            const balance = await coinClient.checkBalance(account.address());
            if (balance < MIN_BALANCE) {
                console.log(`Requesting faucet before account creation...`);
                await this.requestFaucet(account.address());
                await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for faucet
            }

            const payload = {
                function: `${MODULE_ADDRESS}::user_account::register_user`,
                type_arguments: [],
                arguments: [username]
            };

            const txnRequest = await client.generateTransaction(account.address(), payload);
            const signedTxn = await client.signTransaction(account, txnRequest);
            const response = await client.submitTransaction(signedTxn);
            await client.waitForTransaction(response.hash);

            console.log(`✅ Account created for ${account.address()} with username: ${username}`);
            console.log(`   Transaction: ${response.hash}`);
            
            // Wait a bit after account creation
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            return true;
        } catch (error) {
            console.error(`❌ Account creation failed for ${account.address()}:`, error.message);
            return false;
        }
    }

    async checkAndSetupAccount(account) {
        const address = account.address().toString();

        // Check if we've already set up this account
        if (this.accountSetupStatus.get(address) === 'ready') {
            return true;
        }

        try {
            // Check balance
            const balance = await coinClient.checkBalance(account.address());
            console.log(`Account ${address} balance: ${(Number(balance) / 100000000).toFixed(2)} APT`);

            // Request faucet if balance is low
            if (balance < MIN_BALANCE) {
                console.log(`Requesting faucet for ${address}`);
                await this.requestFaucet(address);
                // Wait for faucet transaction to settle
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Verify new balance
                const newBalance = await coinClient.checkBalance(account.address());
                if (newBalance < MIN_BALANCE) {
                    console.log(`❌ Failed to get sufficient funds for ${address}`);
                    return false;
                }
            }

            // Check if user account exists with retry
            let hasAccount = false;
            let retryCount = 0;
            while (retryCount < 3) {
                hasAccount = await this.checkUserExists(account.address());
                if (hasAccount) break;
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            if (!hasAccount) {
                console.log(`Creating user account for ${address}`);
                const success = await this.createUserAccount(account);
                if (!success) {
                    console.log(`❌ Failed to create user account for ${address}`);
                    return false;
                }
                // Additional wait after account creation
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            // Verify account was created successfully
            const finalCheck = await this.checkUserExists(account.address());
            if (!finalCheck) {
                console.log(`❌ Final verification failed for ${address}`);
                return false;
            }

            this.accountSetupStatus.set(address, 'ready');
            console.log(`✅ Account ${address} is fully set up and ready`);
            return true;
        } catch (error) {
            console.error(`Error setting up account ${address}:`, error.message);
            return false;
        }
    }

    async initialize() {
        console.log("Initializing bot with", this.accounts.length, "accounts");
        for (const account of this.accounts) {
            console.log(`\nSetting up account ${account.address()}...`);
            const success = await this.checkAndSetupAccount(account);
            if (success) {
                console.log(`✅ Successfully initialized account ${account.address()}`);
            } else {
                console.log(`❌ Failed to initialize account ${account.address()}`);
            }
            // Wait between account setups
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    calculatePredictionStrategy(prediction) {
        const yesVotes = Number(prediction.yes_votes);
        const noVotes = Number(prediction.no_votes);
        const totalVotes = yesVotes + noVotes;

        if (totalVotes === 0) return Math.random() > 0.5;

        const yesPct = yesVotes / totalVotes;
        if (yesPct < 0.4) return true;
        if (yesPct > 0.6) return false;
        return Math.random() > 0.5;
    }

    async getAllPredictions() {
        try {
            const result = await client.view({
                function: `${MODULE_ADDRESS}::hashpredictalpha::get_all_predictions`,
                type_arguments: [],
                arguments: [],
            });
            return result[0];
        } catch (error) {
            console.error("Error fetching predictions:", error);
            return [];
        }
    }

    async getActivePredictions() {
        const predictions = await this.getAllPredictions();
        const currentTime = Math.floor(Date.now() / 1000);

        return predictions.filter((prediction) => {
            const isPredictionActive = prediction.state.value === 0 && 
                                     Number(prediction.end_time) > currentTime;
            
            if (!isPredictionActive) return false;

            const canRepeatPrediction = this.accounts.some(account => {
                const cacheKey = `${prediction.id}-${account.address().toString()}`;
                const lastPredictionTime = this.predictionsCache.get(cacheKey);
                
                return !lastPredictionTime || 
                       (Date.now() - lastPredictionTime) >= this.repeatIntervalMs;
            });

            return canRepeatPrediction;
        });
    }

    async makePrediction(account, prediction) {
        try {
            // Check if account is ready
            const isReady = await this.checkAndSetupAccount(account);
            if (!isReady) {
                console.log(`Account ${account.address()} not ready for predictions`);
                return false;
            }

            const cacheKey = `${prediction.id}-${account.address().toString()}`;
            const lastPredictionTime = this.predictionsCache.get(cacheKey);
            
            if (lastPredictionTime && 
                (Date.now() - lastPredictionTime) < this.repeatIntervalMs) {
                return false;
            }

            const verdict = this.calculatePredictionStrategy(prediction);

            const payload = {
                function: `${MODULE_ADDRESS}::hashpredictalpha::predict`,
                type_arguments: [],
                arguments: [
                    prediction.id,
                    verdict,
                    SHARE_AMOUNT,
                    false,
                ],
            };

            const txnRequest = await client.generateTransaction(
                account.address(),
                payload,
            );
            const signedTxn = await client.signTransaction(account, txnRequest);
            const response = await client.submitTransaction(signedTxn);
            await client.waitForTransaction(response.hash);

            this.predictionsCache.set(cacheKey, Date.now());

            console.log(`✅ Prediction made by ${account.address().toString()}:`);
            console.log(`   Prediction ID: ${prediction.id}`);
            console.log(`   Description: ${prediction.description}`);
            console.log(`   Verdict: ${verdict ? "Yes" : "No"}`);
            console.log(`   Amount: ${SHARE_AMOUNT / 100000000} APT`);
            console.log(`   Transaction: ${response.hash}`);
            console.log(`   Next prediction allowed at: ${new Date(Date.now() + this.repeatIntervalMs).toLocaleString()}`);

            return true;
        } catch (error) {
            console.error(
                `❌ Error making prediction for account ${account.address().toString()}:`,
                error.message,
            );
            return false;
        }
    }

    async start(intervalMinutes = 5) {
        if (this.running) return;
        this.running = true;
        console.log(
            `🤖 Bot started - Checking for predictions every ${intervalMinutes} minutes\n` +
            `   Repeat interval: ${this.repeatIntervalMs / (60 * 60 * 1000)} hours`
        );

        const runCycle = async () => {
            if (!this.running) return;

            try {
                const activePredictions = await this.getActivePredictions();
                console.log(`Found ${activePredictions.length} active predictions`);

                for (const prediction of activePredictions) {
                    const eligibleAccounts = this.accounts.filter(account => {
                        const cacheKey = `${prediction.id}-${account.address().toString()}`;
                        const lastPredictionTime = this.predictionsCache.get(cacheKey);
                        return !lastPredictionTime || 
                               (Date.now() - lastPredictionTime) >= this.repeatIntervalMs;
                    });

                    if (eligibleAccounts.length === 0) {
                        continue;
                    }

                    const randomAccount =
                        eligibleAccounts[
                            Math.floor(Math.random() * eligibleAccounts.length)
                        ];
                    await this.makePrediction(randomAccount, prediction);

                    await new Promise((resolve) =>
                        setTimeout(resolve, 2000 + Math.random() * 3000),
                    );
                }
            } catch (error) {
                console.error("Error in bot cycle:", error);
            }

            setTimeout(runCycle, intervalMinutes * 60 * 1000);
        };

        await runCycle();
    }

    stop() {
        console.log("🛑 Bot stopped");
        this.running = false;
    }

    getStatus() {
        const now = Date.now();
        return {
            running: this.running,
            accountsCount: this.accounts.length,
            readyAccounts: Array.from(this.accountSetupStatus.entries())
                .filter(([_, status]) => status === 'ready').length,
            predictionsProcessed: this.predictionsCache.size,
            nextAvailablePredictions: Array.from(this.predictionsCache.entries())
                .map(([key, timestamp]) => ({
                    key,
                    nextAvailableIn: Math.max(0, (this.repeatIntervalMs - (now - timestamp)) / 1000 / 60) + ' minutes'
                }))
        };
    }
}

// Example usage:
const privateKeys = [

];

const bot = new PredictionBot(privateKeys, 6); // 6 hours repeat interval

const startBot = async () => {
    try {
        await bot.initialize();
        await bot.start(5); // Check every 5 minutes

        // Safety shutdown after 24 hours
        setTimeout(() => {
            bot.stop();
            console.log("Bot safely shut down after 24 hours");
        }, 24 * 60 * 60 * 1000);
    } catch (error) {
        console.error("Error starting bot:", error);
    }
};

process.on("SIGINT", () => {
    bot.stop();
    process.exit();
});

startBot();

export default PredictionBot;