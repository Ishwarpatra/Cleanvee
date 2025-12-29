import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, HelpCircle, LogOut, Moon, Sun, ChevronRight, X, Mail, Phone, Building2 } from 'lucide-react';
import { useTheme } from '../../src/contexts/ThemeContext';

interface ProfileDropdownProps {
    userName?: string;
    userRole?: string;
    userEmail?: string;
    avatarUrl?: string;
    onNavigateToSettings?: () => void;
    onSignOut?: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
    userName = "Facility Manager",
    userRole = "Administrator",
    userEmail = "admin@vericlean.com",
    avatarUrl = "https://picsum.photos/id/64/100/100",
    onNavigateToSettings,
    onSignOut
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Use theme context
    const { isDarkMode, toggleDarkMode } = useTheme();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAccountSettings = () => {
        setIsOpen(false);
        if (onNavigateToSettings) {
            onNavigateToSettings();
        }
    };

    const handleSignOut = () => {
        setShowSignOutConfirm(true);
        setIsOpen(false);
    };

    const confirmSignOut = () => {
        console.log('User signed out');
        if (onSignOut) {
            onSignOut();
        }
        setShowSignOutConfirm(false);
        alert('You have been signed out. In a production app, you would be redirected to the login page.');
    };

    return (
        <>
            <div className="relative" ref={dropdownRef}>
                {/* Avatar Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="h-9 w-9 rounded-full border-2 border-white dark:border-gray-700 shadow-sm overflow-hidden ring-2 ring-gray-100 dark:ring-gray-700 hover:ring-blue-200 dark:hover:ring-blue-600 transition-all"
                >
                    <img
                        src={avatarUrl}
                        alt={userName}
                        className="w-full h-full object-cover"
                    />
                </button>

                {/* Dropdown */}
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* User Info Header */}
                        <div className="px-4 py-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full border-2 border-white/30 overflow-hidden shadow-lg">
                                    <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="font-semibold">{userName}</p>
                                    <p className="text-sm text-blue-100">{userRole}</p>
                                </div>
                            </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                            {/* My Profile */}
                            <button
                                onClick={() => { setShowProfileModal(true); setIsOpen(false); }}
                                className="w-full px-4 py-2.5 flex items-center justify-between text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <User size={18} className="text-gray-400 dark:text-gray-500" />
                                    <span>My Profile</span>
                                </div>
                                <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                            </button>

                            {/* Account Settings */}
                            <button
                                onClick={handleAccountSettings}
                                className="w-full px-4 py-2.5 flex items-center justify-between text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Settings size={18} className="text-gray-400 dark:text-gray-500" />
                                    <span>Account Settings</span>
                                </div>
                                <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                            </button>

                            {/* Dark Mode Toggle */}
                            <button
                                onClick={() => { toggleDarkMode(); }}
                                className="w-full px-4 py-2.5 flex items-center justify-between text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {isDarkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-gray-400" />}
                                    <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                                </div>
                                <div
                                    className={`w-10 h-5 rounded-full relative transition-colors ${isDarkMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                                >
                                    <div
                                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isDarkMode ? 'translate-x-5' : 'translate-x-0.5'}`}
                                    />
                                </div>
                            </button>

                            {/* Help & Support */}
                            <button
                                onClick={() => { setShowHelpModal(true); setIsOpen(false); }}
                                className="w-full px-4 py-2.5 flex items-center justify-between text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <HelpCircle size={18} className="text-gray-400 dark:text-gray-500" />
                                    <span>Help & Support</span>
                                </div>
                                <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                            </button>
                        </div>

                        {/* Sign Out */}
                        <div className="border-t border-gray-100 dark:border-gray-700 py-2">
                            <button
                                onClick={handleSignOut}
                                className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <LogOut size={18} />
                                <span>Sign Out</span>
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-400 text-center">VeriClean v2.0 • © 2024</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Profile Modal */}
            {showProfileModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowProfileModal(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="relative h-24 bg-gradient-to-br from-blue-600 to-indigo-700">
                            <button
                                onClick={() => setShowProfileModal(false)}
                                className="absolute top-3 right-3 p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="px-6 pb-6">
                            <div className="-mt-12 mb-4">
                                <div className="h-24 w-24 rounded-full border-4 border-white dark:border-gray-800 shadow-lg overflow-hidden mx-auto">
                                    <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                                </div>
                            </div>
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{userName}</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{userRole}</p>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <Mail size={18} className="text-gray-400 dark:text-gray-500" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{userEmail}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <Phone size={18} className="text-gray-400 dark:text-gray-500" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">+1 (555) 123-4567</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <Building2 size={18} className="text-gray-400 dark:text-gray-500" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Assigned Buildings</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">4 facilities</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowProfileModal(false)}
                                className="w-full mt-6 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Help Modal */}
            {showHelpModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowHelpModal(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Help & Support</h2>
                            <button
                                onClick={() => setShowHelpModal(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <a href="#" className="block p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                                <h3 className="font-medium text-blue-900 dark:text-blue-300">📚 Documentation</h3>
                                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">Learn how to use VeriClean effectively</p>
                            </a>
                            <a href="#" className="block p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
                                <h3 className="font-medium text-purple-900 dark:text-purple-300">🎥 Video Tutorials</h3>
                                <p className="text-sm text-purple-700 dark:text-purple-400 mt-1">Watch step-by-step guides</p>
                            </a>
                            <a href="#" className="block p-4 bg-green-50 dark:bg-green-900/30 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors">
                                <h3 className="font-medium text-green-900 dark:text-green-300">💬 Contact Support</h3>
                                <p className="text-sm text-green-700 dark:text-green-400 mt-1">Get help from our team</p>
                            </a>
                            <a href="#" className="block p-4 bg-amber-50 dark:bg-amber-900/30 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors">
                                <h3 className="font-medium text-amber-900 dark:text-amber-300">❓ FAQs</h3>
                                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">Find answers to common questions</p>
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Sign Out Confirmation */}
            {showSignOutConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowSignOutConfirm(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <LogOut size={28} className="text-red-600 dark:text-red-400" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sign Out?</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Are you sure you want to sign out of VeriClean?</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSignOutConfirm(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmSignOut}
                                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProfileDropdown;
