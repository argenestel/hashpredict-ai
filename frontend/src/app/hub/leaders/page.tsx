'use client'
import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { motion, AnimatePresence } from 'framer-motion';
import { MdOutlineStar, MdArrowUpward, MdArrowDownward } from 'react-icons/md';
import { IoPodium, IoTrophy, IoMedal } from 'react-icons/io5';
import Card from 'components/card';
import { useRouter } from 'next/navigation';

const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULEADDRESS;
const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

const TopThreePodium = ({ winners, onUserClick }) => {
  const positions = [1, 0, 2]; // Order for visual layout: 2nd, 1st, 3rd

  return (
    <div className="flex justify-center items-end mb-8 mt-4 space-x-4">
      {positions.map((position) => {
        const winner = winners[position];
        if (!winner) return null;

        const getPodiumStyle = (pos) => {
          switch (pos) {
            case 0:
              return {
                height: 'h-32',
                icon: <IoTrophy className="text-yellow-500 text-2xl" />,
                bg: 'bg-gradient-to-b from-yellow-100 to-yellow-50 dark:from-yellow-900 dark:to-navy-800',
                border: 'border-yellow-300 dark:border-yellow-700'
              };
            case 1:
              return {
                height: 'h-24',
                icon: <IoMedal className="text-gray-400 text-2xl" />,
                bg: 'bg-gradient-to-b from-gray-100 to-gray-50 dark:from-gray-800 dark:to-navy-800',
                border: 'border-gray-300 dark:border-gray-700'
              };
            case 2:
              return {
                height: 'h-20',
                icon: <IoMedal className="text-orange-500 text-2xl" />,
                bg: 'bg-gradient-to-b from-orange-100 to-orange-50 dark:from-orange-900 dark:to-navy-800',
                border: 'border-orange-300 dark:border-orange-700'
              };
            default:
              return {};
          }
        };

        const style = getPodiumStyle(position);

        return (
          <motion.div
            key={position}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: position * 0.2 }}
            className={`relative flex flex-col items-center ${style.height} w-28`}
          >
            <div 
              className={`absolute bottom-0 w-full ${style.height} ${style.bg} 
                border-2 ${style.border} rounded-t-lg cursor-pointer
                transform transition-transform hover:scale-105`}
              onClick={() => onUserClick(winner.user_address)}
            >
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                {style.icon}
              </div>
              <div className="absolute top-6 left-0 right-0 flex flex-col items-center px-2">
                <span className="text-sm font-bold text-navy-700 dark:text-white truncate w-full text-center">
                  {winner.alias || `${winner.user_address.slice(0, 4)}...${winner.user_address.slice(-4)}`}
                </span>
                <div className="flex items-center mt-2">
                  <MdOutlineStar className="text-yellow-500 mr-1" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {winner.score.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

const LeaderboardTable = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardType, setLeaderboardType] = useState('daily');
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });
  const { account } = useWallet();
  const router = useRouter();

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::user_account::get_${leaderboardType}_leaderboard`,
          typeArguments: [],
          functionArguments: []
        }
      });
      
      const leaderboardData = await Promise.all(
        result[0].map(async (entry) => ({
          user_address: entry.user_address,
          score: Number(entry.score),
          alias: (await fetchUserInfo(entry.user_address)).alias
        }))
      );

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserInfo = async (address) => {
    try {
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::user_account::get_user_info`,
          typeArguments: [],
          functionArguments: [address]
        }
      });
      return { alias: result[0].toString() };
    } catch (error) {
      console.error('Error fetching user info:', error);
      return { alias: null };
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [leaderboardType]);

  const navigateToProfile = (address) => {
    router.push(`/hub/profile/${address}`);
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc'
    });
  };

  const sortedLeaderboard = React.useMemo(() => {
    return [...leaderboard].sort((a, b) => {
      const modifier = sortConfig.direction === 'asc' ? 1 : -1;
      return (a[sortConfig.key] - b[sortConfig.key]) * modifier;
    });
  }, [leaderboard, sortConfig]);

  const top3 = sortedLeaderboard.slice(0, 3);
  const restOfLeaderboard = sortedLeaderboard.slice(3);

  return (
    <Card extra="w-full h-full p-4">
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <IoPodium className="text-2xl text-brand-500 mr-2" />
            <h2 className="text-xl font-bold text-navy-700 dark:text-white">
              Leaderboard
            </h2>
          </div>
          <div className="flex space-x-2">
            {['daily', 'weekly', 'all_time'].map((type) => (
              <motion.button
                key={type}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setLeaderboardType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${leaderboardType === type
                    ? 'bg-brand-500 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-navy-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-navy-600'
                  }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
              </motion.button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
          </div>
        ) : (
          <>
            <TopThreePodium winners={top3} onUserClick={navigateToProfile} />
            
            <div className="overflow-x-auto mt-8">
              <table className="w-full">
                <tbody>
                  {restOfLeaderboard.map((entry, index) => (
                    <motion.tr
                      key={entry.user_address}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`border-b border-gray-100 dark:border-navy-700
                        ${account?.address === entry.user_address ? 'bg-brand-50 dark:bg-navy-800' : ''}`}
                    >
                      <td className="py-4 pl-4 pr-2 w-16">
                        <span className="text-lg font-bold text-gray-500 dark:text-gray-400">
                          {index + 4}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        <div 
                          className="flex items-center cursor-pointer"
                          onClick={() => navigateToProfile(entry.user_address)}
                        >
                          <span className="text-sm font-semibold text-navy-700 dark:text-white">
                            {entry.alias || `${entry.user_address.slice(0, 6)}...${entry.user_address.slice(-4)}`}
                          </span>
                          {account?.address === entry.user_address && (
                            <span className="ml-2 px-2 py-1 text-xs font-medium text-white bg-brand-500 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <div className="flex items-center justify-end">
                          <MdOutlineStar className="text-yellow-500 mr-1" />
                          <span className="text-sm font-bold text-navy-700 dark:text-white">
                            {entry.score.toLocaleString()}
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

export default LeaderboardTable;