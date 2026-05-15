import React, { useState } from 'react';
import { Scan, LayoutDashboard, Building2, Users, Settings, BrainCircuit, LogOut, Loader2 } from 'lucide-react';
import { Role } from '../types';
import { canManageBuildings, canManageTeam, canViewSettings } from '../src/hooks/useAuth';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onGenerateReport: () => void;
  userRole?: Role;
  onLogout?: () => Promise<void>;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onGenerateReport,
  userRole = Role.CLEANER,
  onLogout,
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout?.();
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Define navigation items with role-based visibility
  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, requiredRole: null },
    { id: 'buildings', label: 'Buildings', icon: Building2, requiredRole: Role.MANAGER },
    { id: 'team', label: 'Team', icon: Users, requiredRole: Role.MANAGER },
    { id: 'settings', label: 'Settings', icon: Settings, requiredRole: Role.MANAGER },
  ];

  // Filter items based on user role
  const navItems = allNavItems.filter((item) => {
    if (item.requiredRole === null) return true; // Dashboard is always visible
    if (userRole === Role.ADMIN) return true; // Admin sees everything
    return userRole === item.requiredRole;
  });

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col sticky top-0 h-screen z-20 transition-colors">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
          <Scan size={24} />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white leading-none">Cleanvee</h1>
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
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm ring-1 ring-blue-100 dark:ring-blue-800'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <item.icon
              size={18}
              className={`mr-3 ${
                activeTab === item.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
              }`}
            />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
        {onLogout && (
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Signing out...
              </>
            ) : (
              <>
                <LogOut size={18} />
                Sign Out
              </>
            )}
          </button>
        )}

        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-4 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50">
          <div className="flex items-center gap-2 mb-2">
            <BrainCircuit size={18} className="text-white/90" />
            <span className="font-semibold text-sm">AI Insights</span>
          </div>
          <p className="text-xs text-white/80 mb-3 leading-relaxed">Generate shift summaries instantly with Gemini 3.</p>
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
