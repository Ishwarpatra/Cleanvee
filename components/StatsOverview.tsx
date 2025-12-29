import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, CheckSquare, AlertTriangle, Clock, ArrowDownRight } from 'lucide-react';

interface StatsOverviewProps {
  buildingId?: string;
  buildingName?: string;
}

// Building-specific stats data
const BUILDING_STATS: Record<string, {
  qualityScore: number;
  qualityTrend: number[];
  tasksCompleted: number;
  totalTasks: number;
  activeHazards: number;
  hazardLocation: string;
  responseTime: number;
  responseChange: number;
}> = {
  'bldg-001': {
    qualityScore: 94,
    qualityTrend: [85, 92, 88, 95, 90, 98],
    tasksCompleted: 42,
    totalTasks: 50,
    activeHazards: 1,
    hazardLocation: 'Restroom A - Needs Action',
    responseTime: 12,
    responseChange: -2
  },
  'bldg-002': {
    qualityScore: 87,
    qualityTrend: [78, 82, 85, 80, 88, 90],
    tasksCompleted: 28,
    totalTasks: 35,
    activeHazards: 3,
    hazardLocation: 'Loading Dock, Break Room',
    responseTime: 18,
    responseChange: 3
  },
  'bldg-003': {
    qualityScore: 99,
    qualityTrend: [95, 97, 98, 99, 98, 99],
    tasksCompleted: 58,
    totalTasks: 60,
    activeHazards: 0,
    hazardLocation: 'None',
    responseTime: 8,
    responseChange: -5
  },
  'bldg-004': {
    qualityScore: 76,
    qualityTrend: [70, 75, 72, 78, 74, 80],
    tasksCompleted: 15,
    totalTasks: 25,
    activeHazards: 5,
    hazardLocation: 'Multiple Areas - Critical',
    responseTime: 25,
    responseChange: 8
  }
};

const StatsOverview: React.FC<StatsOverviewProps> = ({ buildingId = 'bldg-001', buildingName }) => {
  // Get building-specific stats or default to first building
  const stats = BUILDING_STATS[buildingId] || BUILDING_STATS['bldg-001'];

  // Transform trend data for chart
  const chartData = stats.qualityTrend.map((score, index) => ({
    name: `${6 + index * 2}${index < 3 ? 'am' : 'pm'}`,
    score
  }));

  const completionPercent = Math.round((stats.tasksCompleted / stats.totalTasks) * 100);
  const isPositiveResponse = stats.responseChange <= 0;
  const isGoodQuality = stats.qualityScore >= 90;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

      {/* Quality Score */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg Quality Score</p>
            <h3 className={`text-2xl font-bold mt-1 ${isGoodQuality ? 'text-gray-900 dark:text-white' : 'text-amber-600 dark:text-amber-400'}`}>
              {stats.qualityScore}%
            </h3>
          </div>
          <div className={`p-2 rounded-lg ${isGoodQuality ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
            {isGoodQuality ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
          </div>
        </div>
        <div className="h-10 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`colorScore-${buildingId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isGoodQuality ? "#10b981" : "#f59e0b"} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={isGoodQuality ? "#10b981" : "#f59e0b"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="score"
                stroke={isGoodQuality ? "#10b981" : "#f59e0b"}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#colorScore-${buildingId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tasks Completed */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tasks Completed</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {stats.tasksCompleted}<span className="text-sm text-gray-400 dark:text-gray-500 font-normal">/{stats.totalTasks}</span>
            </h3>
          </div>
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <CheckSquare size={20} />
          </div>
        </div>
        <div className="mt-4 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${completionPercent >= 80 ? 'bg-blue-600' : 'bg-amber-500'}`}
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* Active Hazards */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Active Hazards</p>
            <h3 className={`text-2xl font-bold mt-1 ${stats.activeHazards > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {stats.activeHazards}
            </h3>
          </div>
          <div className={`p-2 rounded-lg ${stats.activeHazards > 0 ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
            <AlertTriangle size={20} />
          </div>
        </div>
        <p className={`text-xs mt-4 font-medium ${stats.activeHazards > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>
          {stats.hazardLocation}
        </p>
      </div>

      {/* Response Time */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg Response Time</p>
            <h3 className={`text-2xl font-bold mt-1 ${stats.responseTime <= 15 ? 'text-gray-900 dark:text-white' : 'text-amber-600 dark:text-amber-400'}`}>
              {stats.responseTime}m
            </h3>
          </div>
          <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
            <Clock size={20} />
          </div>
        </div>
        <p className={`text-xs mt-4 flex items-center ${isPositiveResponse ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
          <span className="font-bold mr-1">
            {stats.responseChange > 0 ? '+' : ''}{stats.responseChange}m
          </span>
          vs last week
        </p>
      </div>

    </div>
  );
};

export default StatsOverview;
