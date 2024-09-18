"use client"
import { useState } from 'react';
import Image from 'next/image';
import { IoHeart, IoHeartOutline } from 'react-icons/io5';

const WorldCard = ({ image, title, description,onsingle,onmulti}) => {
    const [liked, setLiked] = useState(false);

    return (
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg dark:bg-navy-700 p-5 transition-transform transform hover:scale-105">
            <div className="relative w-full">
                <Image
                    src={image}
                    alt={title}
                    className="rounded-xl mb-4"
                    layout="responsive"
                    width={300}
                    height={150}
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
                    className="w-full py-2 text-center bg-blueSecondary text-white rounded-lg hover:bg-blue-600"
                    onClick={onsingle}
                >
                    Single Player
                </button>
                <button
                    className="w-full py-2 text-center bg-blueSecondary text-white rounded-lg hover:bg-blue-600"
                    onClick={onmulti}
                >
                    Multi Player
                </button>
              
            </div>
        </div>
    );
}

export default WorldCard;