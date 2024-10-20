'use client'
import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { motion } from 'framer-motion';
import { MdOutlineStar, MdArrowUpward, MdArrowDownward } from 'react-icons/md';
import Card from 'components/card';
import { useRouter } from 'next/navigation';
const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULEADDRESS;
const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

interface LeaderboardEntry {
  user_address: string;
  score: number;
  alias?: string;
}

const LeaderboardTable: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardType, setLeaderboardType] = useState<'daily' | 'weekly' | 'all_time'>('daily');
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });
  const { account } = useWallet();
const router = useRouter();
  useEffect(() => {
    fetchLeaderboard();
  }, [leaderboardType]);

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
      
      const leaderboardData: LeaderboardEntry[] = result[0].map((entry: any) => ({
        user_address: entry.user_address,
        score: Number(entry.score),
      }));

      // Fetch aliases for each user
      const leaderboardWithAliases = await Promise.all(
        leaderboardData.map(async (entry) => {
          const userInfo = await fetchUserInfo(entry.user_address);
          return { ...entry, alias: userInfo.alias };
        })
      );

      setLeaderboard(leaderboardWithAliases);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserInfo = async (address: string) => {
    try {
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::user_account::get_user_info`,
          typeArguments: [],
          functionArguments: [address]
        }
      });
      return {
        alias: result[0].toString(),
        // ... other user info if needed
      };
    } catch (error) {
      console.error('Error fetching user info:', error);
      return { alias: 'Unknown' };
    }
  };

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };


  const navigateToProfile = (address: string) => {
    router.push(`/hub/profile/${address}`);
  };
  const sortedLeaderboard = React.useMemo(() => {
    const sortableLeaderboard = [...leaderboard];
    if (sortConfig.key) {
      sortableLeaderboard.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableLeaderboard;
  }, [leaderboard, sortConfig]);

  return (
    <Card extra="w-full h-full p-4">
      <div className="relative flex flex-col sm:flex-row items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-navy-700 dark:text-white mb-2 sm:mb-0">
          User Leaderboard
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setLeaderboardType('daily')}
            className={`px-3 py-1 rounded-full text-sm ${
              leaderboardType === 'daily'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-200 dark:bg-navy-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setLeaderboardType('weekly')}
            className={`px-3 py-1 rounded-full text-sm ${
              leaderboardType === 'weekly'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-200 dark:bg-navy-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setLeaderboardType('all_time')}
            className={`px-3 py-1 rounded-full text-sm ${
              leaderboardType === 'all_time'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-200 dark:bg-navy-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px]">
            <thead>
              <tr className="border-b border-gray-200 dark:border-navy-700">
                <th className="py-3 px-2 text-left">
                  <button
                    onClick={() => handleSort('score')}
                    className="flex items-center text-xs font-bold text-gray-600 dark:text-white uppercase"
                  >
                    Rank
                    {sortConfig.key === 'score' && (
                      sortConfig.direction === 'asc' ? <MdArrowUpward className="ml-1" /> : <MdArrowDownward className="ml-1" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-2 text-left">
                  <span className="text-xs font-bold text-gray-600 dark:text-white uppercase">User</span>
                </th>
                <th className="py-3 px-2 text-left">
                  <button
                    onClick={() => handleSort('score')}
                    className="flex items-center text-xs font-bold text-gray-600 dark:text-white uppercase"
                  >
                    Score
                    {sortConfig.key === 'score' && (
                      sortConfig.direction === 'asc' ? <MdArrowUpward className="ml-1" /> : <MdArrowDownward className="ml-1" />
                    )}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLeaderboard.map((entry, index) => (
                <motion.tr
                  key={entry.user_address}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`border-b border-gray-200 dark:border-navy-700 ${
                    account?.address === entry.user_address ? 'bg-brand-50 dark:bg-brand-900' : ''
                  }`}
                >
                  <td className="py-3 px-2">
                    <span className="text-sm font-bold text-navy-700 dark:text-white">
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center">
                      <span onClick={() => navigateToProfile(entry.user_address)}
className="text-sm font-bold text-navy-700 dark:text-white mr-2">
                        {entry.alias || `${entry.user_address.slice(0, 6)}...${entry.user_address.slice(-4)}`}
                      </span>
                      {account?.address === entry.user_address && (
                        <span className="bg-brand-500 text-white text-xs px-2 py-1 rounded-full">You</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center">
                      <MdOutlineStar className="mr-1 text-yellow-500" />
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
      )}
    </Card>
  );
};

export default LeaderboardTable;