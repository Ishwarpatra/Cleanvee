/**
 * App.tsx — Root application component
 * SOLID: Single Responsibility (routing/layout), Dependency Inversion (AppContext)
 * Fixes: AppContext replaces 8 useState calls, ErrorBoundary on all views,
 *        DemoModeBanner when Firebase not configured, URL hash navigation
 */
import React, { useEffect, useState } from 'react';
import { CleaningLog, ShiftReport } from './types';
import { MOCK_USERS, ALL_BUILDINGS } from './constants';
import FloorPlan from './components/FloorPlan';
import LogFeed from './components/LogFeed';
import StatsOverview from './components/StatsOverview';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ReportModal from './components/ReportModal';
import DashboardGrid from './components/DashboardGrid';
import TeamView from './components/TeamView';
import BuildingsView from './components/BuildingsView';
import SettingsView from './components/SettingsView';
import ErrorBoundary from './components/ui/ErrorBoundary';
import DemoModeBanner from './components/ui/DemoModeBanner';
import { generateShiftReport } from './services/geminiService';
import { useFirestoreData } from './src/hooks/useFirestoreData';
import { useAppContext } from './src/contexts/AppContext';
import { useAuth } from './src/hooks/useAuth';
import LoginScreen from './components/LoginScreen';
import { X, Camera, Check, MapPin, Scan, LayoutGrid, Map as MapIcon, Loader2, AlertCircle } from 'lucide-react';

function App() {
  const { state, setActiveTab, setBuilding, setCheckpoint, setLog, setViewMode, setShowReportModal, setReportLoading, setError, resetState } = useAppContext();
  const { activeTab, selectedBuilding, selectedCheckpointId, selectedLog, viewMode, showReportModal, reportLoading, error: appError } = state;
  const { logs, checkpoints, stats, loading, error: dataError, isUsingMockData } = useFirestoreData(selectedBuilding.id);
  const { user, loading: authLoading, logout } = useAuth();
  const [generatedReport, setGeneratedReport] = useState<ShiftReport | null>(null);

  // Fix #7: Reset all app state on logout to prevent data leaks between user sessions
  const handleLogout = async () => {
    resetState();
    if (logout) await logout();
  };

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (['dashboard', 'buildings', 'team', 'settings'].includes(hash)) setActiveTab(hash);
  }, [setActiveTab]);

  useEffect(() => { window.location.hash = activeTab; }, [activeTab]);

  const handleGenerateReport = async () => {
    setReportLoading(true);
    setShowReportModal(true);
    setGeneratedReport(null);
    try {
      const report = await generateShiftReport(logs, checkpoints);
      setGeneratedReport(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report generation failed');
    } finally {
      setReportLoading(false);
    }
  };

  const handleSelectCheckpoint = (id: string) => {
    setCheckpoint(id);
    const first = logs.find(l => l.checkpoint_id === id);
    if (first) setLog(first);
  };

  // Show login screen if user is not authenticated
  if (!user && !authLoading) {
    return (
      <LoginScreen
        onLoginSuccess={(uid, email, role) => {
          // Auth state will be updated by useAuth hook
          console.log('User logged in:', { uid, email, role });
        }}
      />
    );
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Connecting to Cleanvee...</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading building data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      {isUsingMockData && <DemoModeBanner message={dataError ?? 'Firebase not configured — displaying demo data.'} />}
      {appError && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span className="flex-1">{appError}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-800/50 rounded transition-colors"><X size={14} /></button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onGenerateReport={() => void handleGenerateReport()}
          userRole={user?.role}
          onLogout={() => void handleLogout()}
        />
        <main className="flex-1 flex flex-col min-w-0">
          <Header
            building={selectedBuilding}
            buildings={ALL_BUILDINGS}
            onBuildingChange={setBuilding}
            onNavigateToSettings={() => setActiveTab('settings')}
          />
          <div className="p-6 overflow-y-auto flex-1 scroll-smooth">
            {activeTab === 'dashboard' && (
              <ErrorBoundary componentName="Dashboard">
                <>
                  <StatsOverview buildingId={selectedBuilding.id} buildingName={selectedBuilding.name} aggregatedStats={stats ?? undefined} />
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                    <div className="lg:col-span-2 flex flex-col gap-6">
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex-1 flex flex-col transition-all hover:shadow-md overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{viewMode === 'floorplan' ? 'Live Building View' : 'Room Status Grid'}</h3>
                          <div className="flex items-center gap-3">
                            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                              <button onClick={() => setViewMode('floorplan')} className={`p-1.5 rounded-md transition-all ${viewMode === 'floorplan' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`} title="Floor Plan View" aria-label="Floor Plan View"><MapIcon size={16} /></button>
                              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`} title="Grid View" aria-label="Grid View"><LayoutGrid size={16} /></button>
                            </div>
                            {viewMode === 'floorplan' && (
                              <div className="hidden sm:flex gap-2 text-xs font-medium border-l border-gray-200 dark:border-gray-600 pl-3">
                                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />Clean</div>
                                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />Review</div>
                                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm animate-pulse" />Hazard</div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 relative overflow-y-auto">
                          <ErrorBoundary componentName={viewMode === 'floorplan' ? 'FloorPlan' : 'DashboardGrid'}>
                            {viewMode === 'floorplan' ? (
                              <FloorPlan checkpoints={checkpoints} selectedCheckpointId={selectedCheckpointId} buildingId={selectedBuilding.id} onSelectCheckpoint={handleSelectCheckpoint} />
                            ) : (
                              <DashboardGrid checkpoints={checkpoints} logs={logs} onSelectCheckpoint={handleSelectCheckpoint} />
                            )}
                          </ErrorBoundary>
                        </div>
                      </div>
                    </div>
                    <div className="lg:col-span-1 overflow-hidden">
                      <ErrorBoundary componentName="LogFeed">
                        <LogFeed logs={logs} checkpoints={checkpoints} users={MOCK_USERS} onSelectLog={(log: CleaningLog) => { setLog(log); setCheckpoint(log.checkpoint_id); }} />
                      </ErrorBoundary>
                    </div>
                  </div>
                </>
              </ErrorBoundary>
            )}
            {activeTab === 'buildings' && <ErrorBoundary componentName="BuildingsView"><BuildingsView /></ErrorBoundary>}
            {activeTab === 'team' && <ErrorBoundary componentName="TeamView"><TeamView /></ErrorBoundary>}
            {activeTab === 'settings' && <ErrorBoundary componentName="SettingsView"><SettingsView /></ErrorBoundary>}
          </div>
        </main>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setLog(null)} role="dialog" aria-modal="true" aria-label="Cleaning log detail">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><Scan size={18} className="text-blue-600" />Cleaning Log Detail</h3>
                <p className="text-sm text-gray-500 font-mono text-xs mt-1">{selectedLog.id}</p>
              </div>
              <button onClick={() => setLog(null)} aria-label="Close log detail" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2 tracking-wide"><Camera size={14} /> Proof of Quality</h4>
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 relative shadow-inner">
                  <img src={selectedLog.proof_of_quality?.photo_storage_path?.startsWith('gs://') ? 'https://picsum.photos/600/600?grayscale' : (selectedLog.proof_of_quality?.photo_storage_path ?? 'https://picsum.photos/600/600?grayscale')} alt="Verification Evidence" className="w-full h-full object-cover" loading="lazy" />
                  {selectedLog.proof_of_quality?.detected_objects.map((obj, i) => (
                    <div key={i} className="absolute border-2 border-red-500 bg-red-500/10 flex items-end justify-center shadow-sm" style={{ left: `${obj.bounding_box.x}%`, top: `${obj.bounding_box.y}%`, width: `${obj.bounding_box.w}%`, height: `${obj.bounding_box.h}%` }}>
                      <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 font-bold absolute -top-5 left-0 rounded shadow-sm">{obj.label} {(obj.confidence * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
                {selectedLog.proof_of_quality && (
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Quality Score</span>
                    <span className={`font-bold ${selectedLog.proof_of_quality.overall_score >= 70 ? 'text-green-600' : 'text-red-600'}`}>{selectedLog.proof_of_quality.overall_score}/100</span>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2 tracking-wide"><Scan size={14} /> Proof of Presence</h4>
                  <div className="bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 space-y-3">
                    <div className="flex justify-between text-sm"><span className="text-blue-900 dark:text-blue-300 font-semibold">NFC Cryptographic Hash</span><Check size={16} className="text-blue-600" /></div>
                    <div className="text-[10px] text-blue-600/80 dark:text-blue-400/80 break-all font-mono bg-white/50 dark:bg-gray-800/50 p-2 rounded border border-blue-100/50 dark:border-blue-800/50">{selectedLog.proof_of_presence.nfc_payload_hash}</div>
                    <div className="text-xs text-blue-800 dark:text-blue-300 font-medium">Timestamp: <span className="text-gray-600 dark:text-gray-400 font-normal">{new Date(selectedLog.proof_of_presence.nfc_tap_timestamp).toLocaleString()}</span></div>
                  </div>
                  <div className="bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 space-y-3 mt-3">
                    <div className="flex justify-between text-sm"><span className="text-blue-900 dark:text-blue-300 font-semibold">Geolocation Verified</span><MapPin size={16} className="text-blue-600" /></div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-xs text-blue-600/80 dark:text-blue-400/80 bg-white/50 dark:bg-gray-800/50 p-2 rounded text-center"><span className="block font-bold text-blue-900 dark:text-blue-300 text-[10px] uppercase">Lat</span>{selectedLog.proof_of_presence.geo_location?.latitude.toFixed(4)}</div>
                      <div className="text-xs text-blue-600/80 dark:text-blue-400/80 bg-white/50 dark:bg-gray-800/50 p-2 rounded text-center"><span className="block font-bold text-blue-900 dark:text-blue-300 text-[10px] uppercase">Long</span>{selectedLog.proof_of_presence.geo_location?.longitude.toFixed(4)}</div>
                      <div className="text-xs text-blue-600/80 dark:text-blue-400/80 bg-white/50 dark:bg-gray-800/50 p-2 rounded text-center"><span className="block font-bold text-blue-900 dark:text-blue-300 text-[10px] uppercase">Accuracy</span>+/-{selectedLog.proof_of_presence.geo_location?.accuracy_meters}m</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wide">Verification Status</h4>
                  <div className={`p-3 rounded-xl border text-sm font-medium ${selectedLog.verification_result.status === 'verified' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' : selectedLog.verification_result.status === 'flagged_for_review' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
                    {selectedLog.verification_result.status === 'verified' && '✓ Verified'}
                    {selectedLog.verification_result.status === 'flagged_for_review' && '⚠ Flagged for Review'}
                    {selectedLog.verification_result.status === 'rejected' && '✗ Rejected'}
                  </div>
                  {selectedLog.verification_result.rejection_reason && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Reason: {selectedLog.verification_result.rejection_reason}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          isLoading={reportLoading}
          report={generatedReport}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}

export default App;
