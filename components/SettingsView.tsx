/**
 * SettingsView — System configuration panel
 * SOLID: Single Responsibility (UI only), Dependency Inversion (useSettings hook)
 * Fixes: persistence, validation, loading state, dark mode toggle
 */
import React from 'react';
import { Shield, Smartphone, Zap, Bell, Clock, Database, Save, RotateCcw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useSettings } from '../src/contexts/SettingsContext';
import { useTheme } from '../src/contexts/ThemeContext';

interface ToggleProps { enabled: boolean; onChange: () => void; disabled?: boolean; label?: string; }
const Toggle: React.FC<ToggleProps> = ({ enabled, onChange, disabled, label }) => (
  <button onClick={onChange} disabled={disabled} aria-label={label} aria-pressed={enabled}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

interface NumberInputProps { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; label: string; unit?: string; disabled?: boolean; }
const NumberInput: React.FC<NumberInputProps> = ({ value, onChange, min, max, step = 1, label, unit, disabled }) => {
  const isInvalid = value < min || value > max;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input type="number" value={value} min={min} max={max} step={step} disabled={disabled} aria-label={label}
          onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }}
          className={`w-24 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 dark:bg-gray-700 dark:text-white transition-colors ${isInvalid ? 'border-red-400 focus:ring-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-600 focus:ring-blue-400 bg-white'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} />
        {unit && <span className="text-xs text-gray-500 dark:text-gray-400">{unit}</span>}
      </div>
      {isInvalid && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> Must be between {min} and {max}</p>}
    </div>
  );
};

interface SectionProps { icon: React.ReactNode; title: string; description: string; children: React.ReactNode; }
const Section: React.FC<SectionProps> = ({ icon, title, description, children }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-center gap-3 mb-5">
      <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">{icon}</div>
      <div><h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3><p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p></div>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

interface SettingRowProps { label: string; description?: string; children: React.ReactNode; }
const SettingRow: React.FC<SettingRowProps> = ({ label, description, children }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
    <div className="flex-1 mr-4">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
      {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
    </div>
    {children}
  </div>
);

const SettingsView: React.FC = () => {
  const { settings, hasChanges, isSaving, saveError, updateSettings, saveSettings, resetSettings } = useSettings();
  const { isDarkMode, toggleDarkMode } = useTheme();
  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">System Settings</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure AI thresholds, mobile policies, and notifications. <span className="text-blue-500 font-medium">Changes persist across sessions.</span></p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={resetSettings} disabled={isSaving} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"><RotateCcw size={16} /> Reset to Defaults</button>
          <button onClick={() => void saveSettings()} disabled={!hasChanges || isSaving}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all shadow-sm ${hasChanges && !isSaving ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}>
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
      {saveError && <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-300"><AlertCircle size={16} className="mt-0.5 flex-shrink-0" />{saveError}</div>}
      {!hasChanges && !isSaving && !saveError && <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-400"><CheckCircle size={16} /> All settings are saved and up to date.</div>}
      <Section icon={<Zap size={18} />} title="AI Configuration" description="Control quality scoring and automated review thresholds">
        <SettingRow label="Quality Score Threshold" description="Logs below this score are flagged for review (0–100)">
          <div className="flex items-center gap-3"><NumberInput value={settings.qualityThreshold} onChange={v => updateSettings({ qualityThreshold: v })} min={0} max={100} label="Quality threshold" /><span className="text-xs font-mono text-gray-500 w-8">{settings.qualityThreshold}%</span></div>
        </SettingRow>
        <SettingRow label="Flag Yellow Alerts" description="Surface borderline scores for manual review"><Toggle enabled={settings.flagYellowAlerts} onChange={() => updateSettings({ flagYellowAlerts: !settings.flagYellowAlerts })} label="Flag yellow alerts" /></SettingRow>
        <SettingRow label="Auto-Review Low Scores" description="Automatically reject logs that fail the quality threshold"><Toggle enabled={settings.autoReviewLowScores} onChange={() => updateSettings({ autoReviewLowScores: !settings.autoReviewLowScores })} label="Auto review low scores" /></SettingRow>
      </Section>
      <Section icon={<Smartphone size={18} />} title="Mobile App Policies" description="Control what the mobile cleaner app requires">
        <SettingRow label="Require GPS Verification" description="Cleaner must be within range of checkpoint"><Toggle enabled={settings.requireGps} onChange={() => updateSettings({ requireGps: !settings.requireGps })} label="Require GPS" /></SettingRow>
        <SettingRow label="Allow Offline Mode" description="Permit logs to be stored locally and synced later"><Toggle enabled={settings.allowOffline} onChange={() => updateSettings({ allowOffline: !settings.allowOffline })} label="Allow offline mode" /></SettingRow>
        <SettingRow label="Max Offline Duration" description="Maximum hours a device can operate offline (1–72)"><NumberInput value={settings.maxOfflineHours} onChange={v => updateSettings({ maxOfflineHours: v })} min={1} max={72} unit="hours" label="Max offline hours" disabled={!settings.allowOffline} /></SettingRow>
        <SettingRow label="Require Photo Evidence" description="Cleaners must capture a photo for each log submission"><Toggle enabled={settings.photoRequired} onChange={() => updateSettings({ photoRequired: !settings.photoRequired })} label="Photo required" /></SettingRow>
      </Section>
      <Section icon={<Clock size={18} />} title="SLA Configuration" description="Define service level agreement thresholds for alerts">
        <SettingRow label="Max Cleaning Interval" description="Alert when a checkpoint has not been cleaned within this window (1–24 hours)"><NumberInput value={settings.maxCleaningIntervalHours} onChange={v => updateSettings({ maxCleaningIntervalHours: v })} min={1} max={24} unit="hours" label="Max cleaning interval" /></SettingRow>
        <SettingRow label="Grace Period" description="Buffer time before SLA breach is escalated (0–120 minutes)"><NumberInput value={settings.gracePeriodMinutes} onChange={v => updateSettings({ gracePeriodMinutes: v })} min={0} max={120} unit="min" label="Grace period" /></SettingRow>
        <SettingRow label="SLA Breach Alerts" description="Receive notifications when checkpoints breach SLA"><Toggle enabled={settings.slaAlerts} onChange={() => updateSettings({ slaAlerts: !settings.slaAlerts })} label="SLA alerts" /></SettingRow>
      </Section>
      <Section icon={<Bell size={18} />} title="Notifications" description="Configure how and when you receive alerts">
        <SettingRow label="Email Notifications" description="Receive alerts via email"><Toggle enabled={settings.emailNotifications} onChange={() => updateSettings({ emailNotifications: !settings.emailNotifications })} label="Email notifications" /></SettingRow>
        <SettingRow label="Push Notifications" description="Receive browser push notifications"><Toggle enabled={settings.pushNotifications} onChange={() => updateSettings({ pushNotifications: !settings.pushNotifications })} label="Push notifications" /></SettingRow>
        <SettingRow label="Digest Frequency" description="How often to receive summary reports">
          <select value={settings.digestFrequency} onChange={e => updateSettings({ digestFrequency: e.target.value as 'realtime' | 'hourly' | 'daily' | 'weekly' })} className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="realtime">Real-time</option><option value="hourly">Hourly</option><option value="daily">Daily</option><option value="weekly">Weekly</option>
          </select>
        </SettingRow>
      </Section>
      <Section icon={<Database size={18} />} title="Appearance" description="Customize the dashboard look and feel">
        <SettingRow label="Dark Mode" description="Switch between light and dark theme"><Toggle enabled={isDarkMode} onChange={toggleDarkMode} label="Dark mode" /></SettingRow>
      </Section>
      <Section icon={<Shield size={18} />} title="Security and Compliance" description="Security settings are managed at the infrastructure level">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>Firestore security rules enforce row-level access control per building and role.</p>
          <p>NFC payload hashes use HMAC-SHA256 with a server-managed secret.</p>
          <p>GPS coordinates are masked in the UI; raw coordinates are stored encrypted.</p>
          <p>All settings changes are logged with timestamp and user ID in the audit trail.</p>
        </div>
      </Section>
    </div>
  );
};
export default SettingsView;
