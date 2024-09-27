'use client'
import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network, MoveValue } from '@aptos-labs/ts-sdk';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoRefresh, IoAdd, IoWallet, IoStatsChart, IoTrophy, IoGift, IoShare, IoCopy } from 'react-icons/io5';
import toast, { Toaster } from "react-hot-toast";
import Image from 'next/image';
const MODULE_ADDRESS = '0xe5daef3712e9be57eee01a28e4b16997e89e0b446546d304d5ec71afc9d1bacd';
const config = new AptosConfig({ network: Network.DEVNET });
const aptos = new Aptos(config);

interface UserInfo {
  alias: string;
  apt_balance: string;
  chip_balance: string;
  rank: string;
  reputation: string;
  total_predictions: string;
  correct_predictions: string;
}

interface PredictionEntry {
  prediction_id: string;
  amount: string;
  is_chip: boolean;
  verdict: boolean;
  outcome: boolean;
}

interface DailyClaimInfo {
  lastClaimTime: string;
  currentStreak: string;
}

const Profile = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [predictions, setPredictions] = useState<PredictionEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAlias, setNewAlias] = useState('');
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [userExists, setUserExists] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dailyClaimInfo, setDailyClaimInfo] = useState<DailyClaimInfo | null>(null);
  const [referrals, setReferrals] = useState<string[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [userReferralCode, setUserReferralCode] = useState('');
  const [isReferralCodeUsed, setIsReferralCodeUsed] = useState(false);
  useEffect(() => {
    if (connected && account) {
      checkUserExists();
      fetchDailyClaimInfo();
      fetchReferrals();
    } else {
      setIsLoading(false);
      setUserExists(false);
      setUserInfo(null);
      setPredictions([]);
      setErrorMessage(null);
      setDailyClaimInfo(null);
      setReferrals([]);
    }
  }, [account, connected]);

  const generateReferralCode = async () => {
    if (!connected || !account) {
      toast.error('Wallet not connected');
      return;
    }

    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await signAndSubmitTransaction({
        data: {
          function: `${MODULE_ADDRESS}::reward_system::generate_referral_code`,
          typeArguments: [],
          functionArguments: [code]
        },
      });
      setUserReferralCode(code);
      toast.success('Referral code generated successfully');
    } catch (error) {
      console.error('Error generating referral code:', error);
      toast.error('Failed to generate referral code');
    }
  };
  const copyReferralCode = () => {
    navigator.clipboard.writeText(userReferralCode);
    toast.success('Referral code copied to clipboard');
  };
  const checkUserExists = async () => {
    if (!account) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      console.log('Checking if user exists for address:', account.address);
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::user_account::has_claimed_account`,
          typeArguments: [],
          functionArguments: [account.address]
        }
      });
      console.log('User exists result:', result);
      setUserExists(result[0]);
      if (result[0]) {
        await fetchUserInfo();
        await fetchUserPredictions();
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking user existence:', error);
      setErrorMessage('Failed to check user account. Please try again.');
      setIsLoading(false);
    }
  };

  const fetchUserInfo = async () => {
    if (!account) return;
    try {
      console.log('Fetching user info for address:', account.address);
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::user_account::get_user_info`,
          typeArguments: [],
          functionArguments: [account.address]
        }
      });
      console.log('User info result:', result);
      setUserInfo({
        alias: result[0].toString(),
        apt_balance: (Number(result[1])/1e8).toString(),
        chip_balance: (Number(result[2])/1e8).toString(),
        rank: result[3].toString(),
        reputation: result[4].toString(),
        total_predictions: result[5].toString(),
        correct_predictions: result[6].toString(),
      });
    } catch (error) {
      console.error('Error fetching user info:', error);
      setErrorMessage('Failed to fetch user information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const fetchDailyClaimInfo = async () => {
    if (!account) return;
    try {
      const response = await fetch(`http://localhost:4000/get-daily-claim-info/${account.address}`);
      const data = await response.json();
      setDailyClaimInfo(data);
    } catch (error) {
      console.error('Error fetching daily claim info:', error);
      toast.error('Failed to fetch daily claim information');
    }
  };

  const fetchReferrals = async () => {
    if (!account) return;
    try {
      const response = await fetch(`http://localhost:4000/get-referrals/${account.address}`);
      const data = await response.json();
      setReferrals(data.referrals);
    } catch (error) {
      console.error('Error fetching referrals:', error);
      toast.error('Failed to fetch referrals');
    }
  };

  const handleClaimDailyReward = async () => {
    if (!connected || !account) {
      toast.error('Wallet not connected');
      return;
    }

    try {
      const response = await fetch('http://localhost:4000/claim-daily-reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userAddress: account.address }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Daily reward claimed successfully');
        await fetchUserInfo();
        await fetchDailyClaimInfo();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error claiming daily reward:', error);
      toast.error('Failed to claim daily reward');
    }
  };

  const handleUseReferralCode = async () => {
    if (!connected || !account) {
      toast.error('Wallet not connected');
      return;
    }

    try {
      const response = await fetch('http://localhost:4000/use-referral-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userAddress: account.address, referralCode }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Referral code used successfully');
        await fetchUserInfo();
        setIsReferralModalOpen(false);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error using referral code:', error);
      toast.error('Failed to use referral code');
    }
  };

  const fetchUserPredictions = async () => {
    if (!account) return;
    try {
      console.log('Fetching user predictions for address:', account.address);
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::user_account::get_user_predictions`,
          typeArguments: [],
          functionArguments: [account.address]
        }
      });
      console.log('User predictions result:', result);
      setPredictions(result[0].map((prediction: any) => ({
        prediction_id: prediction.prediction_id.toString(),
        amount: (Number(prediction.amount)/1e8).toString(),
        is_chip: prediction.is_chip,
        verdict: prediction.verdict,
        outcome: prediction.outcome,
      })));
    } catch (error) {
      console.error('Error fetching user predictions:', error);
      toast.error('Failed to fetch user predictions');
    }
  };

  const handleUpdateBalances = async () => {
    if (!connected || !account) {
      toast.error('Wallet not connected');
      return;
    }

    try {
      await signAndSubmitTransaction({
        data: {
          function: `${MODULE_ADDRESS}::user_account::update_balances`,
          typeArguments: [],
          functionArguments: []
        },
      });
      toast.success('Balances updated successfully');
      await fetchUserInfo();
    } catch (error) {
      console.error('Error updating balances:', error);
      toast.error('Failed to update balances');
    }
  };

  const handleCreateOrChangeAlias = async () => {
    if (!connected || !account) {
      toast.error('Wallet not connected');
      return;
    }

    try {
      console.log('Creating/changing alias for address:', account.address);
      await signAndSubmitTransaction({
        data: {
          function: `${MODULE_ADDRESS}::user_account::register_user`,
          typeArguments: [],
          functionArguments: [newAlias]
        },
      });
      toast.success(userExists ? 'Alias changed successfully' : 'Account created successfully');
      await checkUserExists();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating/changing alias:', error);
      toast.error(userExists ? 'Failed to change alias' : 'Failed to create account');
    }
  };

  return (
<div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-navy-900 dark:to-navy-800 p-4">
      <Toaster />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-navy-700 dark:text-white mb-2">User Profile</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">Manage your account and view your predictions</p>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-48 bg-white dark:bg-navy-800 rounded-xl shadow-lg"></div>
            <div className="h-32 bg-white dark:bg-navy-800 rounded-xl shadow-lg"></div>
          </div>
        ) : errorMessage ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg" role="alert">
            <p className="font-bold">Error</p>
            <p>{errorMessage}</p>
          </div>
        ) : userExists && userInfo ? (
          <>
            <div className="bg-white dark:bg-navy-800 rounded-xl shadow-lg overflow-hidden mb-6">
              <div className="relative h-32 sm:h-48 bg-gradient-to-r from-blue-500 to-purple-600">
                <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
                  <Image
                    width={96}
                    height={96}
                    className="rounded-full border-4 border-white dark:border-navy-700"
                    src={`https://robohash.org/${account?.address}.png`}
                    alt="User Avatar"
                  />
                </div>
              </div>
              <div className="pt-20 px-4 sm:px-6 pb-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl sm:text-3xl font-bold text-navy-700 dark:text-white mb-2">{userInfo.alias}</h2>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsModalOpen(true)}
                    className="mt-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2 px-4 text-sm sm:text-base inline-flex items-center justify-center transition-colors duration-200"
                  >
                    <IoRefresh className="mr-2" /> Change Alias
                  </motion.button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-100 dark:bg-navy-700 p-4 rounded-xl flex items-center justify-between sm:justify-center">
                    <div className="flex items-center">
                      <IoWallet className="text-2xl sm:text-3xl text-blue-500 mr-2 sm:mr-3" />
                      <div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">APT Balance</p>
                        <p className="text-lg sm:text-xl font-semibold text-navy-700 dark:text-white">{userInfo.apt_balance}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-100 dark:bg-navy-700 p-4 rounded-xl flex items-center justify-between sm:justify-center">
                    <div className="flex items-center">
                      <IoStatsChart className="text-2xl sm:text-3xl text-green-500 mr-2 sm:mr-3" />
                      <div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">CHIP Balance</p>
                        <p className="text-lg sm:text-xl font-semibold text-navy-700 dark:text-white">{userInfo.chip_balance}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-100 dark:bg-navy-700 p-4 rounded-xl flex items-center justify-between sm:justify-center">
                    <div className="flex items-center">
                      <IoTrophy className="text-2xl sm:text-3xl text-yellow-500 mr-2 sm:mr-3" />
                      <div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Rank</p>
                        <p className="text-lg sm:text-xl font-semibold text-navy-700 dark:text-white">{userInfo.rank}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-navy-700 dark:text-white">{userInfo.reputation}</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Reputation</p>
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-navy-700 dark:text-white">{userInfo.total_predictions}</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Predictions</p>
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-navy-700 dark:text-white">{userInfo.correct_predictions}</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Correct Predictions</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white dark:bg-navy-800 rounded-xl shadow-lg overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-navy-700">
                  <h3 className="text-xl font-semibold text-navy-700 dark:text-white">Daily Reward</h3>
                </div>
                <div className="p-4 sm:p-6">
                  {dailyClaimInfo ? (
                    <>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Last Claim: {new Date(parseInt(dailyClaimInfo.lastClaimTime) * 1000).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Current Streak: {dailyClaimInfo.currentStreak} days
                          </p>
                        </div>
                        <div className="mt-2 sm:mt-0 text-right">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Next claim in:</p>
                          <p className="text-lg font-semibold text-navy-700 dark:text-white">
                            12:34:56
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 mb-4">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(dailyClaimInfo.currentStreak % 7) * 100 / 7}%` }}></div>
                      </div>
                      {new Date(parseInt(dailyClaimInfo.lastClaimTime) * 1000).getDate() !== new Date().getDate() ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleClaimDailyReward}
                          className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg py-2 px-4 text-sm sm:text-base flex items-center justify-center transition-colors duration-200"
                        >
                          <IoGift className="mr-2" /> Claim Daily Reward
                        </motion.button>
                      ) : (
                        <p className="text-center text-sm sm:text-base text-gray-500 dark:text-gray-400">Daily reward already claimed</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Loading claim info...</p>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-navy-800 rounded-xl shadow-lg overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-navy-700">
                  <h3 className="text-xl font-semibold text-navy-700 dark:text-white">Referrals</h3>
                </div>
                <div className="p-4 sm:p-6">
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
                    Total Referrals: {referrals.length}
                  </p>
                  {userReferralCode ? (
                    <div className="mb-4">
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">Your Referral Code:</p>
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={userReferralCode}
                          readOnly
                          className="flex-grow p-2 border rounded-l-lg text-sm sm:text-base dark:bg-navy-700 dark:text-white dark:border-navy-600"
                        />
                        <button
                          onClick={copyReferralCode}
                          className="bg-blue-500 hover:bg-blue-600 text-white rounded-r-lg p-2 transition-colors duration-200"
                        >
                          <IoCopy size={20} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={generateReferralCode}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2 px-4 text-sm sm:text-base flex items-center justify-center mb-4 transition-colors duration-200"
                    >
                      <IoShare className="mr-2" /> Generate Referral Code
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsReferralModalOpen(true)}
                    disabled={isReferralCodeUsed}
                    className={`w-full ${isReferralCodeUsed ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'} text-white rounded-lg py-2 px-4 text-sm sm:text-base flex items-center justify-center transition-colors duration-200`}
                  >
                    <IoShare className="mr-2" /> {isReferralCodeUsed ? 'Referral Code Used' : 'Use Referral Code'}
                  </motion.button>
                </div>
              </div>
            </div>

            {predictions.length > 0 ? (
              <div className="bg-white dark:bg-navy-800 rounded-xl shadow-lg overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-navy-700">
                  <h3 className="text-xl font-semibold text-navy-700 dark:text-white">Your Predictions</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-navy-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Verdict</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-navy-600">
                      {predictions.map((prediction, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-navy-700">
                          <td className="px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">{prediction.prediction_id}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">{prediction.amount}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs sm:text-sm">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${prediction.is_chip ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                              {prediction.is_chip ? 'CHIP' : 'APT'}
                            </span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">{prediction.verdict ? 'Yes' : 'No'}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs sm:text-sm">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${prediction.outcome ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {prediction.outcome ? 'Correct' : 'Incorrect'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-white dark:bg-navy-800 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold text-navy-700 dark:text-white mb-2">No predictions made yet</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">Start making predictions to see them here!</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2 px-4 text-sm sm:text-base flex items-center justify-center mx-auto transition-colors duration-200"
                >
                  <IoAdd className="mr-2" /> Make a Prediction
                </motion.button>
              </div>
            )}
          </>
        ) : connected ? (
          <div className="text-center py-8 bg-white dark:bg-navy-800 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-navy-700 dark:text-white mb-2">No user account found</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">Create your account to start using the platform</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsModalOpen(true)}
              className="bg-green-500 hover:bg-green-600 text-white rounded-lg py-2 px-4 text-sm sm:text-base font-semibold flex items-center justify-center mx-auto transition-colors duration-200"
            >
              <IoAdd className="mr-2" /> Create Account
            </motion.button>
          </div>
        ) : (
          <div className="text-center py-8 bg-white dark:bg-navy-800 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-navy-700 dark:text-white mb-2">Wallet not connected</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">Connect your wallet to view or create your profile</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2 px-4 text-sm sm:text-base font-semibold flex items-center justify-center mx-auto transition-colors duration-200"
            >
              <IoWallet className="mr-2" /> Connect Wallet
            </motion.button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-navy-800 rounded-xl p-6 w-full max-w-sm"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-navy-700 dark:text-white">
                  {userExists ? 'Change Alias' : 'Create Account'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <IoClose size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  placeholder={userExists ? 'New Alias' : 'Choose an Alias'}
                  className="w-full p-2 border rounded-lg text-sm sm:text-base dark:bg-navy-700 dark:text-white dark:border-navy-600"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCreateOrChangeAlias}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2 px-4 text-sm sm:text-base font-semibold transition-colors duration-200"
                >
                  {userExists ? 'Change Alias' : 'Create Account'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isReferralModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-navy-800 rounded-xl p-6 w-full max-w-sm"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-navy-700 dark:text-white">
                  Use Referral Code
                </h2>
                <button onClick={() => setIsReferralModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <IoClose size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Enter referral code"
                  className="w-full p-2 border rounded-lg text-sm sm:text-base dark:bg-navy-700 dark:text-white dark:border-navy-600"
                  disabled={isReferralCodeUsed}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    handleUseReferralCode();
                    setIsReferralCodeUsed(true);
                  }}
                  disabled={isReferralCodeUsed}
                  className={`w-full ${isReferralCodeUsed ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg py-2 px-4 text-sm sm:text-base font-semibold transition-colors duration-200`}
                >
                  {isReferralCodeUsed ? 'Referral Code Used' : 'Use Referral Code'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;