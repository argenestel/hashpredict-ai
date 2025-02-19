import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, useAnimation } from 'framer-motion';
import { IoAdd, IoRemove, IoTimeOutline, IoWalletOutline, IoCheckmark, IoClose, IoCash, IoBulb, IoTrendingUp, IoTrendingDown, IoSwapHorizontal, IoInformationCircle, IoPerson } from 'react-icons/io5';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
});
interface PredictionCardProps {
  prediction: {
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
    creator: string;
  };
  onPredict: (id: string, verdict: boolean, share: number, useChip: boolean) => void;
}

const SLIDER_WIDTH = 300;
const THUMB_WIDTH = 60;
const CONFIRMATION_THRESHOLD = 0.8; // 80% of the way to either side
const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULEADDRESS;
const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);
//0xae2ebac0c8ffb7be58f7b661b80a21c7555363384914e2a1ebb5bd86aeedccf7
const CHIP_EXCHANGE_RATE = 100; // 100 CHIP = 1 APT

const PredictionCard: React.FC<PredictionCardProps> = ({ prediction, onPredict }) => {
  const [shareAmount, setShareAmount] = useState(1);
  const [isYesSelected, setIsYesSelected] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [outcome, setOutcome] = useState<number>(0);
  const [isAIFinalizing, setIsAIFinalizing] = useState(false);
  const { account, signAndSubmitTransaction } = useWallet();
  const [useChips, setUseChips] = useState(false);
  const [graphData, setGraphData] = useState([]);
  const [creatorAlias, setCreatorAlias] = useState('');

  const [isPredictionEnded, setIsPredictionEnded] = useState(false);

  useEffect(() => {
    if (prediction) {
      setIsPredictionEnded(Date.now() / 1000 > Number(prediction.end_time));
    }
  }, [prediction]);

  useEffect(() => {
    checkAdminRole();
    fetchGraphData();
    fetchCreatorAlias();
  }, [account, prediction]);

  const checkAdminRole = async () => {
    if (account) {
      try {
        const adminAddress = await aptos.view({
          payload: {
            function: `${MODULE_ADDRESS}::hashpredictalpha::get_admin`,
            typeArguments: [],
            functionArguments: []
          }
        });
        setIsAdmin(adminAddress[0] === account.address);
      } catch (error) {
        console.error('Error checking admin role:', error);
      }
    }
  };

  const [showUSD, setShowUSD] = useState(true);
  const [aptPrice, setAptPrice] = useState(0);

  useEffect(() => {
    fetchAptPrice();
  }, []);

  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testOutcome, setTestOutcome] = useState(null);

  const handleTestFinalize = async () => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URL}/test/finalize-prediction/${prediction.id}`);
      setTestOutcome(response.data.outcome);
      setIsTestModalOpen(true);
    } catch (error) {
      console.error('Error in test finalization:', error);
      // You might want to show an error toast here
    }
  };

  const fetchGraphData = async () => {
    try {
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::hashpredictalpha::get_prediction_graph`,
          typeArguments: [],
          functionArguments: [prediction.id]
        }
      });
      setGraphData(result[0]);
    } catch (error) {
      console.error('Error fetching graph data:', error);
    }
  };

  const fetchCreatorAlias = async () => {
    try {
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::user_account::get_user_info`,
          typeArguments: [],
          functionArguments: [prediction.creator]
        }
      });
      setCreatorAlias(result[0]);
    } catch (error) {
      console.error('Error fetching creator alias:', error);
    }
  };


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
      toast.error('Failed to fetch APT price');
    }
  };

  const formatPrice = (amount: string) => {
    const aptAmount = Number(amount) / 1e8;
    if (showUSD) {
      const usdAmount = aptAmount * aptPrice;
      return `$${usdAmount.toFixed(2)}`;
    } else {
      return `${aptAmount.toFixed(2)} APT`;
    }
  };
  
  const handleFinalize = async (useAI = false) => {
    if (!account) return;
    try {
      let finalOutcome;
      if (useAI) {
        setIsAIFinalizing(true);
        try {
          const response = await axios.post(process.env.NEXT_PUBLIC_SERVER_URL+`/finalize-prediction/${prediction.id}`);
          finalOutcome = response.data.outcome;
        } catch (error) {
          console.error('Error finalizing with AI:', error);
          setIsAIFinalizing(false);
          return;
        }
      } else {
        finalOutcome = outcome;
      }

      await signAndSubmitTransaction({
        data: {
          function: `${MODULE_ADDRESS}::hashpredictalpha::resolve_prediction`,
          typeArguments: [],
          functionArguments: [prediction.id, finalOutcome]
        },
      });
      
      console.log(`Prediction finalized ${useAI ? 'with AI' : 'by admin'}`);
    } catch (error) {
      console.error('Error finalizing prediction:', error);
    } finally {
      setIsAIFinalizing(false);
    }
  };

  const handleIncrement = () => setShareAmount(prev => prev + 1);
  const handleDecrement = () => setShareAmount(prev => Math.max(1, prev - 1));

  const handlePredict = () => {
    onPredict(prediction.id, isYesSelected, shareAmount, useChips);
  };

  const handleCancel = async () => {
    if (!account) return;
    try {
      await signAndSubmitTransaction({
        data: {
          function: `${MODULE_ADDRESS}::hashpredictalpha::pause_prediction`,
          typeArguments: [],
          functionArguments: [prediction.id]
        },
      });
    } catch (error) {
      console.error('Error cancelling prediction:', error);
    }
  };



  const handleDistributeRewards = async () => {
    if (!account) return;
    try {
      await signAndSubmitTransaction({
        data: {
          function: `${MODULE_ADDRESS}::hashpredictalpha::mass_withdraw`,
          typeArguments: [],
          functionArguments: [prediction.id]
        },
      });
    } catch (error) {
      console.error('Error distributing rewards:', error);
    }
  };

  const calculatePotentialPayout = (selectedYes: boolean) => {
    const betAmount = shareAmount * 1e8; // 1 share = 1 APT = 1e8 units
    const totalPool = Number(prediction.total_bet);
    const selectedPool = selectedYes ? Number(prediction.yes_votes) : Number(prediction.no_votes);
    
    if (totalPool === 0 || selectedPool === 0) return 0;

    // Calculate the payout based on the current voting distribution
    const payoutRatio = (totalPool * 0.95) / selectedPool; // 5% fee
    const potentialPayout = (betAmount * payoutRatio) / 1e8; // Convert back to APT

    return potentialPayout;
  };

  
  const formatTime = (timestamp: string) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const calculatePercentage = (votes: string, total: string) => {
    const votesNum = Number(votes) || 0;
    const totalNum = Number(total) || 0;
    return totalNum > 0 ? (votesNum / totalNum) * 100 : 50;
  };

  const formatAPT = (amount: string) => {
    return (Number(amount) / 1e8).toFixed(2);
  };

  const { id, description, end_time, state, yes_votes, no_votes, yes_price, no_price, total_bet, total_votes, result, tags } = prediction;

  const yesPercentage = calculatePercentage(yes_votes, total_votes);
  const noPercentage = calculatePercentage(no_votes, total_votes);
  const stateValue = typeof state === 'object' && state !== null ? state.value : (typeof state === 'number' ? state : 0);

  const isActive = stateValue === 0;
  const isFinalized = stateValue === 2;
  const isCancelled = stateValue === 1;
  const totalApt = formatAPT(total_bet);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const potentialPayout = calculatePotentialPayout(isYesSelected);

  const [predictionMade, setPredictionMade] = useState<boolean | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const controls = useAnimation();

  const xInput = [-SLIDER_WIDTH / 2 + THUMB_WIDTH / 2, 0, SLIDER_WIDTH / 2 - THUMB_WIDTH / 2];
  const background = useTransform(x, xInput, [
    "linear-gradient(90deg, #ef4444 0%, #ef4444 100%)",
    "linear-gradient(90deg, #ef4444 0%, #22c55e 100%)",
    "linear-gradient(90deg, #22c55e 0%, #22c55e 100%)"
  ]);

  const handleDragEnd = () => {
    const xValue = x.get();
    const threshold = (SLIDER_WIDTH / 2 - THUMB_WIDTH / 2) * CONFIRMATION_THRESHOLD;
    
    if (xValue < -threshold) {
      onPredict(prediction.id, false, shareAmount, useChips);
      setPredictionMade(false);
      controls.start({ x: -SLIDER_WIDTH / 2 + THUMB_WIDTH / 2 });
    } else if (xValue > threshold) {
      onPredict(prediction.id, true, shareAmount, useChips);
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
  const isDark = document.documentElement.classList.contains('dark');


  const chartOptions = {
    chart: {
      type: 'area',
      height: 250,
      toolbar: {
        show: false
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        }
      },
      background: 'transparent',
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system'
    },
    grid: {
      show: true,
      borderColor: isDark ? '#1e293b40' : '#e2e8f040',
      strokeDashArray: 3,
      xaxis: {
        lines: {
          show: false
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      },
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 10
      }
    },
    colors: [
      isDark ? '#22c55e' : '#16a34a',  // Yes line - green
      isDark ? '#ef4444' : '#dc2626'   // No line - red
    ],
    stroke: {
      width: 3,
      curve: 'smooth',
      lineCap: 'round'
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 100]
      }
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      style: {
        fontSize: '12px'
      },
      x: {
        format: 'MMM dd, HH:mm'
      },
      y: {
        formatter: (value) => `${value.toFixed(2)} APT`
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: {
          colors: isDark ? '#94a3b8' : '#64748b',
          fontSize: '12px'
        },
        datetimeFormatter: {
          year: 'yyyy',
          month: 'MMM dd',
          day: 'MMM dd',
          hour: 'HH:mm'
        }
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: isDark ? '#94a3b8' : '#64748b',
          fontSize: '12px'
        },
        formatter: (value) => value.toFixed(2)
      }
    },
    markers: {
      size: 4,
      strokeWidth: 2,
      hover: {
        size: 6
      }
    },
    dataLabels: {
      enabled: false
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      labels: {
        colors: isDark ? '#94a3b8' : '#64748b'
      },
      markers: {
        width: 8,
        height: 8,
        radius: 8
      },
      itemMargin: {
        horizontal: 15
      }
    }
  };
  const chartData = [
    {
      name: 'Yes Price',
      data: graphData.map(point => [point.timestamp * 1000, Number(point.yes_price) / 1e8])
    },
    {
      name: 'No Price',
      data: graphData.map(point => [point.timestamp * 1000, Number(point.no_price) / 1e8])
    }
  ];

  return (
    <motion.div 
      className="bg-white dark:bg-navy-800 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl border border-gray-200 dark:border-navy-700 flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      
      <div className="p-6 flex-grow">
      <div className="flex justify-between items-start mb-2">
          <h2 className="font-bold text-navy-700 dark:text-white text-sm line-clamp-4 flex-grow mr-2">
            {prediction.description}
          </h2>
          <button
            onClick={toggleExpand}
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
  <div className="flex items-center mb-4 text-sm text-gray-600 dark:text-gray-400">
          <IoPerson className="mr-2 text-brand-500" />
          <span>Creator: {creatorAlias || prediction.creator.slice(0, 6) + '...' + prediction.creator.slice(-4)}</span>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <motion.span 
              className="text-sm font-medium text-green-500 dark:text-green-400 flex items-center"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <IoTrendingUp className="mr-1" />
              Yes: {yesPercentage.toFixed(1)}%
            </motion.span>
            <motion.span 
              className="text-sm font-medium text-red-500 dark:text-red-400 flex items-center"
              initial={{ x: 10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <IoTrendingDown className="mr-1" />
              No: {noPercentage.toFixed(1)}%
            </motion.span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-navy-700 rounded-full h-3 overflow-hidden relative">
            <motion.div 
              className="absolute left-0 h-full rounded-full bg-gradient-to-r from-green-400 to-brand-500 dark:from-green-500 dark:to-brand-400"
              initial={{ width: 0 }}
              animate={{ width: `${yesPercentage}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
            <motion.div 
              className="absolute right-0 h-full rounded-full bg-gradient-to-l from-red-400 to-brand-400 dark:from-red-500 dark:to-brand-300"
              initial={{ width: 0 }}
              animate={{ width: `${noPercentage}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        </div>
        <AnimatePresence>
        {isExpanded && (
        <div>


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

        <div className="mb-6 h-64">
                <Chart
                  options={chartOptions}
                  series={chartData}
                  type="area"
                  width="100%"
                  height="100%"
                />
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
          {/* {isActive && (
            <div className="text-navy-700 dark:text-white flex items-center text-sm font-medium">
              Potential Payout: 
              <span className="ml-2 px-2 py-1 rounded-full bg-brand-100 text-brand-800 dark:bg-brand-800 dark:text-brand-100">
                {potentialPayout.toFixed(2)} APT
              </span>
            </div>
          )} */}
        </div>
          </div>
        )}
        </AnimatePresence>


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
      </div>

      {isActive && !isPredictionEnded && (
        <div className="p-6 bg-gray-50 dark:bg-navy-900 border-t border-gray-200 dark:border-navy-700">
          <div className="mb-6 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Prediction Amount: 
            </span>
                          <span className="text-sm font-bold font-medium text-gray-700 dark:text-gray-300">
                          {shareAmount / 10} APT
            </span>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setShareAmount(prev => Math.max(1, prev - 1))}
                className="bg-gray-200 dark:bg-navy-700 text-gray-700 dark:text-gray-300 rounded-full p-2 hover:bg-gray-300 dark:hover:bg-navy-600 transition-colors"
              >
                -
              </button>
              <input 
                type="number" 
                value={shareAmount}
                onChange={(e) => setShareAmount(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-20 text-center border dark:border-navy-600 rounded-lg py-2 bg-white dark:bg-navy-900 text-gray-700 dark:text-gray-300 text-sm"
                step="1"
              />
              <button 
                onClick={() => setShareAmount(prev => prev + 1)}
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


      {isAdmin && isActive && isPredictionEnded && (
        <div className="p-6 bg-gray-50 dark:bg-navy-900 border-t border-gray-200 dark:border-navy-700">
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-2">
              <select 
                value={outcome}
                onChange={(e) => setOutcome(parseInt(e.target.value))}
                className="flex-grow p-2 border rounded dark:text-white dark:bg-navy-700 dark:border-navy-600 text-sm"
              >
                <option className='dark:text-white' value={0}>Yes</option>
                <option className='dark:text-white' value={1}>No</option>
              </select>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleFinalize(false)}
                className="bg-blue-500 text-white rounded-lg py-2 px-4 text-sm font-medium flex items-center"
              >
                <IoCheckmark className="mr-1" /> Admin Finalize
              </motion.button>
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleFinalize(true)}
              disabled={isAIFinalizing}
              className="w-full bg-purple-500 text-white rounded-lg py-2 px-4 text-sm font-medium flex items-center justify-center"
            >
              {isAIFinalizing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Finalizing with AI...
                </>
              ) : (
                <>
                  <IoBulb className="mr-2" /> Finalize with AI
                </>
              )}
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTestFinalize()}
              disabled={isAIFinalizing}
              className="w-full bg-purple-500 text-white rounded-lg py-2 px-4 text-sm font-medium flex items-center justify-center"
            >
              {isAIFinalizing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Finalizing with AI...
                </>
              ) : (
                <>
                  <IoBulb className="mr-2" /> Test With AI
                </>
              )}
            </motion.button>
          </div>
        </div>
      )}

      {isAdmin && isActive && (
        <div className="p-6 bg-gray-50 dark:bg-navy-900 border-t border-gray-200 dark:border-navy-700">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCancel}
            className="w-full bg-red-500 text-white rounded-lg py-2 px-4 text-sm font-medium flex items-center justify-center"
          >
            <IoClose className="mr-2" /> Cancel Prediction
          </motion.button>
        </div>
      )}

{isTestModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-navy-800 rounded-lg shadow-xl max-w-md w-full"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Test Finalization Result</h3>
                  <button
                    onClick={() => setIsTestModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition duration-150"
                  >
                    <IoClose size={24} />
                  </button>
                </div>
                {testOutcome && (
                  <div className="space-y-4 text-gray-600 dark:text-gray-300">
                    <p>
                      <span className="font-semibold">Outcome:</span> 
                      <span className={`ml-2 ${testOutcome.outcome === 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {testOutcome.outcome === 0 ? 'No' : 'Yes'}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold">Confidence:</span> 
                      <span className="ml-2">{(testOutcome.confidence * 100).toFixed(2)}%</span>
                    </p>
                    <p>
                      <span className="font-semibold">Explanation:</span> 
                      <span className="ml-2">{testOutcome.explanation}</span>
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

      {isAdmin && isFinalized && (
        <div className="p-6 bg-gray-50 dark:bg-navy-900 border-t border-gray-200 dark:border-navy-700">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDistributeRewards}
            className="w-full bg-green-500 text-white rounded-lg py-2 px-4 text-sm font-medium flex items-center justify-center"
          >
            <IoCash className="mr-2" /> Distribute Rewards
          </motion.button>
        </div>
      )}
      {isPredictionEnded && !isFinalized && !isAdmin && (
        <div className="p-6 bg-gray-50 dark:bg-navy-900 border-t border-gray-200 dark:border-navy-700">
          <div className="text-center text-sm font-medium text-gray-600 dark:text-gray-400">
            <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100 px-2 py-1 rounded-full">
              This prediction has ended and is awaiting finalization
            </span>
          </div>
        </div>
      )}
      {(isFinalized || isCancelled) && !isAdmin && (
        <div className="p-6 bg-gray-50 dark:bg-navy-900 border-t border-gray-200 dark:border-navy-700">
          <div className="text-center text-sm font-medium text-gray-600 dark:text-gray-400">
            {isFinalized ? (
              <span className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 px-2 py-1 rounded-full">
                This prediction has been finalized
              </span>
            ) : (
              <span className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100 px-2 py-1 rounded-full">
                This prediction has been cancelled
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default PredictionCard;
