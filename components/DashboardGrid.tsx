import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Users, CheckCircle, Clock, AlertOctagon, Map, LayoutGrid, ChevronDown } from 'lucide-react';
import { CleaningLog, Checkpoint } from '../types';

// Mock Data for demonstration
// MOCK_CHECKPOINTS removed, using props instead

interface DashboardGridProps {
  checkpoints?: Checkpoint[];
  logs?: CleaningLog[];
  onSelectCheckpoint?: (id: string) => void;
}

const DashboardGrid: React.FC<DashboardGridProps> = ({ checkpoints = [], logs = [], onSelectCheckpoint }) => {
  // selectedBuilding state removed, buildingId should come from context/props
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  // Filter data based on selection
  const filteredCheckpoints = checkpoints; // Assuming checkpoints are already filtered by buildingId from useFirestoreData

  // Dynamic Stats Calculation
  const totalRooms = checkpoints.length;
  const overdueRooms = checkpoints.filter(c => c.current_status === 'overdue').length;
  const cleanRooms = checkpoints.filter(c => c.current_status === 'clean').length;

  return (
    <div className="space-y-6">
      {/* 1. Dashboard Header with Building Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operations Overview</h1>
          {/* Building selector removed, handled by Header component */}
          <p className="text-gray-500 text-sm">Real-time facility status monitoring</p>
        </div>


      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Coverage"
          value={`${Math.round((cleanRooms / (totalRooms || 1)) * 100)}%`}
          trend="+2.5%"
          icon={CheckCircle}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard
          title="SLA Breaches"
          value={overdueRooms.toString()}
          trend={overdueRooms > 0 ? "+1" : "0"}
          trendColor={overdueRooms > 0 ? "text-red-500" : "text-green-500"}
          icon={Clock}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <StatCard title="Active Staff" value="12" trend="Stable" icon={Users} color="text-blue-600" bgColor="bg-blue-50" />
        <StatCard title="Critical Issues" value="1" trend="-2" icon={AlertOctagon} color="text-red-600" bgColor="bg-red-50" />
      </div>

      {/* 3. Live Room Status Grid */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-semibold text-gray-900">Live Room Status</h3>

          {/* View Toggle Buttons */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'map' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Map size={18} />
            </button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCheckpoints.map((checkpoint) => (
              <RoomCard key={checkpoint.id} checkpoint={checkpoint} onSelectCheckpoint={onSelectCheckpoint} />
            ))}

            {filteredCheckpoints.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-400">No rooms configured for this building.</div>
            )}
          </div>
        ) : (
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200">
            <div className="text-center text-gray-400">
              <Map size={32} className="mx-auto mb-2 opacity-50" />
              <p>Interactive Floor Plan View</p>
              <span className="text-xs">(Upload SVG map in Settings to enable)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Helper Components ---

interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  trendColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, icon: Icon, color, bgColor, trendColor = "text-green-500" }) => (
  <div className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      </div>
      <div className={`p-2 rounded-lg ${bgColor} ${color}`}>
        <Icon size={20} />
      </div>
    </div>
    <div className="mt-4 flex items-center text-xs">
      <span className={`font-medium ${trendColor} flex items-center`}>
        {trend.includes('+') ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
        {trend}
      </span>
      <span className="text-gray-400 ml-2">vs last shift</span>
    </div>
  </div>
);

const RoomCard: React.FC<{ checkpoint: Checkpoint; onSelectCheckpoint?: (id: string) => void }> = ({ checkpoint, onSelectCheckpoint }) => {
  // Determine Color Logic
  let statusColors = "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700";
  let icon = <CheckCircle size={16} className="text-gray-400" />;

  if (checkpoint.current_status === 'clean') {
    statusColors = "bg-green-50 border-green-200 hover:border-green-300";
    icon = <CheckCircle size={16} className="text-green-600" />;
  } else if (checkpoint.current_status === 'overdue') {
    statusColors = "bg-amber-50 border-amber-200 hover:border-amber-300";
    icon = <Clock size={16} className="text-amber-600" />;
  } else if (checkpoint.current_status === 'dirty') {
    statusColors = "bg-red-50 border-red-200 hover:border-red-300";
    icon = <AlertOctagon size={16} className="text-red-600" />;
  }

  return (
    <div
      className={`p-4 rounded-lg border transition-all cursor-pointer hover:shadow-sm ${statusColors}`}
      onClick={() => onSelectCheckpoint?.(checkpoint.id)}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="font-semibold text-gray-800 dark:text-white truncate">{checkpoint.location_label}</span>
        {icon}
      </div>
      <div className="text-xs text-gray-500">
        <p>Status: <span className="font-medium">{checkpoint.current_status}</span></p>
        <p>Last: {checkpoint.last_cleaned_timestamp ? new Date(checkpoint.last_cleaned_timestamp).toLocaleString() : 'N/A'}</p>
      </div>
    </div>
  );
};

export default DashboardGrid;