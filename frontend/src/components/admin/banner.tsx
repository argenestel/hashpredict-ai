import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoPersonAdd, IoArrowForward } from 'react-icons/io5';

interface CreatorBannerProps {
    className?: string;
}

export const CreatorBanner: React.FC<CreatorBannerProps> = ({ className = '' }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isHovered, setIsHovered] = useState(false);

    // Check if banner was previously dismissed
    useEffect(() => {
        const isDismissed = localStorage.getItem('creatorBannerDismissed');
        if (isDismissed) {
            setIsVisible(false);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('creatorBannerDismissed', 'true');
    };

    const handleApply = () => {
        // Replace with your Tally form URL
        window.open('https://tally.so/r/w5l6RE', '_blank');
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`relative w-full ${className}`}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-purple-500/10 to-brand-500/10 animate-gradient-x"></div>
                <div className="relative mx-auto max-w-7xl py-3 px-4 sm:px-6 lg:px-8">
                    <div className="pr-16 sm:px-16 sm:text-center">
                        <div className="flex items-center justify-center gap-x-3">
                            <IoPersonAdd 
                                className="h-5 w-5 text-brand-500" 
                                aria-hidden="true" 
                            />
                            <p className="font-medium text-navy-700 dark:text-white">
                                Create markets and shape the future!{' '}
                                <motion.button
                                    onClick={handleApply}
                                    onHoverStart={() => setIsHovered(true)}
                                    onHoverEnd={() => setIsHovered(false)}
                                    className="inline-flex items-center gap-x-1 rounded-full bg-brand-500 px-3 py-1 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Apply as Creator
                                    <motion.div
                                        animate={{ x: isHovered ? 3 : 0 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                    >
                                        <IoArrowForward className="-mr-0.5 h-4 w-4" aria-hidden="true" />
                                    </motion.div>
                                </motion.button>
                            </p>
                        </div>
                    </div>
                    <div className="absolute right-0 top-0 h-full flex items-center pr-4">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleDismiss}
                            type="button"
                            className="flex rounded-md p-1 hover:bg-navy-800/10 focus:outline-none"
                        >
                            <IoClose 
                                className="h-5 w-5 text-navy-700 dark:text-white" 
                                aria-hidden="true" 
                            />
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
