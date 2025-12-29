import React, { useState } from 'react';
import { User, MapPin, BadgeCheck, Search, Filter, MoreVertical, Phone, Mail, Clock, TrendingUp } from 'lucide-react';

interface TeamMember {
    id: number;
    name: string;
    role: string;
    status: 'Active' | 'Offline' | 'On Break';
    location: string;
    verified_logs: number;
    avatar?: string;
    email: string;
    phone: string;
    shift: string;
    performance: number;
}

const TeamView: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Mock data based on VeriClean overview
    const team: TeamMember[] = [
        {
            id: 1,
            name: "Sarah Jenkins",
            role: "Senior Cleaner",
            status: "Active",
            location: "Apex Tower - Floor 4",
            verified_logs: 124,
            email: "sarah.j@vericlean.io",
            phone: "+1 (555) 123-4567",
            shift: "Morning (6AM - 2PM)",
            performance: 97
        },
        {
            id: 2,
            name: "Mike Ross",
            role: "Janitorial Staff",
            status: "Offline",
            location: "Last seen: Lobby",
            verified_logs: 89,
            email: "mike.r@vericlean.io",
            phone: "+1 (555) 234-5678",
            shift: "Evening (2PM - 10PM)",
            performance: 88
        },
        {
            id: 3,
            name: "Elena Rodriguez",
            role: "Supervisor",
            status: "Active",
            location: "Apex Tower - Basement",
            verified_logs: 215,
            email: "elena.r@vericlean.io",
            phone: "+1 (555) 345-6789",
            shift: "Morning (6AM - 2PM)",
            performance: 99
        },
        {
            id: 4,
            name: "James Wilson",
            role: "Janitorial Staff",
            status: "On Break",
            location: "Break Room - Floor 2",
            verified_logs: 67,
            email: "james.w@vericlean.io",
            phone: "+1 (555) 456-7890",
            shift: "Morning (6AM - 2PM)",
            performance: 82
        },
        {
            id: 5,
            name: "Priya Sharma",
            role: "Senior Cleaner",
            status: "Active",
            location: "Westside Logistics - Warehouse",
            verified_logs: 156,
            email: "priya.s@vericlean.io",
            phone: "+1 (555) 567-8901",
            shift: "Night (10PM - 6AM)",
            performance: 95
        },
        {
            id: 6,
            name: "Carlos Mendez",
            role: "Janitorial Staff",
            status: "Active",
            location: "Apex Tower - Floor 7",
            verified_logs: 103,
            email: "carlos.m@vericlean.io",
            phone: "+1 (555) 678-9012",
            shift: "Evening (2PM - 10PM)",
            performance: 91
        },
    ];

    const filteredTeam = team.filter(member => {
        const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.location.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || member.status.toLowerCase() === filterStatus.toLowerCase();
        return matchesSearch && matchesFilter;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200';
            case 'Offline': return 'bg-gray-100 text-gray-600 ring-1 ring-gray-200';
            case 'On Break': return 'bg-amber-100 text-amber-700 ring-1 ring-amber-200';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const getPerformanceColor = (performance: number) => {
        if (performance >= 95) return 'text-emerald-600';
        if (performance >= 85) return 'text-blue-600';
        if (performance >= 70) return 'text-amber-600';
        return 'text-red-600';
    };

    const stats = [
        { label: 'Total Staff', value: team.length, color: 'bg-blue-500' },
        { label: 'Active Now', value: team.filter(m => m.status === 'Active').length, color: 'bg-emerald-500' },
        { label: 'On Break', value: team.filter(m => m.status === 'On Break').length, color: 'bg-amber-500' },
        { label: 'Offline', value: team.filter(m => m.status === 'Offline').length, color: 'bg-gray-400' },
    ];

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Janitorial Team</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage and monitor your cleaning staff</p>
                </div>
                <button className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2 text-sm">
                    <User size={16} />
                    Add Staff Member
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${stat.color}`}></div>
                            <span className="text-sm text-gray-500 font-medium">{stat.label}</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, role, or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-gray-400" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="offline">Offline</option>
                        <option value="on break">On Break</option>
                    </select>
                </div>
            </div>

            {/* Team Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTeam.map((member) => (
                    <div
                        key={member.id}
                        className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 group"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-lg shadow-inner ring-2 ring-white">
                                    {member.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{member.name}</h3>
                                    <p className="text-xs text-gray-500">{member.role}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                                    {member.status}
                                </span>
                                <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                    <MoreVertical size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="mt-4 space-y-2.5">
                            <div className="flex items-center text-sm text-gray-600">
                                <MapPin size={14} className="mr-2 text-gray-400" />
                                <span className="truncate">{member.location}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <Clock size={14} className="mr-2 text-gray-400" />
                                {member.shift}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <BadgeCheck size={14} className="mr-2 text-blue-500" />
                                <span className="font-medium">{member.verified_logs}</span>
                                <span className="ml-1 text-gray-400">Verified Logs</span>
                            </div>
                        </div>

                        {/* Performance & Contact */}
                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <TrendingUp size={14} className={getPerformanceColor(member.performance)} />
                                <span className={`text-sm font-semibold ${getPerformanceColor(member.performance)}`}>
                                    {member.performance}%
                                </span>
                                <span className="text-xs text-gray-400 ml-1">performance</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title={member.email}>
                                    <Mail size={16} />
                                </button>
                                <button className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title={member.phone}>
                                    <Phone size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {filteredTeam.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User size={24} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No team members found</h3>
                    <p className="text-sm text-gray-500">Try adjusting your search or filter criteria</p>
                </div>
            )}
        </div>
    );
};

export default TeamView;
