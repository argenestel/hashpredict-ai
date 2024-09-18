import React, { useState, useEffect } from 'react';
import { Home, BarChart2, User, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { DynamicWidget } from '@dynamic-labs/sdk-react-core';

const NavBar = ({ isMobile }) => {
  const [activeTab, setActiveTab] = useState('predict');
  const [showTutorial, setShowTutorial] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const router = useRouter();

  const [darkmode, setDarkmode] = useState(true);
  
  useEffect(() => {
    document.body.classList.add('dark');
  }, []);

  const toggleDarkMode = () => {
    document.body.classList.toggle('dark');
    setDarkmode(!darkmode);
  };

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
    setShowMobileMenu(false);
  };

  const navItems = [
    { icon: <Home size={20} />, label: 'Leaders', route: 'leaders' },
    { icon: <BarChart2 size={20} />, label: 'Predict', route: 'predict' },
    { icon: <User size={20} />, label: 'Profile', route: 'profile' },
  ];

  const TopMobileNav = () => (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 left-0 right-0 bg-white/10 backdrop-blur-xl p-2 shadow-lg dark:bg-[#0b14374d] z-50"
    >
      <div className="flex justify-between items-center">
        <span className="text-white font-bold text-xl">HashPredict</span>
        <div className="flex items-center space-x-2">
          <DynamicWidget />
          <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="text-white">
            <Menu size={24} />
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      {isMobile && <TopMobileNav />}
      <motion.nav 
        initial={isMobile ? { y: 100 } : { y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`
          ${isMobile ? 'fixed bottom-4 left-4 right-4' : 'sticky top-0 left-0 right-0'}
          bg-white/10 backdrop-blur-xl rounded-2xl p-2 shadow-lg dark:bg-[#0b14374d] z-40
        `}
      >
        <div className={`flex ${isMobile ? 'justify-around' : 'justify-between'} items-center`}>
          {!isMobile && (
            <span className="text-white font-bold text-xl">HashPredict</span>
          )}
          <div className={`flex ${isMobile ? 'justify-around w-full' : 'space-x-4'}`}>
            {navItems.map((item) => (
              <NavItem
                key={item.route}
                icon={item.icon}
                label={item.label}
                isActive={activeTab === item.route}
                onClick={() => handleNavigation(item.route)}
                isMobile={isMobile}
              />
            ))}
          </div>
          {!isMobile && <DynamicWidget />}
        </div>
      </motion.nav>

      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-60"
            onClick={() => setShowMobileMenu(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute right-0 top-0 bottom-0 w-64 bg-white dark:bg-navy-800 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col space-y-4">
                {navItems.map((item) => (
                  <button
                    key={item.route}
                    onClick={() => handleNavigation(item.route)}
                    className={`flex items-center space-x-2 p-2 rounded-lg ${
                      activeTab === item.route ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showTutorial && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-70"
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

const NavItem = ({ icon, label, isActive, onClick, isMobile }) => (
  <motion.button
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className={`
      flex ${isMobile ? 'flex-col' : 'flex-row'} items-center justify-center 
      py-2 px-4 rounded-xl transition-colors
      ${isActive ? 'text-blue-500 bg-white/20' : 'text-gray-400 hover:text-gray-200'}
    `}
    onClick={onClick}
  >
    {icon}
    <span className={`${isMobile ? 'text-xs mt-1' : 'text-sm ml-2'} font-medium`}>{label}</span>
  </motion.button>
);

export default NavBar;