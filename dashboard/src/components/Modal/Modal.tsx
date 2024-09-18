import React from 'react';
import Card from 'components/card';
import Image from 'next/image';
import { IoClose } from 'react-icons/io5';

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
      <div className="relative w-auto max-w-3xl mx-auto my-6">
        <div className="relative flex flex-col w-full bg-white dark:bg-navy-700 border-0 rounded-lg shadow-lg outline-none focus:outline-none">
          {children}
        </div>
      </div>
    </div>
  );
};

const NftSelectionModal = ({ isOpen, onClose, ownedNFTs, onSelectNFT }) => {
  console.log("Modal open state:", isOpen);
  console.log("Owned NFTs:", ownedNFTs);

  const handleNftSelect = (nft) => {
    console.log("Selected NFT object:", nft);
    
    if (!nft) {
      console.error("Selected NFT is undefined or null");
      return;
    }

    if (!nft || !nft.uri) {
      console.error("Selected NFT does not have a 'content.uri' property:", nft);
      return;
    }

    console.log("Selected NFT URI:", nft.uri);
    onSelectNFT(nft.uri);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex items-start justify-between p-5 border-b border-solid border-gray-300 rounded-t">
        <h3 className="text-2xl font-semibold text-navy-700 dark:text-white">
          Select an NFT
        </h3>
        <button
          className="p-1 ml-auto bg-transparent border-0 text-gray-500 float-right text-3xl leading-none font-semibold outline-none focus:outline-none hover:text-gray-700"
          onClick={onClose}
        >
          <IoClose />
        </button>
      </div>
      <div className="relative p-6 flex-auto max-h-[70vh] overflow-y-auto">
        {ownedNFTs && ownedNFTs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {ownedNFTs.map((nft, index) => (
              <Card
                key={nft.id || index}
                extra="flex flex-col w-full h-full !p-4 3xl:p-![18px] bg-white dark:bg-navy-800"
              >
                <div className="relative w-full h-48 mb-3">
                  {nft && nft.uri ? (
                    <Image
                      src={nft.uri}
                      alt={nft?.name || 'NFT Image'}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-xl"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded-xl flex items-center justify-center">
                      <p className="text-gray-500">No image available</p>
                    </div>
                  )}
                </div>
                <p className="text-lg font-bold text-navy-700 dark:text-white mb-2">
                  {nft?.name || 'Unnamed NFT'}
                </p>
                <button
                  onClick={() => handleNftSelect(nft)}
                  className="mt-auto linear rounded-xl bg-brand-500 px-4 py-2 text-base font-medium text-white transition duration-200 hover:bg-brand-600 active:bg-brand-700 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-300 dark:active:bg-brand-200"
                >
                  Choose NFT
                </button>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">No NFTs found in your wallet.</p>
        )}
      </div>
    </Modal>
  );
};

export default NftSelectionModal;