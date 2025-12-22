import React from 'react';
import { Scan, LayoutDashboard, Building2, Users, Settings, BrainCircuit } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onGenerateReport: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onGenerateReport }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'buildings', label: 'Buildings', icon: Building2 },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col sticky top-0 h-screen z-20">
      <div className="p-6 border-b border-gray-100 flex items-center gap-2">
         <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
           <Scan size={24} />
         </div>
         <div>
           <h1 className="text-lg font-bold tracking-tight text-gray-900 leading-none">VeriClean</h1>
           <p className="text-[10px] text-gray-400 font-medium tracking-wide">COMMAND CENTER</p>
         </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === item.id 
                ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon size={18} className={`mr-3 ${activeTab === item.id ? 'text-blue-600' : 'text-gray-400'}`} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
         <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-4 text-white shadow-lg shadow-indigo-200">
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit size={18} className="text-white/90" />
              <span className="font-semibold text-sm">AI Insights</span>
            </div>
            <p className="text-xs text-white/80 mb-3 leading-relaxed">
              Generate shift summaries instantly with Gemini 3.
            </p>
            <button 
              onClick={onGenerateReport}
              className="w-full bg-white/10 hover:bg-white/20 text-xs font-semibold py-2.5 px-3 rounded-lg transition-colors border border-white/20 flex items-center justify-center gap-2"
            >
              Generate Report
            </button>
         </div>
      </div>
    </aside>
  );
};

export default Sidebar;