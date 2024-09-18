import React, { useState, useEffect } from 'react';
import { IoAdd, IoRemove, IoTimeOutline, IoWalletOutline, IoBarChartOutline, IoTrendingUpOutline, IoTrendingDownOutline, IoInformationCircleOutline, IoChevronUpOutline, IoChevronDownOutline } from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';
import LineAreaChart from 'components/charts/LineAreaChart';

const PredictionCard = ({ prediction, onPredict, userPredictions }) => {
  const [shareAmount, setShareAmount] = useState(1);
  const [isYesSelected, setIsYesSelected] = useState(true);
  const [potentialPayout, setPotentialPayout] = useState(0);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  const handleIncrement = () => setShareAmount(prev => prev + 1);
  const handleDecrement = () => setShareAmount(prev => Math.max(1, prev - 1));

  const handlePredict = () => {
    onPredict(prediction.id, isYesSelected, shareAmount);
  };

  const formatTime = (timestamp) => {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const calculatePercentage = (votes, total) => {
    return total > 0 ? (votes / total) * 100 : 50;
  };

  const yesPercentage = calculatePercentage(prediction.yes_votes, prediction.total_votes);
  const noPercentage = calculatePercentage(prediction.no_votes, prediction.total_votes);

  const isActive = prediction.state.value === 0;
  const totalApt = prediction.total_bet / 100000000;

  useEffect(() => {
    const calculatePotentialPayout = () => {
      const totalShares = parseInt(prediction.yes_votes) + parseInt(prediction.no_votes);
      const opposingShares = isYesSelected ? parseInt(prediction.no_votes) : parseInt(prediction.yes_votes);
      const winningPool = totalApt * (opposingShares / totalShares);
      const payout = (winningPool / shareAmount) + shareAmount;
      
      setPotentialPayout(Number.parseFloat(payout.toFixed(2)));
    };

    calculatePotentialPayout();
  }, [isYesSelected, shareAmount, prediction, totalApt]);

  const chartOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      type: 'datetime',
      categories: ['2018-09-19T00:00:00.000Z', '2018-09-20T00:00:00.000Z', '2018-09-21T00:00:00.000Z', '2018-09-22T00:00:00.000Z', '2018-09-23T00:00:00.000Z', '2018-09-24T00:00:00.000Z', '2018-09-25T00:00:00.000Z'],
      labels: {
        style: { colors: '#A3AED0', fontSize: '12px', fontWeight: '500' },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: '#A3AED0', fontSize: '12px', fontWeight: '500' },
      },
    },
    tooltip: { x: { format: 'dd MMM yyyy' } },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.9,
        stops: [0, 90, 100],
      },
    },
    colors: ['#4318FF', '#39B8FF'],
    grid: { show: false },
  };

  const chartData = [
    {
      name: 'Yes Votes',
      data: [31, 40, 28, 51, 42, 109, parseInt(prediction.yes_votes)],
    },
    {
      name: 'No Votes',
      data: [11, 32, 45, 32, 34, 52, parseInt(prediction.no_votes)],
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto bg-white dark:bg-navy-800 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl border border-gray-200 dark:border-navy-700">
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <h2 className="text-lg md:text-xl font-bold text-navy-700 dark:text-white truncate mr-4 mb-2 md:mb-0">{prediction.description}</h2>
        <div className="flex items-center space-x-4 text-xs md:text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center">
            <IoTimeOutline className="mr-1 md:mr-2" />
            <span>{formatTime(prediction.end_time)}</span>
          </div>
          <div className="flex items-center">
            <IoWalletOutline className="mr-1 md:mr-2" />
            <span>{totalApt.toFixed(2)} APT</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 mb-4">
        <div className="flex-grow">
          <div className="w-full bg-gray-200 dark:bg-navy-700 rounded-full h-2 md:h-3 overflow-hidden">
            <motion.div 
              className="h-full rounded-full bg-gradient-to-r from-green-400 to-brand-500 dark:from-green-500 dark:to-brand-400"
              initial={{ width: 0 }}
              animate={{ width: `${yesPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
        <span className="text-xs md:text-sm font-medium text-green-500 dark:text-green-400">{yesPercentage.toFixed(1)}%</span>
        <span className="text-xs md:text-sm font-medium text-red-500 dark:text-red-400">{noPercentage.toFixed(1)}%</span>
      </div>

      {isActive && (
        <div className="flex flex-col md:flex-row items-center justify-between mb-4 space-y-2 md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsYesSelected(true)}
              className={`py-2 px-4 md:py-2 md:px-6 rounded-lg transition-colors duration-200 text-xs md:text-sm font-medium ${
                isYesSelected 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 dark:bg-navy-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Yes
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsYesSelected(false)}
              className={`py-2 px-4 md:py-2 md:px-6 rounded-lg transition-colors duration-200 text-xs md:text-sm font-medium ${
                !isYesSelected 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-200 dark:bg-navy-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              No
            </motion.button>
          </div>
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShareAmount(prev => Math.max(1, prev - 1))}
              className="bg-gray-200 dark:bg-navy-700 text-gray-700 dark:text-gray-300 rounded-full p-1 md:p-2"
            >
              <IoRemove size={16} />
            </motion.button>
            <input 
              type="number" 
              value={shareAmount}
              onChange={(e) => setShareAmount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 md:w-16 text-center border dark:border-navy-600 rounded-lg py-1 md:py-2 bg-white dark:bg-navy-900 text-gray-700 dark:text-gray-300 text-xs md:text-sm"
            />
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShareAmount(prev => prev + 1)}
              className="bg-gray-200 dark:bg-navy-700 text-gray-700 dark:text-gray-300 rounded-full p-1 md:p-2"
            >
              <IoAdd size={16} />
            </motion.button>
          </div>
          <div className="text-xs md:text-sm font-medium w-full md:w-auto text-center md:text-left">
            <span className="text-gray-600 dark:text-gray-400">Payout: </span>
            <span className="text-brand-600 dark:text-brand-300">{potentialPayout} APT</span>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePredict}
            className="bg-gradient-to-r from-brand-400 to-brand-500 dark:from-brand-500 dark:to-brand-400 text-white rounded-lg py-2 px-4 md:px-6 transition-all duration-200 text-xs md:text-sm font-medium w-full md:w-auto"
          >
            Predict
          </motion.button>
        </div>
      )}

      <motion.button
        onClick={() => setIsInfoExpanded(!isInfoExpanded)}
        className="w-full py-2 bg-gray-100 dark:bg-navy-700 text-gray-700 dark:text-gray-300 rounded-lg flex items-center justify-center text-xs md:text-sm"
      >
        <span className="mr-1">{isInfoExpanded ? 'Hide' : 'Show'} Details</span>
        {isInfoExpanded ? <IoChevronUpOutline size={12} /> : <IoChevronDownOutline size={12} />}
      </motion.button>

      <AnimatePresence>
        {isInfoExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 text-xs md:text-sm">
              <div className="bg-gray-50 dark:bg-navy-900 p-2 md:p-3 rounded-lg">
                <p className="text-gray-600 dark:text-gray-400 mb-1">Yes Price</p>
                <p className="font-semibold text-navy-700 dark:text-white">{prediction.yes_price} APT</p>
              </div>
              <div className="bg-gray-50 dark:bg-navy-900 p-2 md:p-3 rounded-lg">
                <p className="text-gray-600 dark:text-gray-400 mb-1">No Price</p>
                <p className="font-semibold text-navy-700 dark:text-white">{prediction.no_price} APT</p>
              </div>
              <div className="bg-gray-50 dark:bg-navy-900 p-2 md:p-3 rounded-lg">
                <p className="text-gray-600 dark:text-gray-400 mb-1">Total Bet</p>
                <p className="font-semibold text-navy-700 dark:text-white">{totalApt.toFixed(2)} APT</p>
              </div>
            </div>

            <div className="h-32 md:h-48 mb-4">
              <LineAreaChart chartData={chartData} chartOptions={chartOptions} />
            </div>

            {userPredictions && userPredictions.length > 0 && (
              <div className="bg-gray-50 dark:bg-navy-900 rounded-lg p-2 md:p-4 text-xs md:text-sm">
                <h3 className="font-semibold text-navy-700 dark:text-white mb-2">Your Predictions</h3>
                {userPredictions.map((prediction, index) => (
                  <div key={index} className="text-gray-600 dark:text-gray-400 flex items-center justify-between mb-1">
                    <span className={`w-2 h-2 rounded-full mr-2 ${prediction.verdict ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span>{prediction.verdict ? 'Yes' : 'No'}</span>
                    <span>{prediction.share} shares</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
  );
};

export default PredictionCard;