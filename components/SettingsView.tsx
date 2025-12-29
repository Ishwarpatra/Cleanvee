import React, { useState } from 'react';
import { Shield, Smartphone, Zap, Bell, Clock, Database, Globe, UserCog, Save, RotateCcw } from 'lucide-react';

interface ToggleProps {
    enabled: boolean;
    onChange: () => void;
}

const Toggle: React.FC<ToggleProps> = ({ enabled, onChange }) => (
    <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
    >
        <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
        />
    </button>
);

const SettingsView: React.FC = () => {
    // AI Settings
    const [qualityThreshold, setQualityThreshold] = useState(70);
    const [flagYellowAlerts, setFlagYellowAlerts] = useState(true);
    const [autoReviewLowScores, setAutoReviewLowScores] = useState(true);

    // Mobile App Settings
    const [requireGps, setRequireGps] = useState(true);
    const [allowOffline, setAllowOffline] = useState(true);
    const [photoRequired, setPhotoRequired] = useState(true);
    const [maxOfflineHours, setMaxOfflineHours] = useState(4);

    // Notification Settings
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [slaAlerts, setSlaAlerts] = useState(true);
    const [digestFrequency, setDigestFrequency] = useState('daily');

    // SLA Settings
    const [maxCleaningInterval, setMaxCleaningInterval] = useState(4);
    const [gracePeriod, setGracePeriod] = useState(15);

    const [hasChanges, setHasChanges] = useState(false);

    const handleSave = () => {
        // In a real app, this would save to backend
        setHasChanges(false);
        // Show success toast
    };

    const handleReset = () => {
        setQualityThreshold(70);
        setFlagYellowAlerts(true);
        setAutoReviewLowScores(true);
        setRequireGps(true);
        setAllowOffline(true);
        setPhotoRequired(true);
        setMaxOfflineHours(4);
        setEmailNotifications(true);
        setPushNotifications(true);
        setSlaAlerts(true);
        setDigestFrequency('daily');
        setMaxCleaningInterval(4);
        setGracePeriod(15);
        setHasChanges(false);
    };

    const markChanged = () => setHasChanges(true);

    return (
        <div className="max-w-4xl space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">System Settings</h2>
                    <p className="text-sm text-gray-500 mt-1">Configure AI thresholds, mobile policies, and notifications</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                    >
                        <RotateCcw size={16} />
                        Reset to Defaults
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges}
                        className={`px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all shadow-sm ${hasChanges
                                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        <Save size={16} />
                        Save Changes
                    </button>
                </div>
            </div>

            {/* AI Configuration Section */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl mr-4">
                        <Zap className="text-purple-600" size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">AI & Verification Thresholds</h3>
                        <p className="text-sm text-gray-500">Configure how the AI evaluates cleaning quality</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Quality Score Slider */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-sm font-medium text-gray-700">Minimum Quality Score (Pass/Fail)</label>
                            <span className="text-lg font-bold text-purple-600">{qualityThreshold}%</span>
                        </div>
                        <input
                            type="range"
                            min="50"
                            max="95"
                            value={qualityThreshold}
                            onChange={(e) => { setQualityThreshold(Number(e.target.value)); markChanged(); }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                                Lenient (50%)
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                Strict (95%)
                            </span>
                        </div>
                    </div>

                    {/* Toggle Options */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                            <div>
                                <span className="text-sm font-medium text-gray-700 block">Flag "Yellow" Alerts automatically</span>
                                <span className="text-xs text-gray-500">Items requiring manual review are flagged</span>
                            </div>
                            <Toggle enabled={flagYellowAlerts} onChange={() => { setFlagYellowAlerts(!flagYellowAlerts); markChanged(); }} />
                        </div>

                        <div className="flex items-center justify-between py-3">
                            <div>
                                <span className="text-sm font-medium text-gray-700 block">Auto-escalate scores below threshold</span>
                                <span className="text-xs text-gray-500">Low scores trigger supervisor review</span>
                            </div>
                            <Toggle enabled={autoReviewLowScores} onChange={() => { setAutoReviewLowScores(!autoReviewLowScores); markChanged(); }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile App Policy Section */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl mr-4">
                        <Smartphone className="text-blue-600" size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Mobile App Policy</h3>
                        <p className="text-sm text-gray-500">Control how the cleaner app captures data</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <Globe size={18} className="text-blue-500" />
                            <div>
                                <span className="text-sm font-medium text-gray-700 block">Require GPS location for all NFC scans</span>
                                <span className="text-xs text-gray-500">Ensures location verification on each scan</span>
                            </div>
                        </div>
                        <Toggle enabled={requireGps} onChange={() => { setRequireGps(!requireGps); markChanged(); }} />
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <Database size={18} className="text-blue-500" />
                            <div>
                                <span className="text-sm font-medium text-gray-700 block">Allow offline mode (Store-and-Forward)</span>
                                <span className="text-xs text-gray-500">Logs sync when connection is restored</span>
                            </div>
                        </div>
                        <Toggle enabled={allowOffline} onChange={() => { setAllowOffline(!allowOffline); markChanged(); }} />
                    </div>

                    {allowOffline && (
                        <div className="ml-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <label className="text-sm font-medium text-gray-700 block mb-2">Maximum offline duration (hours)</label>
                            <input
                                type="number"
                                min="1"
                                max="24"
                                value={maxOfflineHours}
                                onChange={(e) => { setMaxOfflineHours(Number(e.target.value)); markChanged(); }}
                                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                            <Shield size={18} className="text-blue-500" />
                            <div>
                                <span className="text-sm font-medium text-gray-700 block">Require photo evidence for each scan</span>
                                <span className="text-xs text-gray-500">AI verification requires image proof</span>
                            </div>
                        </div>
                        <Toggle enabled={photoRequired} onChange={() => { setPhotoRequired(!photoRequired); markChanged(); }} />
                    </div>
                </div>
            </div>

            {/* SLA Configuration Section */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl mr-4">
                        <Clock className="text-emerald-600" size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">SLA Configuration</h3>
                        <p className="text-sm text-gray-500">Define service level agreement parameters</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 rounded-xl">
                        <label className="text-sm font-medium text-gray-700 block mb-2">Maximum cleaning interval (hours)</label>
                        <select
                            value={maxCleaningInterval}
                            onChange={(e) => { setMaxCleaningInterval(Number(e.target.value)); markChanged(); }}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white cursor-pointer"
                        >
                            <option value={2}>2 hours</option>
                            <option value={4}>4 hours</option>
                            <option value={6}>6 hours</option>
                            <option value={8}>8 hours</option>
                            <option value={12}>12 hours</option>
                            <option value={24}>24 hours</option>
                        </select>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl">
                        <label className="text-sm font-medium text-gray-700 block mb-2">Grace period before alert (minutes)</label>
                        <select
                            value={gracePeriod}
                            onChange={(e) => { setGracePeriod(Number(e.target.value)); markChanged(); }}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white cursor-pointer"
                        >
                            <option value={5}>5 minutes</option>
                            <option value={10}>10 minutes</option>
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={60}>1 hour</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Notification Settings Section */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl mr-4">
                        <Bell className="text-amber-600" size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
                        <p className="text-sm text-gray-500">Manage how you receive alerts and updates</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div>
                            <span className="text-sm font-medium text-gray-700 block">Email notifications</span>
                            <span className="text-xs text-gray-500">Receive reports and alerts via email</span>
                        </div>
                        <Toggle enabled={emailNotifications} onChange={() => { setEmailNotifications(!emailNotifications); markChanged(); }} />
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div>
                            <span className="text-sm font-medium text-gray-700 block">Push notifications</span>
                            <span className="text-xs text-gray-500">Real-time alerts on your devices</span>
                        </div>
                        <Toggle enabled={pushNotifications} onChange={() => { setPushNotifications(!pushNotifications); markChanged(); }} />
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div>
                            <span className="text-sm font-medium text-gray-700 block">SLA breach alerts</span>
                            <span className="text-xs text-gray-500">Immediate notification when SLA is violated</span>
                        </div>
                        <Toggle enabled={slaAlerts} onChange={() => { setSlaAlerts(!slaAlerts); markChanged(); }} />
                    </div>

                    <div className="py-3">
                        <label className="text-sm font-medium text-gray-700 block mb-2">Email digest frequency</label>
                        <div className="flex gap-3">
                            {['realtime', 'daily', 'weekly'].map((freq) => (
                                <button
                                    key={freq}
                                    onClick={() => { setDigestFrequency(freq); markChanged(); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${digestFrequency === freq
                                            ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* User Management Preview */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
                <div className="flex items-center mb-4">
                    <div className="p-2.5 bg-white rounded-xl mr-4 shadow-sm">
                        <UserCog className="text-gray-500" size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">User & Role Management</h3>
                        <p className="text-sm text-gray-500">Configure access levels and permissions</p>
                    </div>
                </div>
                <button className="bg-white px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
                    Manage Users & Roles →
                </button>
            </div>
        </div>
    );
};

export default SettingsView;
