import React from 'react';
import { Checkpoint } from '../types';
import { AlertTriangle, CheckCircle, HelpCircle, RefreshCcw, MapPin } from 'lucide-react';

interface FloorPlanProps {
  checkpoints: Checkpoint[];
  onSelectCheckpoint: (id: string) => void;
  selectedCheckpointId: string | null;
}

const FloorPlan: React.FC<FloorPlanProps> = ({ checkpoints, onSelectCheckpoint, selectedCheckpointId }) => {
  
  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'clean': return 'bg-emerald-500 shadow-emerald-200';
      case 'dirty': return 'bg-red-500 shadow-red-200 animate-pulse';
      case 'attention': return 'bg-amber-500 shadow-amber-200';
      default: return 'bg-gray-400 shadow-gray-200';
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'clean': return <CheckCircle size={14} className="text-white" />;
      case 'dirty': return <AlertTriangle size={14} className="text-white" />;
      case 'attention': return <RefreshCcw size={14} className="text-white" />;
      default: return <HelpCircle size={14} className="text-white" />;
    }
  };

  return (
    <div className="relative w-full h-96 bg-gray-50 rounded-xl overflow-hidden border border-gray-200 shadow-inner group">
      {/* Architectural Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
         <svg width="100%" height="100%">
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Architectural Lines */}
            <g stroke="#334155" strokeWidth="3" fill="none">
               <rect x="10%" y="10%" width="80%" height="80%" />
               {/* Internal Walls */}
               <path d="M 10% 40% L 35% 40%" />
               <path d="M 65% 40% L 90% 40%" />
               <path d="M 50% 40% L 50% 90%" />
               <path d="M 35% 10% L 35% 25%" />
               <path d="M 65% 10% L 65% 25%" />
            </g>
            
            {/* Zone Labels */}
            <text x="50%" y="95%" textAnchor="middle" className="text-[10px] fill-gray-400 font-mono">MAIN ENTRANCE</text>
         </svg>
      </div>

      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm text-xs font-mono font-bold text-gray-600 flex items-center gap-2">
        <MapPin size={12} className="text-blue-500" />
        LEVEL 1 - MAIN CONCOURSE
      </div>

      {checkpoints.map((cp) => (
        <button
          key={cp.id}
          onClick={() => onSelectCheckpoint(cp.id)}
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
             selectedCheckpointId === cp.id ? 'scale-125 z-30' : 'hover:scale-110 z-20'
          }`}
          style={{ left: `${cp.x_rel}%`, top: `${cp.y_rel}%` }}
        >
          <div className="relative group/pin">
            {/* Ripple Effect for Attention/Dirty */}
            {(cp.current_status === 'dirty' || cp.current_status === 'attention') && (
               <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${cp.current_status === 'dirty' ? 'bg-red-400' : 'bg-amber-400'}`}></span>
            )}
            
            <div className={`relative w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-colors border-2 border-white ${getStatusColor(cp.current_status)}`}>
              {getStatusIcon(cp.current_status)}
            </div>
            
            {/* Tooltip Label */}
            <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-semibold px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-none transform translate-y-1 group-hover/pin:translate-y-0 ${selectedCheckpointId === cp.id ? 'opacity-100 translate-y-0' : ''}`}>
              {cp.location_label}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default FloorPlan;