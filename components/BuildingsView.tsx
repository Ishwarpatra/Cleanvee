import React, { useState } from 'react';
import { Building2, QrCode, AlertTriangle, Settings, ChevronRight, Plus, Sliders } from 'lucide-react';
import NewBuildingModal from './modals/NewBuildingModal';
import SlaSettingsModal from './modals/SlaSettingsModal';
import NfcTagManagerModal from './modals/NfcTagManagerModal';

interface BuildingData {
    id: string;
    name: string;
    address: string;
    tags: number;
    sla_status: 'Healthy' | 'Warning' | 'Critical';
    compliance: number;
}

const BuildingsView = () => {
    // Mock Data
    const [buildings, setBuildings] = useState<BuildingData[]>([
        { id: 'b1', name: "Apex Tower HQ", address: "101 Market St", tags: 45, sla_status: "Healthy", compliance: 98 },
        { id: 'b2', name: "Westside Logistics", address: "4400 Industrial Pkwy", tags: 120, sla_status: "Warning", compliance: 82 },
        { id: 'b3', name: "Downtown Medical Center", address: "500 Healthcare Blvd", tags: 78, sla_status: "Healthy", compliance: 99 },
        { id: 'b4', name: "Tech Campus Alpha", address: "1 Innovation Way", tags: 200, sla_status: "Critical", compliance: 72 },
    ]);

    // Modal States
    const [showNewBuildingModal, setShowNewBuildingModal] = useState(false);
    const [showSlaSettingsModal, setShowSlaSettingsModal] = useState(false);
    const [showNfcTagManager, setShowNfcTagManager] = useState(false);
    const [selectedBuilding, setSelectedBuilding] = useState<BuildingData | null>(null);

    // --- Actions ---
    const handleCreateBuilding = (newBuilding: { name: string; address: string; city: string; state: string; floors: number; initialTags: number }) => {
        const building: BuildingData = {
            id: `b${Date.now()}`,
            name: newBuilding.name,
            address: `${newBuilding.address}, ${newBuilding.city}`,
            tags: newBuilding.initialTags,
            sla_status: 'Healthy',
            compliance: 100
        };
        setBuildings(prev => [...prev, building]);
        console.log('Created building:', building);
    };

    const handleManageTags = (building: BuildingData, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedBuilding(building);
        setShowNfcTagManager(true);
    };

    const handleRowClick = (buildingId: string) => {
        console.log(`Navigating to details view for ${buildingId}`);
    };

    const handleConfigure = (building: BuildingData, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedBuilding(building);
        setShowSlaSettingsModal(true);
    };

    const handleGlobalSlaSettings = () => {
        setSelectedBuilding(null);
        setShowSlaSettingsModal(true);
    };

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Facility Management</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage locations, tags, and compliance standards.</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={handleGlobalSlaSettings}
                        className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <Sliders size={18} className="mr-2" /> SLA Settings
                    </button>
                    <button
                        onClick={() => setShowNewBuildingModal(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus size={18} className="mr-2" /> New Building
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Buildings</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{buildings.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Active NFC Tags</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{buildings.reduce((sum, b) => sum + b.tags, 0)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Avg. Compliance</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                        {Math.round(buildings.reduce((sum, b) => sum + b.compliance, 0) / buildings.length)}%
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Needs Attention</p>
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                        {buildings.filter(b => b.sla_status !== 'Healthy').length}
                    </p>
                </div>
            </div>

            {/* Buildings Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Building</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Compliance</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {buildings.map((b) => (
                            <tr
                                key={b.id}
                                onClick={() => handleRowClick(b.id)}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer group transition-colors"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-lg mr-3 text-blue-600 dark:text-blue-400">
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">{b.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{b.address}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-2">
                                        {b.sla_status === 'Warning' ? (
                                            <span className="inline-flex items-center text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/40 px-2 py-1 rounded-full border border-amber-100 dark:border-amber-800">
                                                <AlertTriangle size={12} className="mr-1" /> Attention Needed
                                            </span>
                                        ) : b.sla_status === 'Critical' ? (
                                            <span className="inline-flex items-center text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/40 px-2 py-1 rounded-full border border-red-100 dark:border-red-800">
                                                <AlertTriangle size={12} className="mr-1" /> Critical
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/40 px-2 py-1 rounded-full border border-green-100 dark:border-green-800">
                                                Healthy
                                            </span>
                                        )}
                                        <span className="text-xs text-gray-400 dark:text-gray-500">| {b.tags} Tags</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 max-w-xs">
                                    <div className="flex items-center">
                                        <span className={`text-sm font-medium w-10 ${b.compliance >= 95 ? 'text-green-600 dark:text-green-400' : b.compliance >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {b.compliance}%
                                        </span>
                                        <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full ml-2 overflow-hidden max-w-[100px]">
                                            <div
                                                className={`h-full rounded-full ${b.compliance >= 95 ? 'bg-green-500' : b.compliance >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                style={{ width: `${b.compliance}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                        <button
                                            onClick={(e) => handleManageTags(b, e)}
                                            className="p-2 text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                                            title="Manage NFC Tags"
                                        >
                                            <QrCode size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => handleConfigure(b, e)}
                                            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                            title="Building Settings"
                                        >
                                            <Settings size={18} />
                                        </button>
                                        <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400" />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            <NewBuildingModal
                isOpen={showNewBuildingModal}
                onClose={() => setShowNewBuildingModal(false)}
                onSave={handleCreateBuilding}
            />

            <SlaSettingsModal
                isOpen={showSlaSettingsModal}
                onClose={() => { setShowSlaSettingsModal(false); setSelectedBuilding(null); }}
                buildingId={selectedBuilding?.id}
                buildingName={selectedBuilding?.name}
            />

            {selectedBuilding && (
                <NfcTagManagerModal
                    isOpen={showNfcTagManager}
                    onClose={() => { setShowNfcTagManager(false); setSelectedBuilding(null); }}
                    buildingId={selectedBuilding.id}
                    buildingName={selectedBuilding.name}
                />
            )}
        </div>
    );
};

export default BuildingsView;
