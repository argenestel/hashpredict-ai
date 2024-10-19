import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { IoClose, IoInformationCircle, IoTimeOutline, IoWalletOutline, IoSwapHorizontal, IoTrendingUp, IoTrendingDown } from 'react-icons/io5';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import axios from 'axios';
import { useMotionValue, useTransform } from 'framer-motion';

const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULEADDRESS;
const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

const SLIDER_WIDTH = 300;
const THUMB_WIDTH = 60;
const CONFIRMATION_THRESHOLD = 0.8;

const PredictionDetailModal = ({ isOpen, onClose, predictionId }) => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showUSD, setShowUSD] = useState(true);
  const [aptPrice, setAptPrice] = useState(0);
  const [shareAmount, setShareAmount] = useState(1);
  const [useChips, setUseChips] = useState(false);
  const [predictionMade, setPredictionMade] = useState(null);

  const { account, signAndSubmitTransaction } = useWallet();
  const sliderRef = useRef(null);
  const x = useMotionValue(0);
  const controls = useAnimation();

  const xInput = [-SLIDER_WIDTH / 2 + THUMB_WIDTH / 2, 0, SLIDER_WIDTH / 2 - THUMB_WIDTH / 2];
  const background = useTransform(x, xInput, [
    "linear-gradient(90deg, #ef4444 0%, #ef4444 100%)",
    "linear-gradient(90deg, #ef4444 0%, #22c55e 100%)",
    "linear-gradient(90deg, #22c55e 0%, #22c55e 100%)"
  ]);

  useEffect(() => {
    fetchAptPrice();
    fetchPrediction();
  }, [isOpen, predictionId]);

  const fetchAptPrice = async () => {
    try {
      const response = await axios.get('https://hermes.pyth.network/api/latest_price_feeds', {
        params: {
          ids: ['0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5']
        }
      });
      const priceData = response.data[0].price;
      const price = Number(priceData.price) * Math.pow(10, priceData.expo);
      setAptPrice(price);
    } catch (error) {
      console.error('Error fetching APT price:', error);
    }
  };

  const fetchPrediction = async () => {
    if (!isOpen) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::hashpredictalpha::get_prediction`,
          typeArguments: [],
          functionArguments: [predictionId]
        }
      });
      setPrediction(result[0]);
    } catch (err) {
      console.error('Error fetching prediction:', err);
      setError('Failed to fetch prediction details');
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async (verdict) => {
    if (!account) {
      console.error('Wallet not connected');
      return;
    }

    try {
      await signAndSubmitTransaction({
        data: {
          function: `${MODULE_ADDRESS}::hashpredictalpha::predict`,
          typeArguments: [],
          functionArguments: [predictionId, verdict, shareAmount, useChips]
        },
      });
      console.log('Prediction made successfully');
      // You might want to update the UI or fetch the prediction again here
    } catch (error) {
      console.error('Error making prediction:', error);
    }
  };

  const handleDragEnd = () => {
    const xValue = x.get();
    const threshold = (SLIDER_WIDTH / 2 - THUMB_WIDTH / 2) * CONFIRMATION_THRESHOLD;
    
    if (xValue < -threshold) {
      handlePredict(false);
      setPredictionMade(false);
      controls.start({ x: -SLIDER_WIDTH / 2 + THUMB_WIDTH / 2 });
    } else if (xValue > threshold) {
      handlePredict(true);
      setPredictionMade(true);
      controls.start({ x: SLIDER_WIDTH / 2 - THUMB_WIDTH / 2 });
    } else {
      controls.start({ x: 0 });
    }
  };

  const resetPrediction = () => {
    setPredictionMade(null);
    controls.start({ x: 0 });
  };

  const formatPrice = (amount) => {
    const aptAmount = Number(amount) / 1e8;
    if (showUSD) {
      const usdAmount = aptAmount * aptPrice;
      return `$${usdAmount.toFixed(2)}`;
    } else {
      return `${aptAmount.toFixed(2)} APT`;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const calculatePercentage = (votes, total) => {
    const votesNum = Number(votes) || 0;
    const totalNum = Number(total) || 0;
    return totalNum > 0 ? (votesNum / totalNum) * 100 : 50;
  };

  if (!isOpen || !prediction) return null;

  const { id, description, end_time, state, yes_votes, no_votes, yes_price, no_price, total_bet, total_votes, result, tags } = prediction;
  const yesPercentage = calculatePercentage(yes_votes, total_votes);
  const noPercentage = calculatePercentage(no_votes, total_votes);
  const stateValue = typeof state === 'object' && state !== null ? state.value : (typeof state === 'number' ? state : 0);
  const isActive = stateValue === 0;
  const isFinalized = stateValue === 2;
  const isCancelled = stateValue === 1;

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="bg-white dark:bg-navy-800 rounded-xl shadow-lg overflow-hidden w-full max-w-md"
          >
            {loading ? (
              <div className="p-6">
                <p className="text-gray-600 dark:text-gray-300">Loading prediction details...</p>
              </div>
            ) : error ? (
              <div className="p-6">
                <p className="text-red-500">{error}</p>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="p-6 flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="font-bold text-navy-700 dark:text-white text-sm line-clamp-4 flex-grow mr-2">
                      {description}
                    </h2>
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-brand-500 hover:text-brand-600 transition-colors"
                    >
                      <IoInformationCircle size={24} />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between mb-6 text-xs text-gray-600 dark:text-gray-400 gap-2">
                    <div className="flex items-center bg-gray-100 dark:bg-navy-700 rounded-full px-3 py-1">
                      <IoTimeOutline className="mr-2 text-brand-500" />
                      <span>Ends: {formatTime(end_time)}</span>
                    </div>
                    <div className="flex items-center bg-brand-100 dark:bg-brand-900 rounded-full px-3 py-1">
                      <IoWalletOutline className="mr-2 text-brand-500" />
                      <span className="font-semibold text-brand-700 dark:text-brand-300">
                        Pool: {formatPrice(total_bet)}
                      </span>
                      <button 
                        onClick={() => setShowUSD(!showUSD)} 
                        className="ml-2 text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
                      >
                        <IoSwapHorizontal />
                      </button>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-green-500 dark:text-green-400 flex items-center">
                        <IoTrendingUp className="mr-1" />
                        Yes: {yesPercentage.toFixed(1)}%
                      </span>
                      <span className="text-sm font-medium text-red-500 dark:text-red-400 flex items-center">
                        <IoTrendingDown className="mr-1" />
                        No: {noPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-navy-700 rounded-full h-3 overflow-hidden relative">
                      <div 
                        className="absolute left-0 h-full rounded-full bg-gradient-to-r from-green-400 to-brand-500 dark:from-green-500 dark:to-brand-400"
                        style={{ width: `${yesPercentage}%` }}
                      />
                      <div 
                        className="absolute right-0 h-full rounded-full bg-gradient-to-l from-red-400 to-brand-400 dark:from-red-500 dark:to-brand-300"
                        style={{ width: `${noPercentage}%` }}
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <div className="mb-4 flex flex-wrap gap-2">
                          {tags.map((tag, index) => (
                            <span key={index} className="bg-gray-200 dark:bg-navy-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
                          <div className="bg-gray-50 dark:bg-navy-900 rounded-lg p-3">
                            <p className="font-semibold mb-1">Yes Votes: {Number(yes_votes).toLocaleString()}</p>
                            <p>Yes Price: {formatPrice(yes_price)}</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-navy-900 rounded-lg p-3">
                            <p className="font-semibold mb-1">No Votes: {Number(no_votes).toLocaleString()}</p>
                            <p>No Price: {formatPrice(no_price)}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-navy-700 dark:text-white flex items-center text-sm font-medium">
                            Status: 
                            <span className={`ml-2 px-2 py-1 rounded-full ${
                              isActive ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                              isFinalized ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                              'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                            }`}>
                              {isActive ? 'Active' : isFinalized ? 'Finalized' : 'Cancelled'}
                            </span>
                          </div>
                        </div>

                        {isFinalized && (
                          <p className="text-navy-700 dark:text-white mt-4 text-sm font-medium">
                            Result: 
                            <span className={`ml-2 px-2 py-1 rounded-full ${
                              result === 0 ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                              result === 1 ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                            }`}>
                              {result === 0 ? 'Yes' : result === 1 ? 'No' : 'Undefined'}
                            </span>
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {isActive && (
                  <div className="p-6 bg-gray-50 dark:bg-navy-900 border-t border-gray-200 dark:border-navy-700">
<div className="mb-6 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Prediction Amount:
                      </span>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => setShareAmount(prev => Math.max(0.1, prev - 0.1))}
                          className="bg-gray-200 dark:bg-navy-700 text-gray-700 dark:text-gray-300 rounded-full p-2 hover:bg-gray-300 dark:hover:bg-navy-600 transition-colors"
                        >
                          -
                        </button>
                        <input 
                          type="number" 
                          value={shareAmount}
                          onChange={(e) => setShareAmount(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                          className="w-20 text-center border dark:border-navy-600 rounded-lg py-2 bg-white dark:bg-navy-900 text-gray-700 dark:text-gray-300 text-sm"
                          step="0.1"
                        />
                        <button 
                          onClick={() => setShareAmount(prev => prev + 0.1)}
                          className="bg-gray-200 dark:bg-navy-700 text-gray-700 dark:text-gray-300 rounded-full p-2 hover:bg-gray-300 dark:hover:bg-navy-600 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center mb-6" ref={sliderRef}>
                      <motion.div
                        style={{ background, width: SLIDER_WIDTH }}
                        className="h-10 rounded-full relative flex items-center justify-center cursor-pointer shadow-inner"
                      >
                        <motion.div
                          className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg"
                          drag="x"
                          dragConstraints={sliderRef}
                          dragElastic={0.1}
                          dragMomentum={false}
                          onDrag={(_, info) => x.set(info.offset.x)}
                          onDragEnd={handleDragEnd}
                          animate={controls}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {predictionMade === null ? '?' : predictionMade ? 'Yes' : 'No'}
                        </motion.div>
                        <div className="absolute inset-0 flex justify-between items-center px-6 text-white font-semibold pointer-events-none">
                          <span>No</span>
                          <span>Yes</span>
                        </div>
                      </motion.div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <label className="inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={useChips}
                          onChange={() => setUseChips(!useChips)}
                          className="form-checkbox h-5 w-5 text-brand-500 rounded border-gray-300 focus:ring-brand-500 dark:border-gray-600 dark:bg-navy-900 dark:focus:ring-brand-400"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Use CHIP tokens</span>
                      </label>
                      {predictionMade !== null && (
                        <button
                          onClick={resetPrediction}
                          className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                        >
                          Reset Prediction
                        </button>
                      )}
                    </div>
                    
                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                      {predictionMade === null 
                        ? "Slide to confirm your prediction" 
                        : `You predicted: ${predictionMade ? "Yes" : "No"}`}
                    </p>
                  </div>
                )}

                <div className="p-4 bg-gray-50 dark:bg-navy-900 border-t border-gray-200 dark:border-navy-700 flex justify-end">
                  <button
                    onClick={onClose}
                    className="bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2 px-4 text-sm font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const PredictionsTable = ({ predictions }) => {
    const [selectedPredictionId, setSelectedPredictionId] = useState(null);
  
    const openPredictionDetails = (predictionId) => {
      setSelectedPredictionId(predictionId);
    };
  
    const closePredictionDetails = () => {
      setSelectedPredictionId(null);
    };
  
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Predictions Participated</h3>
        </div>
        {predictions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Verdict</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {predictions.map((prediction, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">{prediction.prediction_id}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">{prediction.amount}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs sm:text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${prediction.is_chip ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {prediction.is_chip ? 'CHIP' : 'APT'}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">{prediction.verdict ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs sm:text-sm">
                      <button
                        onClick={() => openPredictionDetails(prediction.prediction_id)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        <IoInformationCircle size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">No predictions made yet</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">Start making predictions to see them here!</p>
          </div>
        )}
  
        <PredictionDetailModal
          isOpen={selectedPredictionId !== null}
          onClose={closePredictionDetails}
          predictionId={selectedPredictionId}
        />
      </div>
    );
  };
  
  export default PredictionsTable;