import React, { useState } from 'react';
import { Checkpoint } from '../types';
import { AlertTriangle, CheckCircle, HelpCircle, RefreshCcw, MapPin, Layers } from 'lucide-react';

interface FloorPlanProps {
  checkpoints: Checkpoint[];
  onSelectCheckpoint: (id: string) => void;
  selectedCheckpointId: string | null;
}

// Default room layout if checkpoints don't have coordinates
const DEFAULT_ROOM_LAYOUT = [
  { id: 'room-1', label: 'Main Lobby', x: 15, y: 25, width: 25, height: 30, status: 'clean' },
  { id: 'room-2', label: 'Restroom 2F', x: 15, y: 60, width: 20, height: 25, status: 'dirty' },
  { id: 'room-3', label: 'Conf Room A', x: 42, y: 25, width: 20, height: 25, status: 'attention' },
  { id: 'room-4', label: 'Executive Suite', x: 65, y: 25, width: 25, height: 30, status: 'clean' },
  { id: 'room-5', label: 'Kitchen', x: 42, y: 55, width: 20, height: 30, status: 'clean' },
  { id: 'room-6', label: 'Server Room', x: 65, y: 60, width: 25, height: 25, status: 'clean' },
];

const FLOORS = [
  { id: 1, name: 'Level 1 - Main Concourse' },
  { id: 2, name: 'Level 2 - Office Wing' },
  { id: 3, name: 'Level 3 - Executive Floor' },
];

const FloorPlan: React.FC<FloorPlanProps> = ({ checkpoints, onSelectCheckpoint, selectedCheckpointId }) => {
  const [selectedFloor, setSelectedFloor] = useState(1);

  // Use checkpoints if available, otherwise use default layout
  const hasCoordinates = checkpoints.some(cp => cp.x_rel && cp.y_rel);

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'clean': return { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-700' };
      case 'dirty': return { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700' };
      case 'attention': return { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-700' };
      default: return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600' };
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'clean': return <CheckCircle size={16} className="text-emerald-600" />;
      case 'dirty': return <AlertTriangle size={16} className="text-red-600" />;
      case 'attention': return <RefreshCcw size={16} className="text-amber-600" />;
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

  // Transform checkpoints to rooms for display
  const rooms = hasCoordinates
    ? checkpoints.map((cp, index) => ({
      id: cp.id,
      label: cp.location_label,
      x: cp.x_rel || (15 + (index % 3) * 28),
      y: cp.y_rel || (25 + Math.floor(index / 3) * 35),
      width: 22,
      height: 28,
      status: cp.current_status
    }))
    : DEFAULT_ROOM_LAYOUT;

  return (
    <div className="relative w-full h-full min-h-[400px] bg-gradient-to-br from-gray-50 to-slate-100 rounded-xl overflow-hidden border border-gray-200">
      {/* Floor Selector */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <div className="bg-white/95 backdrop-blur-md px-2 py-1.5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-2">
          <Layers size={14} className="text-blue-500" />
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(parseInt(e.target.value))}
            className="text-xs font-semibold text-gray-700 bg-transparent focus:outline-none cursor-pointer"
          >
            {FLOORS.map(floor => (
              <option key={floor.id} value={floor.id}>{floor.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Room Count Badge */}
      <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm text-xs font-medium text-gray-600">
        {rooms.length} Rooms
      </div>

      {/* Architectural Background Grid */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <svg width="100%" height="100%">
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Building Outline */}
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
              className={`absolute transition-all duration-200 rounded-lg border-2 ${colors.bg} ${colors.border} hover:shadow-lg hover:scale-[1.02] group ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 shadow-lg scale-[1.02] z-20' : 'z-10'
                }`}
              style={{
                left: `${room.x}%`,
                top: `${room.y}%`,
                width: `${room.width}%`,
                height: `${room.height}%`
              }}
            >
              {/* Room Content */}
              <div className="absolute inset-0 p-2 flex flex-col items-center justify-center">
                {/* Status Icon */}
                <div className="mb-1.5">
                  {getStatusIcon(room.status)}
                </div>

                {/* Room Label */}
                <span className={`text-xs font-semibold ${colors.text} text-center leading-tight`}>
                  {room.label}
                </span>

                {/* Status Indicator Dot */}
                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${getStatusDotColor(room.status)}`} />
              </div>

              {/* Hover Tooltip */}
              <div className={`absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-medium px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 ${isSelected ? 'opacity-100' : ''}`}>
                Click to view details
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 transform rotate-45" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Entrance Label */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
        <MapPin size={10} />
        Main Entrance
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-gray-600">Clean</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-gray-600">Review</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-gray-600">Hazard</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloorPlan;