import React, { useState, useEffect } from 'react';
import { IoPodium, IoPersonCircle } from 'react-icons/io5';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const TrendingDashboard = ({ predictions, onCreatorFilter }) => {
  const [trendingCreators, setTrendingCreators] = useState([]);
  const router = useRouter();
  const [selectedCreator, setSelectedCreator] = useState(null);

  useEffect(() => {
    if (predictions && predictions.length > 0) {
      // Calculate trending creators
      const creatorStats = predictions.reduce((acc, prediction) => {
        const { creator, total_votes, total_bet } = prediction;
        if (!acc[creator]) {
          acc[creator] = {
            address: creator,
            totalVotes: 0,
            totalBet: 0,
            predictionsCount: 0,
          };
        }
        acc[creator].totalVotes += Number(total_votes);
        acc[creator].totalBet += Number(total_bet);
        acc[creator].predictionsCount += 1;
        return acc;
      }, {});

      // Convert to array and get top 3
      const sortedCreators = Object.values(creatorStats)
        .sort((a, b) => b.totalVotes - a.totalVotes)
        .slice(0, 3);

      setTrendingCreators(sortedCreators);
    }
  }, [predictions]);

  const handleCreatorClick = (creator) => {
    if (selectedCreator === creator.address) {
      setSelectedCreator(null);
      onCreatorFilter(null);
    } else {
      setSelectedCreator(creator.address);
      onCreatorFilter(creator.address);
    }
  };

  const getPositionStyle = (index) => {
    switch (index) {
      case 0:
        return {
          badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
          icon: 'text-yellow-500'
        };
      case 1:
        return {
          badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
          icon: 'text-gray-500'
        };
      case 2:
        return {
          badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
          icon: 'text-orange-500'
        };
      default:
        return {
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          icon: 'text-blue-500'
        };
    }
  };

  return (
    <div className="mb-8">
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-lg p-4">
        <div className="flex items-center mb-4">
          <IoPodium className="text-2xl text-brand-500 mr-2" />
          <h2 className="text-lg font-semibold text-navy-700 dark:text-white">
            Top Creators
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trendingCreators.map((creator, index) => (
            <motion.div
              key={creator.address}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                relative flex items-center justify-between p-4 rounded-lg
                ${selectedCreator === creator.address ? 
                  'ring-2 ring-brand-500 bg-brand-50 dark:bg-navy-900' : 
                  'bg-gray-50 dark:bg-navy-900 hover:bg-gray-100 dark:hover:bg-navy-800'}
                cursor-pointer transition-all duration-200
              `}
              onClick={() => handleCreatorClick(creator)}
            >
              {/* Position Badge */}
              <div className={`absolute -top-2 -left-2 w-8 h-8 rounded-full ${getPositionStyle(index).badge} 
                flex items-center justify-center text-lg font-bold shadow-lg`}>
                {index + 1}
              </div>

              {/* Creator Info */}
              <div className="flex items-center ml-6">
                <div>
                  <Link 
                    href={`/hub/profile/${creator.address}`}
                    className="text-sm font-medium text-navy-700 dark:text-white hover:text-brand-500 
                      dark:hover:text-brand-400 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {creator.address.slice(0, 6)}...{creator.address.slice(-4)}
                  </Link>
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span className="mr-2">{creator.predictionsCount} predictions</span>
                    <span>{creator.totalVotes} votes</span>
                  </div>
                </div>
              </div>

              {/* Filter Icon */}
              <IoPersonCircle 
                className={`text-xl ${
                  selectedCreator === creator.address ? 
                  'text-brand-500' : 
                  'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                } transition-colors`}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrendingDashboard;