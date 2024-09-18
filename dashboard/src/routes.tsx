import React from 'react';

// Admin Imports

// Icon Imports
import {
  MdHome,
  MdOutlineShoppingCart,
  MdBarChart,
  MdPerson,
  MdLock,
} from 'react-icons/md';
import { IoEarth } from 'react-icons/io5';
const routes = [
  {
    name: 'Game Hub',
    layout: '/admin',
    path: 'gamehub',
    icon: <MdHome className="h-6 w-6" />,
  },
  // {
  //   name: 'MarketPlace',
  //   layout: '/admin',
  //   path: 'nft-marketplace',
  //   icon: <MdOutlineShoppingCart className="h-6 w-6" />,
  //   secondary: true,
  // },
  // {
  //   name: 'Worlds',
  //   layout: '/admin',
  //   path: 'explore-worlds',
  //   icon: <IoEarth className="h-6 w-6" />,

  // },
  // {
  //   name: 'Create',
  //   layout: '/admin',
  //   path: 'create-world',
  //   icon: <IoEarth className="h-6 w-6" />,

  // },
  // {
  //   name: 'Data Tables',
  //   layout: '/admin',
  //   icon: <MdBarChart className="h-6 w-6" />,
  //   path: 'data-tables',
  // },
  {
    name: 'Profile',
    layout: '/admin',
    path: 'profile',
    icon: <MdPerson className="h-6 w-6" />,
  }
];
export default routes;
