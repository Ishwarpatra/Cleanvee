import React from 'react';
import { Building } from '../types';
import { MapPin, Search, ChevronDown, Building2 } from 'lucide-react';
import NotificationDropdown from './ui/NotificationDropdown';
import ProfileDropdown from './ui/ProfileDropdown';

interface HeaderProps {
  building: Building;
  buildings?: { id: string; name: string; city: string }[];
  onBuildingChange?: (buildingId: string) => void;
  onNavigateToSettings?: () => void;
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
  onBuildingChange,
  onNavigateToSettings
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
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm transition-colors">
      {/* Building Selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-3 p-2 -ml-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
        >
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-900 transition-colors">
            <Building2 size={20} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{building.name}</h2>
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <MapPin size={12} className="text-gray-400" />
              {building.address.city}, {building.address.state}
            </p>
          </div>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Switch Building</p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {buildings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleSelectBuilding(b.id)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-left ${building.name === b.name ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-600' : ''
                    }`}
                >
                  <div className={`p-2 rounded-lg ${building.name === b.name ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                    <Building2 size={16} />
                  </div>
                  <div>
                    <p className={`font-medium ${building.name === b.name ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                      {b.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{b.city}</p>
                  </div>
                  {building.name === b.name && (
                    <span className="ml-auto text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-medium">
                      Current
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
              <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">
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
            className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-64 transition-all"
          />
        </div>

        {/* Notification Dropdown */}
        <NotificationDropdown />

        {/* Profile Dropdown */}
        <ProfileDropdown onNavigateToSettings={onNavigateToSettings} />
      </div>
    </header>
  );
};

export default Header;