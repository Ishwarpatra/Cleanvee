import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, CheckSquare, AlertTriangle, Clock } from 'lucide-react';

const StatsOverview = () => {
  // Mock data for the sparkline chart
  const data = [
    { name: '6am', score: 85 },
    { name: '8am', score: 92 },
    { name: '10am', score: 88 },
    { name: '12pm', score: 95 },
    { name: '2pm', score: 90 },
    { name: '4pm', score: 98 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Avg Quality Score</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">94%</h3>
          </div>
          <div className="p-2 bg-green-50 rounded-lg text-green-600">
            <ArrowUpRight size={20} />
          </div>
        </div>
        <div className="h-10 mt-2">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Tasks Completed</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">42<span className="text-sm text-gray-400 font-normal">/50</span></h3>
          </div>
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <CheckSquare size={20} />
          </div>
        </div>
        <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '84%' }}></div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Active Hazards</p>
            <h3 className="text-2xl font-bold text-red-600 mt-1">1</h3>
          </div>
          <div className="p-2 bg-red-50 rounded-lg text-red-600">
            <AlertTriangle size={20} />
          </div>
        </div>
         <p className="text-xs text-red-500 mt-4 font-medium">Restroom A - Needs Action</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Avg Response Time</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">12m</h3>
          </div>
          <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
            <Clock size={20} />
          </div>
        </div>
        <p className="text-xs text-green-600 mt-4 flex items-center">
            <span className="font-bold mr-1">-2m</span> vs last week
        </p>
      </div>

    </div>
  );
};

export default StatsOverview;
