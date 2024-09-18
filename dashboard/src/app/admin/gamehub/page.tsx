'use client'
import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, InputViewFunctionData, Network, MoveValue } from '@aptos-labs/ts-sdk';
import { IoClose, IoAdd, IoRemove, IoCreate, IoFilter, IoWater } from 'react-icons/io5';
import PredictionCard from 'components/card/PredictionCard';
import { AnimatePresence, motion } from 'framer-motion';



const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-navy-900 dark:text-white rounded-xl p-6 w-full max-w-md relative"
      >
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">
          <IoClose size={24} />
        </button>
        {children}
      </motion.div>
    </div>
  );
};

const Alert = ({ message, type, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: -50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -50 }}
    className={`fixed top-4 left-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white`}
  >
    <p>{message}</p>
    <button onClick={onClose} className="absolute top-2 right-2 text-white">
      <IoClose size={20} />
    </button>
  </motion.div>
);
interface Prediction {
  id: string;
  description: string;
  state: { value: number };
  end_time: string;
  yes_votes: string;
  no_votes: string;
  yes_price: string;
  no_price: string;
  total_bet: string;
}

interface UserPrediction {
  id: string;
  share: number;
  verdict: boolean;
}

const GameHub = () => {
  const { connect, account, connected, disconnect, signAndSubmitTransaction } = useWallet();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [userPredictions, setUserPredictions] = useState<Record<string, UserPrediction[]>>({});
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPrediction, setNewPrediction] = useState({ description: '', duration: '' });
  const [filter, setFilter] = useState('active');
  const [isFunding, setIsFunding] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  const config = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(config);

  const ADMIN_ADDRESS = '0x5e4a0b20b0d20f701526a21288ae092f7876bb43698aa794c61110099b48bc5b';

  useEffect(() => {
    if (connected) {
      fetchPredictions();
      fetchUserPredictions();
    } 
    else {
      fetchPredictions();

    }
  }, [connected]);

  const fetchPredictions = async () => {
    try {
      const payload: InputViewFunctionData = {
        function: `${ADMIN_ADDRESS}::hashpredictalpha::get_all_predictions`,
        typeArguments: [],
        functionArguments: []
      };
      
      const result = await aptos.view({ payload });
      const flattenedPredictions = result.flat() as Prediction[];
      setPredictions(flattenedPredictions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setPredictions([]);
      setLoading(false);
    }
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };

  const handleFaucetFund = async () => {
    if (!connected || !account) {
      showAlert('Please connect your wallet first', 'error');
      return;
    }

    setIsFunding(true);
    try {
      const response = await fetch(`https://faucet.testnet.aptoslabs.com/mint?amount=100000000&address=${account.address}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      showAlert(`Funded 1 APT successfully!`);
    } catch (error) {
      console.error('Error funding from faucet:', error);
      showAlert('Error funding from faucet. Please try again.', 'error');
    } finally {
      setIsFunding(false);
    }
  };
  const fetchUserPredictions = async () => {
    if (!connected) return;

    try {
      const payload: InputViewFunctionData = {
        function:  `${ADMIN_ADDRESS}::hashpredictalpha::get_user_predictions`,
        typeArguments: [],
        functionArguments: [account.address]
      };
      
      const result = await aptos.view({ payload });
      console.log(result);
      const userPredictionsMap: Record<string, UserPrediction[]> = {};
      (result as MoveValue[]).forEach((prediction: MoveValue) => {
        if (typeof prediction === 'object' && 'id' in prediction) {
          const id = (prediction as { id: string }).id;
          if (!userPredictionsMap[id]) {
            userPredictionsMap[id] = [];
          }
          userPredictionsMap[id].push(prediction as UserPrediction);
        }
      });
      setUserPredictions(userPredictionsMap);
    } catch (error) {
      console.error('Error fetching user predictions:', error);
    }
  };

  const handlePredict = async (predictionId: string, verdict: boolean, share: number) => {
    if (!connected) {
      showAlert('Please connect your wallet first');
      return;
    }

    try {
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function:  `${ADMIN_ADDRESS}::hashpredictalpha::predict`,
          typeArguments: [],
          functionArguments: [predictionId, verdict, share],
        },
      });

      await aptos.waitForTransaction({ transactionHash: response.hash });
      showAlert('Prediction submitted successfully!');
      fetchPredictions();
      fetchUserPredictions();
    } catch (error) {
      console.error('Error submitting prediction:', error);
      showAlert('Error submitting prediction. Please try again.');
    }
  };

  const handleCreatePrediction = async () => {
    if (!connected) {
      showAlert('Please connect your wallet first');
      return;
    }

    try {
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function:  `${ADMIN_ADDRESS}::hashpredictalpha::create_prediction`,
          typeArguments: [],
          functionArguments: [newPrediction.description, parseInt(newPrediction.duration)],
        },
      });

      await aptos.waitForTransaction({ transactionHash: response.hash });
      showAlert('Prediction created successfully!');
      setIsCreateModalOpen(false);
      setNewPrediction({ description: '', duration: '' });
      fetchPredictions();
    } catch (error) {
      console.error('Error creating prediction:', error);
      showAlert('Error creating prediction. Please try again.');
    }
  };

  const filteredPredictions = predictions.filter(prediction => {
    if (filter === 'active') {
      return prediction.state.value === 0;
    } else if (filter === 'inactive') {
      return prediction.state.value !== 0;
    }
    return true;
  });

  const isAdmin = connected && account?.address === ADMIN_ADDRESS;

  return (
    <div className="flex flex-col items-center pt-4 px-4 min-h-screen bg-gray-100 dark:bg-navy-900">
    <AnimatePresence>
      {alert.show && (
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert({ show: false, message: '', type: 'success' })}
        />
      )}
    </AnimatePresence>

    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-7xl mt-20"
    >
      <div className="flex flex-col space-y-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <IoFilter size={24} className="text-gray-600 dark:text-gray-300" />
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="px-2 py-1 bg-white dark:bg-navy-800 text-gray-700 dark:text-white rounded-lg border dark:border-navy-600 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            >
              <option className='dark:text-white' value="active">Active</option>
              <option className='dark:text-white' value="inactive">Inactive</option>
              <option className='dark:text-white' value="all">All</option>
            </select>
          </div>
          {connected && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFaucetFund}
              disabled={isFunding}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2 disabled:opacity-50 text-sm"
            >
              <IoWater size={16} />
              <span>{isFunding ? 'Funding...' : 'Fund 1 APT'}</span>
            </motion.button>
          )}
        </div>
        {isAdmin && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCreateModalOpen(true)} 
            className="w-full px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors flex items-center justify-center space-x-2 text-sm"
          >
            <IoCreate size={16} />
            <span>Create New Prediction</span>
          </motion.button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-brand-500"></div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 gap-4 w-full mb-16"
        >
          {filteredPredictions.map((prediction) => (
            <PredictionCard
              key={prediction.id}
              prediction={prediction}
              onPredict={handlePredict}
              userPredictions={userPredictions[prediction.id] || []}
            />
          ))}
        </motion.div>
      )}
    </motion.div>

    <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
      <h3 className="text-xl font-bold mb-4 text-center">Create New Prediction</h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Prediction Description
          </label>
          <input
            id="description"
            type="text"
            placeholder="Enter prediction description"
            value={newPrediction.description}
            onChange={(e) => setNewPrediction({ ...newPrediction, description: e.target.value })}
            className="w-full dark:bg-navy-800 p-2 border border-gray-300 dark:border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          />
        </div>
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Duration (in seconds)
          </label>
          <input
            id="duration"
            type="number"
            placeholder="Enter duration"
            value={newPrediction.duration}
            onChange={(e) => setNewPrediction({ ...newPrediction, duration: e.target.value })}
            className="w-full dark:bg-navy-800 p-2 border border-gray-300 dark:border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          />
        </div>
      </div>
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleCreatePrediction} 
        className="w-full mt-6 bg-brand-500 text-white rounded-lg px-4 py-2 hover:bg-brand-600 transition-colors font-semibold text-sm"
      >
        Create Prediction
      </motion.button>
    </Modal>
  </div>
  );
};

export default GameHub;