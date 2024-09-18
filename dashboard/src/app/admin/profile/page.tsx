'use client';
import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import Banner from 'components/admin/profile/Banner';
import { Aptos, AptosConfig, InputViewFunctionData, Network } from '@aptos-labs/ts-sdk';
import ComplexTable from 'components/admin/data-tables/ComplexTable';
import TotalSpent from 'components/admin/default/TotalSpent';

interface PredictionDetails {
  description: string;
  end_time: string;
  id: string;
  no_price: string;
  no_votes: string;
  result: number;
  start_time: string;
  state: { value: number };
  total_bet: string;
  total_votes: string;
  yes_price: string;
  yes_votes: string;
}

const ProfileOverview: React.FC = () => {
  const [userData, setUserData] = useState<any>(null);
  const [userPredictions, setUserPredictions] = useState<PredictionDetails[]>([]);
  const [totalWinnings, setTotalWinnings] = useState<number>(0);
  const [predictionStats, setPredictionStats] = useState<{
    totalPredictions: number;
    activePredictions: number;
    totalBet: number;
  }>({
    totalPredictions: 0,
    activePredictions: 0,
    totalBet: 0
  });
  const { account, connected } = useWallet();

  const config = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(config);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (connected && account) {
          const walletAddress = account.address;
          
          // Fetch additional user data (replace with actual API call)
          const additionalData = await fetchAdditionalUserData(walletAddress);
          
          setUserData({ 
            ...additionalData,
            walletAddress 
          });
          
          // Fetch user's predictions and other data
          await fetchAllPredictions();
          await fetchTotalWinnings(walletAddress);
          await fetchPredictionStats();
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [connected, account]);

  const fetchAllPredictions = async () => {
    try {
      const payload: InputViewFunctionData = {
        function: '0x5e4a0b20b0d20f701526a21288ae092f7876bb43698aa794c61110099b48bc5b::hashpredictalpha::get_all_predictions',
        typeArguments: [],
        functionArguments: []
      };
      const result = await aptos.view({ payload });
      console.log('All Predictions:', result);
      
      // Extract the predictions from the nested structure
      let predictions: PredictionDetails[] = [];
      if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
        predictions = result[0][0] as PredictionDetails[];
      } else if (Array.isArray(result)) {
        predictions = result as PredictionDetails[];
      }
      setUserPredictions(predictions);
    } catch (error) {
      console.error('Error fetching all predictions:', error);
    }
  };

  const fetchTotalWinnings = async (address: string) => {
    let totalWinnings = 0;
    for (const prediction of userPredictions) {
      try {
        const payload: InputViewFunctionData = {
          function: '0x5e4a0b20b0d20f701526a21288ae092f7876bb43698aa794c61110099b48bc5b::hashpredictalpha::get_user_winnings',
          typeArguments: [],
          functionArguments: [address, prediction.id]
        };
        const winnings = await aptos.view({ payload });
        totalWinnings += Number(winnings);
      } catch (error) {
        console.error(`Error fetching winnings for prediction ${prediction.id}:`, error);
      }
    }
    console.log('Total Winnings:', totalWinnings);
    setTotalWinnings(totalWinnings);
  };

  const fetchPredictionStats = async () => {
    try {
      const totalPredictionsPayload: InputViewFunctionData = {
        function: '0x5e4a0b20b0d20f701526a21288ae092f7876bb43698aa794c61110099b48bc5b::hashpredictalpha::get_total_predictions',
        typeArguments: [],
        functionArguments: []
      };
      const totalPredictions = await aptos.view({ payload: totalPredictionsPayload });
      
      let activePredictions = 0;
      let totalBet = 0;
      for (const prediction of userPredictions) {
        if (prediction.state.value === 0) { // Assuming 0 is the active state
          activePredictions++;
        }
        totalBet += parseInt(prediction.total_bet);
      }
      
      setPredictionStats({
        totalPredictions: Number(totalPredictions),
        activePredictions,
        totalBet
      });
    } catch (error) {
      console.error('Error fetching prediction stats:', error);
    }
  };

  // Placeholder function to fetch additional user data
  const fetchAdditionalUserData = async (walletAddress: string) => {
    // This should be replaced with an actual API call to your backend
    return {
      posts: 17,
      followers: '9.7K',
      following: 434,
      position: 'Aptos Developer',
      bannerUrl: '/img/profile/banner.png',
      avatarUrl: '/img/avatars/avatar11.png',
    };
  };

  if (!userData) {
    return <div className='dark:text-white text-blueSecondary font-bold mt-10 mx-5'>Please connect your wallet to view your profile.</div>;
  }

  const tableData = Array.isArray(userPredictions) ? userPredictions.map((prediction: PredictionDetails) => ({
    name: prediction.description,
    status: prediction.state.value === 0 ? 'Active' : prediction.state.value === 1 ? 'Paused' : 'Resolved',
    date: new Date(parseInt(prediction.end_time) * 1000).toLocaleDateString(),
    progress: parseInt(prediction.yes_votes) > 0 || parseInt(prediction.no_votes) > 0
      ? (parseInt(prediction.yes_votes) / (parseInt(prediction.yes_votes) + parseInt(prediction.no_votes))) * 100
      : 0,
  })) : [];

  return (
    <div className="flex w-full flex-col gap-5 lg:gap-5">
      <div className="w-full mt-3 flex h-fit flex-col gap-5 lg:grid lg:grid-cols-12">
        <div className="col-span-4 lg:!mb-0">
          <Banner user={userData} />
        </div>
        <div className="col-span-8 lg:!mb-0">
          <TotalSpent />
        </div>
      </div>
      
      <div className="w-full mt-3">
        <h2 className="text-2xl font-bold text-navy-700 dark:text-white mb-4">Prediction Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-navy-800 rounded-xl shadow-md p-4">
            <h3 className="text-lg font-semibold text-navy-700 dark:text-white mb-2">Total Predictions</h3>
            <p className="text-2xl font-bold text-brand-500">{predictionStats.totalPredictions}</p>
          </div>
          <div className="bg-white dark:bg-navy-800 rounded-xl shadow-md p-4">
            <h3 className="text-lg font-semibold text-navy-700 dark:text-white mb-2">Total Winnings</h3>
            <p className="text-2xl font-bold text-green-500">{totalWinnings / 100000000} APT</p>
          </div>
          <div className="bg-white dark:bg-navy-800 rounded-xl shadow-md p-4">
            <h3 className="text-lg font-semibold text-navy-700 dark:text-white mb-2">Active Predictions</h3>
            <p className="text-2xl font-bold text-blue-500">{predictionStats.activePredictions}</p>
          </div>
          <div className="bg-white dark:bg-navy-800 rounded-xl shadow-md p-4">
            <h3 className="text-lg font-semibold text-navy-700 dark:text-white mb-2">Total Bet</h3>
            <p className="text-2xl font-bold text-purple-500">{predictionStats.totalBet / 100000000} APT</p>
          </div>
        </div>
      </div>
      
      <div className="w-full mt-3">
        <ComplexTable tableData={tableData} />
      </div>
    </div>
  );
};

export default ProfileOverview;