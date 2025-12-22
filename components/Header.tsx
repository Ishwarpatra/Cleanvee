import React from 'react';
import { Building } from '../types';
import { Map, Search, Bell } from 'lucide-react';

interface HeaderProps {
  building: Building;
}

const Header: React.FC<HeaderProps> = ({ building }) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">{building.name}</h2>
        <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
           <Map size={14} className="text-gray-400" /> {building.address.city}, {building.address.state}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
           <input 
             type="text" 
             placeholder="Search logs, alerts, staff..." 
             className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-64 transition-all"
           />
        </div>
        <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white ring-2 ring-white"></span>
        </button>
        <div className="h-9 w-9 bg-gray-200 rounded-full border-2 border-white shadow-sm overflow-hidden ring-1 ring-gray-100">
           <img src="https://picsum.photos/id/64/100/100" alt="Admin" className="w-full h-full object-cover" />
        </div>
      </div>
    </header>
  );
};

export default Header;