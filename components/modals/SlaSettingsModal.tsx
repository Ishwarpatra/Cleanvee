import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Clock, AlertTriangle, Bell, Save, RotateCcw } from 'lucide-react';

interface SlaSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    buildingId?: string;
    buildingName?: string;
}

const SlaSettingsModal: React.FC<SlaSettingsModalProps> = ({ isOpen, onClose, buildingId, buildingName }) => {
    const isGlobal = !buildingId;

    const [settings, setSettings] = useState({
        maxCleaningInterval: 4,
        gracePeriod: 15,
        escalationEnabled: true,
        escalationDelay: 30,
        criticalThreshold: 60,
        autoAssign: true,
        notifyOnBreach: true,
        notifyOnWarning: true
    });

    const handleChange = (name: string, value: number | boolean) => {
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        console.log('Saving SLA settings:', settings, buildingId ? `for building ${buildingId}` : 'globally');
        // Here you would save to Firestore
        onClose();
    };

    const handleReset = () => {
        setSettings({
            maxCleaningInterval: 4,
            gracePeriod: 15,
            escalationEnabled: true,
            escalationDelay: 30,
            criticalThreshold: 60,
            autoAssign: true,
            notifyOnBreach: true,
            notifyOnWarning: true
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isGlobal ? "Global SLA Settings" : `SLA Settings - ${buildingName}`}
            subtitle={isGlobal ? "Configure default service level agreements for all buildings" : "Override global settings for this building"}
            size="lg"
        >
            <div className="p-6 space-y-6">
                {/* Cleaning Schedule */}
                <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <Clock size={18} className="text-blue-600" />
                        <h3 className="font-semibold text-gray-900">Cleaning Schedule</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Cleaning Interval</label>
                            <select
                                value={settings.maxCleaningInterval}
                                onChange={(e) => handleChange('maxCleaningInterval', parseInt(e.target.value))}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white cursor-pointer"
                            >
                                <option value={2}>Every 2 hours</option>
                                <option value={4}>Every 4 hours</option>
                                <option value={6}>Every 6 hours</option>
                                <option value={8}>Every 8 hours</option>
                                <option value={12}>Every 12 hours</option>
                                <option value={24}>Once daily</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Time between required cleanings</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Grace Period (minutes)</label>
                            <select
                                value={settings.gracePeriod}
                                onChange={(e) => handleChange('gracePeriod', parseInt(e.target.value))}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white cursor-pointer"
                            >
                                <option value={5}>5 minutes</option>
                                <option value={10}>10 minutes</option>
                                <option value={15}>15 minutes</option>
                                <option value={30}>30 minutes</option>
                                <option value={60}>1 hour</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Buffer before marking as overdue</p>
                        </div>
                    </div>
                </div>

                {/* Escalation Rules */}
                <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-600" />
                        <h3 className="font-semibold text-gray-900">Escalation Rules</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                            <div>
                                <span className="text-sm font-medium text-gray-700">Enable automatic escalation</span>
                                <p className="text-xs text-gray-500 mt-0.5">Escalate to supervisor when SLA is breached</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleChange('escalationEnabled', !settings.escalationEnabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.escalationEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${settings.escalationEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {settings.escalationEnabled && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Escalation Delay (minutes)</label>
                                    <input
                                        type="number"
                                        value={settings.escalationDelay}
                                        onChange={(e) => handleChange('escalationDelay', parseInt(e.target.value) || 0)}
                                        min="5"
                                        max="120"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Critical Threshold (minutes)</label>
                                    <input
                                        type="number"
                                        value={settings.criticalThreshold}
                                        onChange={(e) => handleChange('criticalThreshold', parseInt(e.target.value) || 0)}
                                        min="15"
                                        max="240"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Time before marking as critical</p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between py-3">
                            <div>
                                <span className="text-sm font-medium text-gray-700">Auto-assign to nearest cleaner</span>
                                <p className="text-xs text-gray-500 mt-0.5">Automatically assign overdue rooms</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleChange('autoAssign', !settings.autoAssign)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoAssign ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${settings.autoAssign ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <Bell size={18} className="text-purple-600" />
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-200 transition-colors">
                            <input
                                type="checkbox"
                                checked={settings.notifyOnBreach}
                                onChange={(e) => handleChange('notifyOnBreach', e.target.checked)}
                                className="h-4 w-4 text-blue-600 rounded"
                            />
                            <div>
                                <span className="text-sm font-medium text-gray-700 block">SLA Breach Alerts</span>
                                <span className="text-xs text-gray-500">Immediate notification when SLA is violated</span>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-200 transition-colors">
                            <input
                                type="checkbox"
                                checked={settings.notifyOnWarning}
                                onChange={(e) => handleChange('notifyOnWarning', e.target.checked)}
                                className="h-4 w-4 text-blue-600 rounded"
                            />
                            <div>
                                <span className="text-sm font-medium text-gray-700 block">Warning Alerts</span>
                                <span className="text-xs text-gray-500">Notify when cleaning is approaching deadline</span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                >
                    <RotateCcw size={16} />
                    Reset to Defaults
                </button>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                    >
                        <Save size={16} />
                        Save Settings
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default SlaSettingsModal;
