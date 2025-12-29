import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, HelpCircle, LogOut, Moon, ChevronRight } from 'lucide-react';

interface ProfileDropdownProps {
    userName?: string;
    userRole?: string;
    avatarUrl?: string;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
    userName = "Facility Manager",
    userRole = "Administrator",
    avatarUrl = "https://picsum.photos/id/64/100/100"
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    const menuItems = [
        { icon: User, label: 'My Profile', action: () => console.log('Profile clicked') },
        { icon: Settings, label: 'Account Settings', action: () => console.log('Settings clicked') },
        { icon: Moon, label: 'Dark Mode', action: () => console.log('Dark mode toggled'), toggle: true },
        { icon: HelpCircle, label: 'Help & Support', action: () => console.log('Help clicked') },
    ];

    const handleSignOut = () => {
        if (confirm('Are you sure you want to sign out?')) {
            console.log('Signing out...');
            // Here you would implement actual sign out logic
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Avatar Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-9 w-9 rounded-full border-2 border-white shadow-sm overflow-hidden ring-2 ring-gray-100 hover:ring-blue-200 transition-all"
            >
                <img
                    src={avatarUrl}
                    alt={userName}
                    className="w-full h-full object-cover"
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
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
                        {menuItems.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => { item.action(); if (!item.toggle) setIsOpen(false); }}
                                className="w-full px-4 py-2.5 flex items-center justify-between text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon size={18} className="text-gray-400" />
                                    <span>{item.label}</span>
                                </div>
                                {item.toggle ? (
                                    <div className="w-8 h-5 bg-gray-200 rounded-full relative">
                                        <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow" />
                                    </div>
                                ) : (
                                    <ChevronRight size={16} className="text-gray-300" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Sign Out */}
                    <div className="border-t border-gray-100 py-2">
                        <button
                            onClick={handleSignOut}
                            className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <LogOut size={18} />
                            <span>Sign Out</span>
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                        <p className="text-xs text-gray-400 text-center">VeriClean v2.0 • © 2024</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileDropdown;
