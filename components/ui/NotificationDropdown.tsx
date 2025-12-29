import React, { useState, useRef, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle, Clock, X, Trash2 } from 'lucide-react';

interface Notification {
    id: string;
    type: 'warning' | 'success' | 'alert' | 'info';
    title: string;
    message: string;
    time: string;
    read: boolean;
}

const NotificationDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [notifications, setNotifications] = useState<Notification[]>([
        { id: '1', type: 'alert', title: 'SLA Breach Detected', message: 'Restroom 2F has not been cleaned for 5+ hours', time: '5 mins ago', read: false },
        { id: '2', type: 'warning', title: 'Cleaning Overdue', message: 'Conference Room A approaching SLA deadline', time: '15 mins ago', read: false },
        { id: '3', type: 'success', title: 'Inspection Passed', message: 'Main Lobby verified clean by AI system', time: '1 hour ago', read: true },
        { id: '4', type: 'info', title: 'New Staff Assigned', message: 'Sarah Jenkins assigned to Floor 4', time: '2 hours ago', read: true },
    ]);

    const unreadCount = notifications.filter(n => !n.read).length;

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

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'alert': return <AlertTriangle size={16} className="text-red-500" />;
            case 'warning': return <Clock size={16} className="text-amber-500" />;
            case 'success': return <CheckCircle size={16} className="text-green-500" />;
            default: return <Bell size={16} className="text-blue-500" />;
        }
    };

    const getBgColor = (type: string, read: boolean) => {
        if (read) return 'bg-white';
        switch (type) {
            case 'alert': return 'bg-red-50';
            case 'warning': return 'bg-amber-50';
            case 'success': return 'bg-green-50';
            default: return 'bg-blue-50';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                        <div>
                            <h3 className="font-semibold text-gray-900">Notifications</h3>
                            {unreadCount > 0 && (
                                <p className="text-xs text-gray-500">{unreadCount} unread</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    Mark all read
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={clearAll}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Clear all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-12 text-center">
                                <Bell size={32} className="mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500 text-sm">No notifications</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group ${getBgColor(notification.type, notification.read)}`}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5">{getIcon(notification.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-sm font-medium ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                                                    {notification.title}
                                                </p>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                                                    className="p-1 text-gray-300 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{notification.message}</p>
                                            <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                                        </div>
                                        {!notification.read && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                            <button className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium">
                                View All Notifications
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
