'use client';
import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { motion } from 'framer-motion';
import { IoWallet, IoRefresh } from 'react-icons/io5';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { PredictionsTable } from 'components/table/PredictionTable';

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);
const MODULE_ADDRESS = '0xae2ebac0c8ffb7be58f7b661b80a21c7555363384914e2a1ebb5bd86aeedccf7';

const ProfilePage = () => {
  const { slug } = useParams();
  const { account, connected } = useWallet();
  const [userInfo, setUserInfo] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-4">
      <div className="h-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg"></div>
      <div className="h-32 bg-white dark:bg-gray-800 rounded-xl shadow-lg"></div>
    </div>
  );
  useEffect(() => {
    const initProfile = async () => {
      setIsLoading(true);
      if (slug) {
        // Validate if the slug is a valid Aptos address
        try {
          const profileAddress = slug.toString();
          const exists = await checkUserExists(profileAddress);
          if (exists) {
            await fetchUserData(profileAddress);
            setIsOwner(connected && account?.address === profileAddress);
          } else {
            toast.error('Profile not found');
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Error loading profile:', error);
          toast.error('Invalid profile address');
          setIsLoading(false);
        }
      } else if (connected && account) {
        // Load own profile if no slug
        const exists = await checkUserExists(account.address);
        if (exists) {
          await fetchUserData(account.address);
          setIsOwner(true);
        }
      }
      setIsLoading(false);
    };

    initProfile();
  }, [slug, account, connected]);

  const checkUserExists = async (address: string) => {
    try {
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::user_account::has_claimed_account`,
          typeArguments: [],
          functionArguments: [address]
        }
      });
      return result[0];
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  };

  const fetchUserData = async (address: string) => {
    try {
      const [userInfo, predictions] = await Promise.all([
        fetchUserInfo(address),
        fetchUserPredictions(address)
      ]);
      setUserInfo(userInfo);
      setPredictions(predictions);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load profile data');
    }
  };

  const fetchUserInfo = async (address: string) => {
    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::user_account::get_user_info`,
        typeArguments: [],
        functionArguments: [address]
      }
    });
    
    return {
      alias: result[0].toString(),
      apt_balance: (Number(result[1])/1e8).toString(),
      chip_balance: (Number(result[2])/1e8).toString(),
      rank: result[3].toString(),
      reputation: result[4].toString(),
      total_predictions: result[5].toString(),
      correct_predictions: result[6].toString(),
    };
  };

  const fetchUserPredictions = async (address: string) => {
    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::user_account::get_user_predictions`,
        typeArguments: [],
        functionArguments: [address]
      }
    });

    return result[0].map((prediction: any) => ({
      prediction_id: prediction.prediction_id.toString(),
      amount: (Number(prediction.amount)/1e8).toString(),
      is_chip: prediction.is_chip,
      verdict: prediction.verdict,
      outcome: prediction.outcome,
    }));
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!userInfo) {
    return <ProfileNotFound />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br bg-blue-50 dark:bg-navy-900 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white dark:bg-navy-800 rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="relative h-32 sm:h-48 bg-gradient-to-r from-indigo-500 to-purple-600">
            <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
              <Image
                width={96}
                height={96}
                className="rounded-full border-4 border-white dark:border-gray-700"
                src={`https://robohash.org/${userInfo.alias}.png`}
                alt="User Avatar"
              />
            </div>
          </div>
          <div className="pt-20 px-4 sm:px-6 pb-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {userInfo.alias}
            </h2>

          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Rank"
            value={userInfo.rank}
            isPrivate={false}
          />
          <StatCard
            title="Reputation"
            value={userInfo.reputation}
            isPrivate={false}
          />
          <StatCard
            title="Total Predictions"
            value={userInfo.total_predictions}
            isPrivate={false}
          />
          <StatCard
            title="Correct Predictions"
            value={userInfo.correct_predictions}
            isPrivate={false}
          />
          {isOwner && (
            <>
              <StatCard
                title="APT Balance"
                value={userInfo.apt_balance}
                isPrivate={true}
              />
              <StatCard
                title="CHIP Balance"
                value={userInfo.chip_balance}
                isPrivate={true}
              />
            </>
          )}
        </div>

        {/* Predictions Table */}
        <PredictionsTable predictions={predictions}/>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, isPrivate }) => (
  <div className="bg-white dark:bg-navy-800 rounded-xl shadow-lg p-4">
    <h3 className="text-sm text-gray-500 dark:text-gray-400">{title}</h3>
    <p className="text-xl font-bold text-gray-900 dark:text-white">
      {isPrivate ? '••••' : value}
    </p>
  </div>
);

const ProfileNotFound = () => (
  <div className="min-h-screen bg-gradient-to-br bg-blue-50 dark:bg-navy-900 p-4 flex items-center justify-center">
    <div className="bg-white dark:bg-navy-800 rounded-xl shadow-lg p-8 text-center">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Profile Not Found</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">The requested profile does not exist or has not been created yet.</p>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => window.history.back()}
        className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg py-2 px-4"
      >
        Go Back
      </motion.button>
    </div>
  </div>
);

export default ProfilePage;