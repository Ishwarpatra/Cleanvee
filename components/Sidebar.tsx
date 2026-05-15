import React, { useState } from 'react';
import { Scan, LayoutDashboard, Building2, Users, Settings, BrainCircuit, LogOut, Loader2, Menu, X } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout?.();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
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

  const navContent = (
    <>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
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
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
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
        {navContent}
      </aside>

      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between z-40">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
            <Scan size={20} />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Cleanvee</h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <aside className="md:hidden fixed left-0 top-16 bottom-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40 flex flex-col overflow-y-auto">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
              <Scan size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white leading-none">Cleanvee</h1>
              <p className="text-[10px] text-gray-400 font-medium tracking-wide">COMMAND CENTER</p>
            </div>
          </div>
          {navContent}
        </aside>
      )}
    </>
  );
};

export default Sidebar;
