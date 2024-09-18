import React, { useState, useEffect } from 'react';
import { useWallet, WalletReadyState } from '@aptos-labs/wallet-adapter-react';
import { IoWallet, IoClose, IoChevronDown, IoCheckmark, IoWarning } from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';

const WalletButton = ({ name, icon, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="flex items-center justify-between w-full p-4 mb-3 bg-white dark:bg-navy-800 border border-gray-200 dark:border-navy-700 rounded-xl hover:bg-gray-50 dark:hover:bg-navy-700 transition-colors"
  >
    <div className="flex items-center">
      <img src={icon} alt={name} className="w-8 h-8 mr-3" />
      <span className="text-sm font-medium dark:text-white">{name}</span>
    </div>
    <span className="text-sm text-brand-500 dark:text-brand-400 font-medium">Connect</span>
  </motion.button>
);

const WalletSelector = () => {
  const { connect, disconnect, account, network, wallets } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [availableWallets, setAvailableWallets] = useState([]);

  useEffect(() => {
    setAvailableWallets(
      wallets.filter((wallet) => wallet.readyState === WalletReadyState.Installed)
    );
  }, [wallets]);

  const handleConnect = (wallet) => {
    connect(wallet.name);
    setIsOpen(false);
  };

  const handleDisconnect = () => {
    disconnect();
    setIsOpen(false);
  };

  const truncateAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="flex items-center px-4 py-2 bg-brand-500 dark:bg-brand-400 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-500 transition-colors"
      >
        <IoWallet className="mr-2" />
        {account ? truncateAddress(account.address) : 'Connect Wallet'}
        <IoChevronDown className="ml-2" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed mt-80 inset-0 flex items-center justify-center  bg-black bg-opacity-50   z-50"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-navy-800 rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold dark:text-white">Wallet</h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <IoClose size={24} />
                </motion.button>
              </div>

              {account ? (
                <div className="space-y-4">
                  <div className="bg-gray-100 dark:bg-navy-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Connected account</p>
                    <p className="font-medium dark:text-white flex items-center">
                      {truncateAddress(account.address)}
                      <IoCheckmark className="ml-2 text-green-500" />
                    </p>
                  </div>
                  <div className="bg-gray-100 dark:bg-navy-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Network</p>
                    <p className="font-medium dark:text-white">{network?.name || 'Unknown'}</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDisconnect}
                    className="w-full px-4 py-3 bg-red-500 dark:bg-red-400 text-white rounded-lg hover:bg-red-600 dark:hover:bg-red-500 transition-colors font-medium"
                  >
                    Disconnect
                  </motion.button>
                </div>
              ) : (
                <div>
                  <p className="mb-4 text-gray-600 dark:text-gray-300 text-center">Connect a wallet to get started</p>
                  {availableWallets.length > 0 ? (
                    availableWallets.map((wallet) => (
                      <WalletButton
                        key={wallet.name}
                        name={wallet.name}
                        icon={wallet.icon}
                        onClick={() => handleConnect(wallet)}
                      />
                    ))
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 p-4 bg-gray-100 dark:bg-navy-700 rounded-lg">
                      <IoWarning size={24} className="mx-auto mb-2" />
                      <p>No compatible wallets found. Please install a supported wallet.</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WalletSelector;