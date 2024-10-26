'use client';
import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { motion } from 'framer-motion';
import { IoWallet, IoRefresh, IoRibbon, IoPencil } from 'react-icons/io5';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { PredictionsTable } from 'components/table/PredictionTable';
import Card from 'components/card';

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);
const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULEADDRESS;

const CreatedPredictionsCard = ({ predictions }) => (
  <Card extra="w-full h-full p-4 mb-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center">
        <IoPencil className="text-2xl text-brand-500 mr-2" />
        <h2 className="text-lg font-bold text-navy-700 dark:text-white">
          Created Predictions
        </h2>
      </div>
      <span className="bg-brand-50 dark:bg-navy-700 text-brand-500 dark:text-brand-400 px-3 py-1 rounded-full text-sm">
        {predictions.length} Total
      </span>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-navy-700">
            <th className="py-3 px-2 text-left text-xs font-bold text-gray-600 dark:text-white uppercase">
              Description
            </th>
            <th className="py-3 px-2 text-left text-xs font-bold text-gray-600 dark:text-white uppercase">
              Status
            </th>
            <th className="py-3 px-2 text-left text-xs font-bold text-gray-600 dark:text-white uppercase">
              Total Votes
            </th>
            <th className="py-3 px-2 text-left text-xs font-bold text-gray-600 dark:text-white uppercase">
              Pool Size
            </th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((prediction, index) => (
            <motion.tr
              key={prediction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border-b border-gray-200 dark:border-navy-700"
            >
              <td className="py-3 px-2">
                <p className="text-sm font-medium text-navy-700 dark:text-white line-clamp-1">
                  {prediction.description}
                </p>
              </td>
              <td className="py-3 px-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  prediction.state.value === 0 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : prediction.state.value === 1
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}>
                  {prediction.state.value === 0 ? 'Active' : prediction.state.value === 1 ? 'Paused' : 'Resolved'}
                </span>
              </td>
              <td className="py-3 px-2">
                <span className="text-sm font-medium text-navy-700 dark:text-white">
                  {prediction.total_votes}
                </span>
              </td>
              <td className="py-3 px-2">
                <span className="text-sm font-medium text-navy-700 dark:text-white">
                  {(Number(prediction.total_bet) / 1e8).toFixed(2)} APT
                </span>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  </Card>
);

const CreatorBadge = ({ totalPredictions }) => (
  <div className="flex items-center mt-2">
    <IoRibbon className="text-brand-500 mr-2" />
    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
      Creator • {totalPredictions} Predictions
    </span>
  </div>
);

const ProfilePage = () => {
  const { slug } = useParams();
  const { account, connected } = useWallet();
  const [userInfo, setUserInfo] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [createdPredictions, setCreatedPredictions] = useState([]);

  const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-4">
      <div className="h-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg"></div>
      <div className="h-32 bg-white dark:bg-gray-800 rounded-xl shadow-lg"></div>
    </div>
  );

  const fetchUserData = async (address) => {
    try {
      const [userInfo, predictions, creatorPreds] = await Promise.all([
        fetchUserInfo(address),
        fetchUserPredictions(address),
        fetchCreatedPredictions(address)
      ]);
      setUserInfo(userInfo);
      setPredictions(predictions);
      setCreatedPredictions(creatorPreds);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load profile data');
    }
  };

  const fetchCreatedPredictions = async (address) => {
    try {
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::hashpredictalpha::get_predictions_by_creator`,
          typeArguments: [],
          functionArguments: [address]
        }
      });
      return result[0] || [];
    } catch (error) {
      console.error('Error fetching created predictions:', error);
      return [];
    }
  };



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

              {createdPredictions.length > 0 && (
        <CreatorBadge totalPredictions={createdPredictions.length} />
      )}
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

        {createdPredictions.length > 0 && (
        <CreatedPredictionsCard predictions={createdPredictions} />
      )}

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