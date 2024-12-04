'use client'
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { motion, AnimatePresence } from 'framer-motion';
import { IoAdd, IoClose, IoDownload, IoLink, IoRefresh, IoBulb, IoWater, IoCloseCircleOutline, IoFilter, IoChevronUp, IoChevronDown, IoPersonAdd, IoTime } from 'react-icons/io5';
import PredictionCard from 'components/card/PredictionCard';
import toast, { Toaster } from "react-hot-toast";
import { AliasModal } from '../profile/page';
import InstallPrompt from 'components/card/InstallPrompt';
import TrendingDashboard from 'components/admin/TrendingDashboard';
import {CreatorBanner} from 'components/admin/banner';
const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULEADDRESS;
const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

interface PredictionData {
  id: string;
  description: string;
  end_time: string;
  start_time: string;
  state: { value: number };
  yes_votes: string;
  no_votes: string;
  yes_price: string;
  no_price: string;
  total_bet: string;
  total_votes: string;
  result: number;
  tags: string[];
  prediction_type: number;
  options_count: number;
  creator: string;
}

const Dashboard = () => {
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAliasOpen, setIsAliasModalOpen] = useState(false);
  const [isGeneratePopupOpen, setIsGeneratePopupOpen] = useState(false);
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [isCreatorRole, setIsCreatorRole] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [generatedPredictions, setGeneratedPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [newPrediction, setNewPrediction] = useState({
    description: '',
    duration: '',
    tags: '',
    prediction_type: 0,
    options_count: 2,
  });
  const [userExists, setUserExists] = useState(false);
  const [newAlias, setNewAlias] = useState('');
  const [showFinalizedExpired, setShowFinalizedExpired] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState(null);


  const checkUserRoles = useCallback(async () => {
    if (connected && account) {
      try {
        const [adminResult, creatorResult] = await Promise.all([
          aptos.view({
            payload: {
              function: `${MODULE_ADDRESS}::role_manager::is_admin`,
              typeArguments: [],
              functionArguments: [account.address]
            }
          }),
          aptos.view({
            payload: {
              function: `${MODULE_ADDRESS}::role_manager::is_creator`,
              typeArguments: [],
              functionArguments: [account.address]
            }
          })
        ]);
        setIsAdminRole(adminResult[0]);
        setIsCreatorRole(creatorResult[0]);
      } catch (error) {
        console.error('Error checking user roles:', error);
      }
    }
  }, [connected, account]);

  const toggleFilterVisibility = () => {
    setIsFilterVisible(!isFilterVisible);
  };

  const checkUserExists = useCallback(async () => {
    if (!account) return;
    setIsLoading(true);
    try {
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::user_account::has_claimed_account`,
          typeArguments: [],
          functionArguments: [account.address]
        }
      });
      setUserExists(result[0]);
      if (!result[0]) {
        setIsAliasModalOpen(true);
      }
    } catch (error) {
      console.error('Error checking user existence:', error);
    } finally {
      setIsLoading(false);
    }
  }, [account]);

  const fetchPredictions = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::hashpredictalpha::get_all_predictions`,
          typeArguments: [],
          functionArguments: []
        }
      });
  
      let predictionsArray = Array.isArray(result) && result.length === 1 && Array.isArray(result[0]) ? result[0] : result;
  
      if (!Array.isArray(predictionsArray)) {
        console.error('Expected an array of predictions, but received:', typeof predictionsArray);
        setPredictions([]);
        return;
      }
  
      const processedPredictions: PredictionData[] = await Promise.all(predictionsArray.map(async (prediction: any) => {
        const creatorResult = await aptos.view({
          payload: {
            function: `${MODULE_ADDRESS}::hashpredictalpha::get_prediction_creator`,
            typeArguments: [],
            functionArguments: [prediction.id]
          }
        });
  
        // Ensure the creator is converted to a string
        const creator = Array.isArray(creatorResult) && creatorResult.length > 0
          ? creatorResult[0].toString()
          : 'Unknown';
  
        return {
          id: prediction.id?.toString() ?? '',
          description: prediction.description?.toString() ?? '',
          end_time: prediction.end_time?.toString() ?? '',
          start_time: prediction.start_time?.toString() ?? '',
          state: { value: Number(prediction.state?.value ?? 0) },
          yes_votes: prediction.yes_votes?.toString() ?? '0',
          no_votes: prediction.no_votes?.toString() ?? '0',
          yes_price: prediction.yes_price?.toString() ?? '0',
          no_price: prediction.no_price?.toString() ?? '0',
          total_bet: prediction.total_bet?.toString() ?? '0',
          total_votes: prediction.total_votes?.toString() ?? '0',
          result: Number(prediction.result ?? 0),
          tags: prediction.tags?.map((tag: any) => tag.toString()) ?? [],
          prediction_type: Number(prediction.prediction_type ?? 0),
          options_count: Number(prediction.options_count ?? 2),
          creator: creator
        };
      }));
  
      setPredictions(processedPredictions);
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUserRoles();
    fetchPredictions();
    checkUserExists();
  }, [account, checkUserRoles, fetchPredictions, checkUserExists]);

  useEffect(() => {
    if (predictions.length > 0) {
      const tags = Array.from(new Set(predictions.flatMap(p => p.tags)));
      setAllTags(tags);
    }
  }, [predictions]);

  const handleCreateOrChangeAlias = async () => {
    if (!connected || !account) {
      toast.error('Wallet not connected');
      return;
    }
    try{
     handleRequestFunds();  
    }
    catch (e){
      toast.error("Issue with faucet");
    }
    try {
      await signAndSubmitTransaction({
        data: {
          function: `${MODULE_ADDRESS}::user_account::register_user`,
          typeArguments: [],
          functionArguments: [newAlias]
        },
      });
      toast.success(userExists ? 'Alias changed successfully' : 'Account created successfully');

      await checkUserExists();
      setIsAliasModalOpen(false);
    } catch (error) {
      console.error('Error creating/changing alias:', error);
      toast.error(userExists ? 'Failed to change alias' : 'Failed to create account');
    }
  };

  const handleRequestFunds = async () => {
    if (!connected || !account) {
      toast.error('Wallet not connected');
      return;
    }

    try {
      const response = await axios.post(process.env.NEXT_PUBLIC_FAUCET_URL + '/mint', null, {
        params: {
          amount: 10000000,
          address: account.address,
        },
      });
      toast.success('Funds requested successfully');
      console.log('Funds requested:', response.data, account.address);
    } catch (error) {
      toast.error('Error requesting funds. Please try again.');
      console.error('Error requesting funds:', error);
    }
  };

  const handlePredict = async (id: string, verdict: boolean, share: number, useChip: boolean) => {
    if (!connected || !account) {
      console.error('Wallet not connected');
      return;
    }

    try {
      await signAndSubmitTransaction({
        data: {
          function: `${MODULE_ADDRESS}::hashpredictalpha::predict`,
          typeArguments: [],
          functionArguments: [id, verdict, share, useChip] // Convert share to correct units
        },
      });
      fetchPredictions();
      toast.success('Prediction made successfully');
    } catch (error) {
      console.error('Error making prediction:', error);
      toast.error('Failed to make prediction');
    }
  };

  const handleCreatePrediction = async () => {
    if (!connected || !account || !isCreatorRole) {
      console.error('Not authorized to create prediction');
      return;
    }

    try {
      const tags = Array.isArray(newPrediction.tags) 
        ? newPrediction.tags 
        : newPrediction.tags.split(',').map(tag => tag.trim());

      await signAndSubmitTransaction({
        data: {
          function: `${MODULE_ADDRESS}::hashpredictalpha::create_prediction`,
          typeArguments: [],
          functionArguments: [
            newPrediction.description,
            parseInt(newPrediction.duration),
            tags,
            newPrediction.prediction_type,
            newPrediction.options_count
          ]
        },
      });
      setIsModalOpen(false);
      fetchPredictions();
      setNewPrediction({
        description: '',
        duration: '',
        tags: '',
        prediction_type: 0,
        options_count: 2,
      });
      toast.success('Prediction created successfully');
    } catch (error) {
      console.error('Error creating prediction:', error);
      toast.error('Failed to create prediction. Please try again.');
    }
  };

  const clearAllTags = () => {
    setSelectedTags([]);
  };

  const handleSelectPrediction = (prediction: any) => {
    setNewPrediction({
      description: prediction.description,
      duration: prediction.duration.toString(),
      tags: prediction.tags,
      prediction_type: 0,
      options_count: 2,
    });
    setIsGeneratePopupOpen(false);
    setIsModalOpen(true);
  };

  const handleGeneratePredictions = async () => {
    setIsGenerating(true);
    try {
      const response = await axios.post(process.env.NEXT_PUBLIC_SERVER_URL + '/test/generate-predictions', { topic });
      setGeneratedPredictions(response.data.predictions);
      setIsGeneratePopupOpen(true);
    } catch (error) {
      console.error('Error generating predictions:', error);
    }
    setIsGenerating(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prevTags =>
      prevTags.includes(tag)
        ? prevTags.filter(t => t !== tag)
        : [...prevTags, tag]
    );
  };


const filteredPredictions = predictions.filter(prediction => {
  const matchesTags = selectedTags.length === 0 || prediction.tags.some(tag => selectedTags.includes(tag));
  const isActive = prediction.state.value === 0;
  const isNotExpired = Number(prediction.end_time) > Date.now() / 1000;
  const matchesCreator = selectedCreator ? prediction.creator === selectedCreator : true;
  
  if (showFinalizedExpired) {
    return matchesTags && (!isActive || !isNotExpired) && matchesCreator;
  } else {
    return matchesTags && isActive && isNotExpired && matchesCreator;
  }
});


  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-100 dark:bg-navy-900 min-h-screen">
     <InstallPrompt />

    <Toaster />
    <div className="max-w-7xl mx-auto">
    {!userExists && connected && (
  <div className="mb-4 p-2 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-xl shadow-md">
    <p>You don't have an account. Please create one to continue.</p>
  </div>
)}
   {!connected && (
  <div className="mb-4 p-2 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-xl shadow-md">
    <p>Login to Start Predicting</p>
  </div>
)}

{connected && (
   <div>
                   <CreatorBanner className="mb-6" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRequestFunds}
                  className="bg-blue-500 text-white rounded-lg py-2 px-3 text-sm flex items-center justify-center flex-grow sm:flex-grow-0"
                >
                  <IoWater className="mr-1 sm:mr-2" /> <span className="hidden sm:inline">Request </span> Test Funds
                </motion.button>
                {!userExists && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsAliasModalOpen(true)}
                    className="bg-brand-500 text-white rounded-lg py-2 px-3 text-sm font-semibold flex items-center justify-center mx-auto hover:bg-brand-600 transition-colors"
                  >
                    <IoPersonAdd className="mr-2" /> Create Account
                  </motion.button>
                )}
                {(isAdminRole || isCreatorRole) && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsModalOpen(true)}
                      className="bg-brand-500 text-white rounded-lg py-2 px-3 text-sm flex items-center justify-center flex-grow sm:flex-grow-0"
                    >
                      <IoAdd className="mr-1 sm:mr-2" /> Create
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsGeneratePopupOpen(true)}
                      className="bg-brand-500 text-white rounded-lg py-2 px-3 text-sm flex items-center justify-center flex-grow sm:flex-grow-0"
                    >
                      <IoBulb className="mr-1 sm:mr-2" /> Generate
                    </motion.button>
                  </>
                )}
              </div>
            </div>
       <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleFilterVisibility}
            className="bg-brand-500 text-white rounded-lg py-2 px-4 flex items-center justify-center w-full sm:w-auto"
          >
            <IoFilter className="mr-2" />
            {isFilterVisible ? 'Hide Filters' : 'Show Filters'}
            {isFilterVisible ? <IoChevronUp className="ml-2" /> : <IoChevronDown className="ml-2" />}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFinalizedExpired(!showFinalizedExpired)}
            className={`${
              showFinalizedExpired ? 'bg-yellow-500' : 'bg-blue-500'
            } text-white rounded-lg py-2 px-4 flex items-center justify-center w-full sm:w-auto`}
          >
            <IoTime className="mr-2" />
            {showFinalizedExpired ? 'Show Running' : 'Show Finalized/Expired'}
          </motion.button>
        </div>

        <AnimatePresence>
          {isFilterVisible && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-4 overflow-hidden"
            >
              <div className="bg-white dark:bg-navy-800 rounded-lg p-4 shadow-md">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-semibold text-navy-700 dark:text-white">Filter by Tags:</h2>
                  {selectedTags.length > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={clearAllTags}
                      className="flex items-center text-sm text-red-500 hover:text-red-600 transition-colors"
                    >
                      <IoCloseCircleOutline className="mr-1" /> Clear All
                    </motion.button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        selectedTags.includes(tag)
                          ? 'bg-brand-500 text-white'
                          : 'bg-gray-200 dark:bg-navy-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
)}

<TrendingDashboard predictions={filteredPredictions}  
      onCreatorFilter={(creator) => setSelectedCreator(creator)}

/>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="bg-white dark:bg-navy-800 rounded-xl shadow-lg p-4 sm:p-6 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-navy-700 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-navy-700 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-navy-700 rounded w-1/3 mb-4"></div>
              <div className="h-20 bg-gray-200 dark:bg-navy-700 rounded mb-4"></div>
              <div className="h-10 bg-gray-200 dark:bg-navy-700 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredPredictions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredPredictions.map((prediction) => (
            <PredictionCard
              key={prediction.id}
              prediction={prediction}
              onPredict={handlePredict}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h2 className="text-xl sm:text-2xl font-bold text-navy-700 dark:text-white mb-4">No predictions available</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Create a new prediction to get started!</p>
          {isAdminRole && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsModalOpen(true)}
              className="bg-green-500 text-white rounded-lg py-2 px-4 text-base sm:text-lg font-semibold flex items-center justify-center mx-auto"
            >
              <IoAdd className="mr-2" /> Create Prediction
            </motion.button>
          )}
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
            className="bg-white dark:bg-navy-800 rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-navy-700 dark:text-white">Create New Prediction</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <IoClose size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={newPrediction.description}
                onChange={(e) => setNewPrediction({...newPrediction, description: e.target.value})}
                placeholder="Prediction description"
                className="w-full p-2 border rounded dark:bg-navy-700 dark:text-white dark:border-navy-600"
              />
              <input
                type="number"
                value={newPrediction.duration}
                onChange={(e) => setNewPrediction({...newPrediction, duration: e.target.value})}
                placeholder="Duration in seconds"
                className="w-full p-2 border rounded dark:bg-navy-700 dark:text-white dark:border-navy-600"
              />
              <input
                type="text"
                value={newPrediction.tags}
                onChange={(e) => setNewPrediction({...newPrediction, tags: e.target.value})}
                placeholder="Tags (comma separated)"
                className="w-full p-2 border rounded dark:bg-navy-700 dark:text-white dark:border-navy-600"
              />
              <button
                onClick={handleCreatePrediction}
                className="w-full bg-brand-500 text-white rounded-lg py-2 px-4 hover:bg-brand-600 transition-colors"
              >
                Create Prediction
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

<AliasModal
        isOpen={isAliasOpen}
        onClose={() => setIsAliasModalOpen(false)}
        newAlias={newAlias}
        setNewAlias={setNewAlias}
        handleCreateOrChangeAlias={handleCreateOrChangeAlias}
        userExists={userExists}
      />

      {isGeneratePopupOpen && (
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
            className="bg-white dark:bg-navy-800 rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-navy-700 dark:text-white">Generate AI Predictions</h2>
              <button onClick={() => setIsGeneratePopupOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <IoClose size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a topic for predictions"
                className="w-full p-2 border rounded dark:bg-navy-700 dark:text-white dark:border-navy-600"
              />
              <button
                onClick={handleGeneratePredictions}
                disabled={isGenerating}
                className="w-full bg-purple-500 text-white rounded-lg py-2 px-4 hover:bg-purple-600 transition-colors disabled:bg-purple-300 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generating...' : 'Generate Predictions'}
              </button>
              {generatedPredictions.map((prediction, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gray-100 dark:bg-navy-700 p-4 rounded-lg cursor-pointer"
                  onClick={() => handleSelectPrediction(prediction)}
                >
                  <h3 className="font-bold text-navy-700 dark:text-white mb-2">{prediction.description}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Duration: {prediction.duration} seconds</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tags: {prediction.tags.join(', ')}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
  );
};

export default Dashboard;
