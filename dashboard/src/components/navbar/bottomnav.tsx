import React, { useState, useEffect } from 'react';
import { Home, TrendingUp, BarChart2, Wallet, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const BottomNav = () => {
  const [activeTab, setActiveTab] = useState('predict');
  const [showTutorial, setShowTutorial] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('hasSeenTutorial', 'true');
  };

  const handleNavigation = (route) => {
    setActiveTab(route);
    if (route === 'profile') {
      router.push('/admin/profile');
    } 
    else if (route === 'predict'){
        router.push('/admin/gamehub');
    }
    else if (route === 'leaders'){
       console.log('yet to create');
    }
    else {
      router.push(`/${route}`);
    }
  };

  return (
    <>
      <motion.nav 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-4 left-4 right-4 bg-white/10 backdrop-blur-xl rounded-2xl p-2 shadow-lg dark:bg-[#0b14374d]"
      >
        <div className="flex justify-around items-center">
          <NavItem icon={<Home size={20} />} label="Leaders" isActive={activeTab === 'leaders'} onClick={() => handleNavigation('leaders')} />
          {/* <NavItem icon={<TrendingUp size={20} />} label="Fans" isActive={activeTab === 'fans'} onClick={() => handleNavigation('fans')} /> */}
          <NavItem icon={<BarChart2 size={20} />} label="Predict" isActive={activeTab === 'predict'} onClick={() => handleNavigation('predict')} />
          {/* <NavItem icon={<Wallet size={20} />} label="Treasury" isActive={activeTab === 'treasury'} onClick={() => handleNavigation('treasury')} /> */}
          <NavItem icon={<User size={20} />} label="Profile" isActive={activeTab === 'profile'} onClick={() => handleNavigation('profile')} />
        </div>
      </motion.nav>

      {showTutorial && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 max-w-sm w-full shadow-lg dark:bg-[#0b14374d]"
          >
            <h2 className="text-xl font-bold mb-4 text-white">Welcome to HashPredict!</h2>
            <p className="text-gray-300 mb-4">Let's quickly go through the main features of our prediction marketplace:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
              <li>Leaders: See top performers</li>
              <li>Friends: Check trending predictions</li>
              <li>Predict: Make your predictions</li>
              <li>Profile: View your activity and settings</li>
            </ul>
            <button 
              onClick={handleCloseTutorial}
              className="w-full bg-blue-500 text-white rounded-lg py-2 font-semibold hover:bg-blue-600 transition-colors"
            >
              Got it, let's start!
            </button>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};

const NavItem = ({ icon, label, isActive, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-colors ${
      isActive ? 'text-blue-500 bg-white/20' : 'text-gray-400 hover:text-gray-200'
    }`}
    onClick={onClick}
  >
    {icon}
    <span className="text-xs mt-1 font-medium">{label}</span>
  </motion.button>
);

export default BottomNav;