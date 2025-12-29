import React, { useState } from 'react';
import { Checkpoint } from '../types';
import { AlertTriangle, CheckCircle, HelpCircle, RefreshCcw, MapPin, Layers } from 'lucide-react';

interface FloorPlanProps {
  checkpoints: Checkpoint[];
  onSelectCheckpoint: (id: string) => void;
  selectedCheckpointId: string | null;
  buildingId?: string;
}

// Building-specific room layouts
const BUILDING_ROOMS: Record<string, { id: string; label: string; x: number; y: number; width: number; height: number; status: string }[]> = {
  'bldg-001': [
    { id: 'room-1', label: 'Main Lobby', x: 15, y: 25, width: 25, height: 30, status: 'clean' },
    { id: 'room-2', label: 'Restroom 2F', x: 15, y: 60, width: 20, height: 25, status: 'dirty' },
    { id: 'room-3', label: 'Conf Room A', x: 42, y: 25, width: 20, height: 25, status: 'attention' },
    { id: 'room-4', label: 'Executive Suite', x: 65, y: 25, width: 25, height: 30, status: 'clean' },
    { id: 'room-5', label: 'Kitchen', x: 42, y: 55, width: 20, height: 30, status: 'clean' },
    { id: 'room-6', label: 'Server Room', x: 65, y: 60, width: 25, height: 25, status: 'clean' },
  ],
  'bldg-002': [
    { id: 'room-1', label: 'Loading Dock', x: 10, y: 20, width: 35, height: 25, status: 'dirty' },
    { id: 'room-2', label: 'Warehouse A', x: 10, y: 50, width: 35, height: 35, status: 'attention' },
    { id: 'room-3', label: 'Warehouse B', x: 50, y: 20, width: 40, height: 35, status: 'clean' },
    { id: 'room-4', label: 'Break Room', x: 50, y: 60, width: 20, height: 25, status: 'dirty' },
    { id: 'room-5', label: 'Office Area', x: 73, y: 60, width: 17, height: 25, status: 'attention' },
  ],
  'bldg-003': [
    { id: 'room-1', label: 'Reception', x: 35, y: 15, width: 30, height: 20, status: 'clean' },
    { id: 'room-2', label: 'ER Wing', x: 10, y: 40, width: 25, height: 30, status: 'clean' },
    { id: 'room-3', label: 'ICU', x: 38, y: 40, width: 24, height: 30, status: 'clean' },
    { id: 'room-4', label: 'Surgery', x: 65, y: 40, width: 25, height: 30, status: 'clean' },
    { id: 'room-5', label: 'Lab', x: 10, y: 75, width: 20, height: 15, status: 'clean' },
    { id: 'room-6', label: 'Pharmacy', x: 35, y: 75, width: 20, height: 15, status: 'clean' },
    { id: 'room-7', label: 'Radiology', x: 60, y: 75, width: 30, height: 15, status: 'clean' },
  ],
  'bldg-004': [
    { id: 'room-1', label: 'Open Office', x: 10, y: 20, width: 50, height: 35, status: 'dirty' },
    { id: 'room-2', label: 'Meeting Pod 1', x: 65, y: 20, width: 25, height: 17, status: 'attention' },
    { id: 'room-3', label: 'Meeting Pod 2', x: 65, y: 40, width: 25, height: 15, status: 'dirty' },
    { id: 'room-4', label: 'Cafeteria', x: 10, y: 60, width: 30, height: 28, status: 'dirty' },
    { id: 'room-5', label: 'Gym', x: 45, y: 60, width: 25, height: 28, status: 'attention' },
    { id: 'room-6', label: 'Lounge', x: 73, y: 60, width: 17, height: 28, status: 'dirty' },
  ],
};

const BUILDING_FLOORS: Record<string, { id: number; name: string }[]> = {
  'bldg-001': [
    { id: 1, name: 'Level 1 - Main Concourse' },
    { id: 2, name: 'Level 2 - Office Wing' },
    { id: 3, name: 'Level 3 - Executive Floor' },
  ],
  'bldg-002': [
    { id: 1, name: 'Ground Floor - Logistics' },
    { id: 2, name: 'Mezzanine - Storage' },
  ],
  'bldg-003': [
    { id: 1, name: 'Ground - Emergency' },
    { id: 2, name: 'Level 2 - Inpatient' },
    { id: 3, name: 'Level 3 - Surgery' },
    { id: 4, name: 'Level 4 - Admin' },
  ],
  'bldg-004': [
    { id: 1, name: 'Ground Floor - Common' },
    { id: 2, name: 'Level 2 - Engineering' },
    { id: 3, name: 'Level 3 - Product' },
  ],
};

const FloorPlan: React.FC<FloorPlanProps> = ({ checkpoints, onSelectCheckpoint, selectedCheckpointId, buildingId = 'bldg-001' }) => {
  const [selectedFloor, setSelectedFloor] = useState(1);

  // Get building-specific data
  const rooms = BUILDING_ROOMS[buildingId] || BUILDING_ROOMS['bldg-001'];
  const floors = BUILDING_FLOORS[buildingId] || BUILDING_FLOORS['bldg-001'];

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'clean': return { bg: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-emerald-400 dark:border-emerald-600', text: 'text-emerald-700 dark:text-emerald-300' };
      case 'dirty': return { bg: 'bg-red-100 dark:bg-red-900/40', border: 'border-red-400 dark:border-red-600', text: 'text-red-700 dark:text-red-300' };
      case 'attention': return { bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-400 dark:border-amber-600', text: 'text-amber-700 dark:text-amber-300' };
      default: return { bg: 'bg-gray-100 dark:bg-gray-700', border: 'border-gray-300 dark:border-gray-600', text: 'text-gray-600 dark:text-gray-400' };
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'clean': return <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />;
      case 'dirty': return <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />;
      case 'attention': return <RefreshCcw size={16} className="text-amber-600 dark:text-amber-400" />;
      default: return <HelpCircle size={16} className="text-gray-500" />;
    }
  };

  const getStatusDotColor = (status: string | undefined) => {
    switch (status) {
      case 'clean': return 'bg-emerald-500';
      case 'dirty': return 'bg-red-500 animate-pulse';
      case 'attention': return 'bg-amber-500';
      default: return 'bg-gray-400';
    }
  };

  // Count status
  const cleanCount = rooms.filter(r => r.status === 'clean').length;
  const attentionCount = rooms.filter(r => r.status === 'attention').length;
  const dirtyCount = rooms.filter(r => r.status === 'dirty').length;

  return (
    <div className="relative w-full h-full min-h-[400px] bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors">
      {/* Floor Selector */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm flex items-center gap-2">
          <Layers size={14} className="text-blue-500" />
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(parseInt(e.target.value))}
            className="text-xs font-semibold text-gray-700 dark:text-gray-200 bg-transparent focus:outline-none cursor-pointer"
          >
            {floors.map(floor => (
              <option key={floor.id} value={floor.id} className="dark:bg-gray-800">{floor.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Room Count Badge */}
      <div className="absolute top-4 right-4 z-20 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm text-xs font-medium text-gray-600 dark:text-gray-300">
        {rooms.length} Rooms
      </div>

      {/* Architectural Background Grid */}
      <div className="absolute inset-0 opacity-30 dark:opacity-20 pointer-events-none">
        <svg width="100%" height="100%">
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <rect x="8%" y="12%" width="84%" height="78%" fill="none" stroke="#64748b" strokeWidth="2" rx="4" />
        </svg>
      </div>

      {/* Rooms */}
      <div className="absolute inset-0 p-4">
        {rooms.map((room) => {
          const colors = getStatusColor(room.status);
          const isSelected = selectedCheckpointId === room.id;

          return (
            <button
              key={room.id}
              onClick={() => onSelectCheckpoint(room.id)}
              className={`absolute transition-all duration-200 rounded-lg border-2 ${colors.bg} ${colors.border} hover:shadow-lg hover:scale-[1.02] group ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900 shadow-lg scale-[1.02] z-20' : 'z-10'
                }`}
              style={{
                left: `${room.x}%`,
                top: `${room.y}%`,
                width: `${room.width}%`,
                height: `${room.height}%`
              }}
            >
              <div className="absolute inset-0 p-2 flex flex-col items-center justify-center">
                <div className="mb-1.5">
                  {getStatusIcon(room.status)}
                </div>
                <span className={`text-xs font-semibold ${colors.text} text-center leading-tight`}>
                  {room.label}
                </span>
                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${getStatusDotColor(room.status)}`} />
              </div>

              <div className={`absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-medium px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 ${isSelected ? 'opacity-100' : ''}`}>
                Click to view details
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 transform rotate-45" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Entrance Label */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 dark:text-gray-500 font-mono uppercase tracking-wider flex items-center gap-1.5">
        <MapPin size={10} />
        Main Entrance
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-gray-600 dark:text-gray-300">Clean ({cleanCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-gray-600 dark:text-gray-300">Review ({attentionCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-gray-600 dark:text-gray-300">Hazard ({dirtyCount})</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloorPlan;