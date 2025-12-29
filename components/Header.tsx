import React from 'react';
import { Building } from '../types';
import { MapPin, Search, ChevronDown, Building2 } from 'lucide-react';
import NotificationDropdown from './ui/NotificationDropdown';
import ProfileDropdown from './ui/ProfileDropdown';

interface HeaderProps {
  building: Building;
  buildings?: { id: string; name: string; city: string }[];
  onBuildingChange?: (buildingId: string) => void;
}

// Available buildings for selection
const AVAILABLE_BUILDINGS = [
  { id: 'b1', name: 'Apex Tower HQ', city: 'San Francisco, CA' },
  { id: 'b2', name: 'Westside Logistics', city: 'Oakland, CA' },
  { id: 'b3', name: 'Downtown Medical Center', city: 'San Jose, CA' },
  { id: 'b4', name: 'Tech Campus Alpha', city: 'Palo Alto, CA' },
];

const Header: React.FC<HeaderProps> = ({
  building,
  buildings = AVAILABLE_BUILDINGS,
  onBuildingChange
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectBuilding = (buildingId: string) => {
    if (onBuildingChange) {
      onBuildingChange(buildingId);
    }
    setIsDropdownOpen(false);
    console.log(`Switched to building: ${buildingId}`);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
      {/* Building Selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-3 p-2 -ml-2 rounded-lg hover:bg-gray-50 transition-colors group"
        >
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-200 transition-colors">
            <Building2 size={20} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">{building.name}</h2>
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <MapPin size={12} className="text-gray-400" />
              {building.address.city}, {building.address.state}
            </p>
          </div>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Switch Building</p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {buildings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleSelectBuilding(b.id)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left ${building.name === b.name ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                >
                  <div className={`p-2 rounded-lg ${building.name === b.name ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Building2 size={16} />
                  </div>
                  <div>
                    <p className={`font-medium ${building.name === b.name ? 'text-blue-600' : 'text-gray-900'}`}>
                      {b.name}
                    </p>
                    <p className="text-xs text-gray-500">{b.city}</p>
                  </div>
                  {building.name === b.name && (
                    <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-medium">
                      Current
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                + Add New Building
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Side Controls */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search logs, alerts, staff..."
            className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-64 transition-all"
          />
        </div>

        {/* Notification Dropdown */}
        <NotificationDropdown />

        {/* Profile Dropdown */}
        <ProfileDropdown />
      </div>
    </header>
  );
};

export default Header;