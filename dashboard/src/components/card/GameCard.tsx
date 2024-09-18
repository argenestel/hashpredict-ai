import { useState } from 'react';
import Image from 'next/image';
import { IoHeart, IoHeartOutline } from 'react-icons/io5';

const GameCard = ({ image, title, description, onPlayMainnet, onExploreWorld, onMakeMod, modLink, isReleased }) => {
  const [liked, setLiked] = useState(false);

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg dark:bg-navy-800 p-5 transition-transform transform hover:scale-105">
      <div className="relative w-full h-48"> {/* Fixed height for consistent sizing */}
        <Image
          src={image}
          alt={title}
          className="rounded-xl"
          layout="fill"
          objectFit="cover"
        />
        <button
          onClick={() => setLiked(!liked)}
          className="absolute right-3 top-3 flex items-center justify-center rounded-full bg-white p-2 text-brand-500 hover:cursor-pointer"
        >
          {liked ? (
            <IoHeart className="text-red-500 h-6 w-6" />
          ) : (
            <IoHeartOutline className="text-gray-500 h-6 w-6" />
          )}
        </button>
      </div>
      <div className="flex flex-col items-start w-full p-3">
        <h3 className="text-2xl font-bold text-navy-700 dark:text-white mb-2">{title}</h3>
        <p className="text-md text-gray-600 dark:text-gray-300 mb-4">{description}</p>
      </div>
      <div className="w-full flex flex-col space-y-3">
        <button
          className="w-full py-2 text-center bg-indigo-700 text-white rounded-lg hover:bg-indigo-600"
          onClick={onPlayMainnet}
        >
          Play Mainnet
        </button>
        {/* <button
          className="w-full py-2 text-center bg-indigo-700 text-white rounded-lg hover:bg-indigo-600"
          onClick={onExploreWorld}
        >
          Explore World
        </button> */}
        {isReleased  ? ( 
        <button
          className="w-full py-2 text-center bg-indigo-700 text-white rounded-lg hover:bg-indigo-600"
          onClick={onMakeMod}
        >
          Create Item
        </button>) : (
        <button
        className="w-full py-2 text-center bg-red-400 text-white rounded-lg"
      >
        Coming Soon
      </button>
        )}
        {/* <button
          className={`w-full py-2 text-center rounded-lg ${modLink ? 'bg-indigo-700 text-white hover:bg-indigo-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
          onClick={() => modLink && window.open(modLink, '_blank')}
          disabled={!modLink}
        >
          Play Moded Version
        </button> */}
      </div>
    </div>
  );
};

export default GameCard;