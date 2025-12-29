import React, { useState } from 'react';
import { CleaningLog, ShiftReport } from './types';
import { MOCK_BUILDING, MOCK_USERS } from './constants';
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
import { generateShiftReport } from './services/geminiService';
import { useFirestoreData } from "./src/hooks/useFirestoreData";

import { X, Camera, Check, AlertTriangle, MapPin, Scan, LayoutGrid, Map as MapIcon, Loader2 } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedLog, setSelectedLog] = useState<CleaningLog | null>(null);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'floorplan' | 'grid'>('floorplan');

  // Real-time Data Hook
  // Note: We still use MOCK_BUILDING for the ID, but the data is now live from Firestore
  const { logs, checkpoints, loading } = useFirestoreData(MOCK_BUILDING.id);

  // Report State
  const [reportLoading, setReportLoading] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<ShiftReport | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleGenerateReport = async () => {
    setReportLoading(true);
    setShowReportModal(true);
    const report = await generateShiftReport(logs, checkpoints);
    setGeneratedReport(report);
    setReportLoading(false);
  };

  const selectedCheckpoint = checkpoints.find(c => c.id === selectedCheckpointId);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Connecting to VeriClean Live...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onGenerateReport={handleGenerateReport}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">

        <Header building={MOCK_BUILDING} />

        {/* Dynamic Content Area */}
        <div className="p-6 overflow-y-auto h-[calc(100vh-80px)] scroll-smooth">
          {activeTab === 'dashboard' && (
            <>
              <StatsOverview />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                {/* Left Column: Floor Plan (2/3 width) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-1 flex flex-col transition-all hover:shadow-md overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {viewMode === 'floorplan' ? 'Live Building View' : 'Room Status Grid'}
                      </h3>
                      <div className="flex items-center gap-3">
                        {/* View Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                          <button
                            onClick={() => setViewMode('floorplan')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'floorplan' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                            title="Floor Plan View"
                          >
                            <MapIcon size={16} />
                          </button>
                          <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                            title="Grid View"
                          >
                            <LayoutGrid size={16} />
                          </button>
                        </div>

                        {viewMode === 'floorplan' && (
                          <div className="hidden sm:flex gap-2 text-xs font-medium border-l border-gray-200 pl-3">
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></div>Clean</div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm"></div>Review</div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm animate-pulse"></div>Hazard</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 relative overflow-y-auto custom-scrollbar">
                      {viewMode === 'floorplan' ? (
                        <FloorPlan
                          checkpoints={checkpoints}
                          selectedCheckpointId={selectedCheckpointId}
                          onSelectCheckpoint={(id) => {
                            setSelectedCheckpointId(id);
                            const logsForCp = logs.filter(l => l.checkpoint_id === id);
                            if (logsForCp.length > 0) setSelectedLog(logsForCp[0]);
                          }}
                        />
                      ) : (
                        <DashboardGrid
                          checkpoints={checkpoints}
                          logs={logs}
                          onSelectCheckpoint={(id) => {
                            setSelectedCheckpointId(id);
                            const logsForCp = logs.filter(l => l.checkpoint_id === id);
                            if (logsForCp.length > 0) setSelectedLog(logsForCp[0]);
                          }}
                        />
                      )}
                    </div>

                    {selectedCheckpoint && viewMode === 'floorplan' && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-900">{selectedCheckpoint.location_label}</p>
                          <p className="text-gray-500 text-xs">Model: {selectedCheckpoint.ai_config.model_version}</p>
                        </div>
                        <span className="px-2 py-1 bg-gray-200 rounded text-xs text-gray-600 font-mono">
                          ID: {selectedCheckpoint.id.split('-')[1]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Feed (1/3 width) */}
                <div className="h-full">
                  <LogFeed
                    logs={logs}
                    checkpoints={checkpoints}
                    users={MOCK_USERS}
                    onSelectLog={(log) => {
                      setSelectedLog(log);
                      setSelectedCheckpointId(log.checkpoint_id);
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'team' && <TeamView />}
          {activeTab === 'buildings' && <BuildingsView />}
          {activeTab === 'settings' && <SettingsView />}
        </div>
      </main>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedLog(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Verification Detail</h3>
                <p className="text-sm text-gray-500 font-mono text-xs mt-1">{selectedLog.id}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Proof of Quality (Image + AI) */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2 tracking-wide">
                  <Camera size={14} /> Proof of Quality
                </h4>
                <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative group shadow-inner">
                  <img
                    src={selectedLog.proof_of_quality?.photo_storage_path || "https://picsum.photos/600/600"}
                    alt="Verification Evidence"
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay bounding box simulation */}
                  {selectedLog.proof_of_quality?.detected_objects.map((obj, i) => (
                    <div
                      key={i}
                      className="absolute border-2 border-red-500 bg-red-500/10 flex items-end justify-center shadow-sm"
                      style={{
                        left: `${obj.bounding_box.x}%`,
                        top: `${obj.bounding_box.y}%`,
                        width: `${obj.bounding_box.w}%`,
                        height: `${obj.bounding_box.h}%`
                      }}
                    >
                      <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 font-bold absolute -top-5 left-0 rounded shadow-sm">
                        {obj.label} {(obj.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proof of Presence & Meta */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2 tracking-wide">
                    <Scan size={14} /> Proof of Presence
                  </h4>
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-900 font-semibold">NFC Cryptographic Hash</span>
                      <Check size={16} className="text-blue-600" />
                    </div>
                    <div className="text-[10px] text-blue-600/80 break-all font-mono bg-white/50 p-2 rounded border border-blue-100/50">
                      {selectedLog.proof_of_presence.nfc_payload_hash}
                    </div>
                    <div className="text-xs text-blue-800 font-medium">
                      Timestamp: <span className="text-gray-600 font-normal">{new Date(selectedLog.proof_of_presence.nfc_tap_timestamp).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3 mt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-900 font-semibold">Geolocation Verified</span>
                      <MapPin size={16} className="text-blue-600" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-xs text-blue-600/80 bg-white/50 p-2 rounded text-center">
                        <span className="block font-bold text-blue-900 text-[10px] uppercase">Lat</span>
                        {selectedLog.proof_of_presence.geo_location?.latitude.toFixed(5)}
                      </div>
                      <div className="text-xs text-blue-600/80 bg-white/50 p-2 rounded text-center">
                        <span className="block font-bold text-blue-900 text-[10px] uppercase">Long</span>
                        {selectedLog.proof_of_presence.geo_location?.longitude.toFixed(5)}
                      </div>
                      <div className="text-xs text-blue-600/80 bg-white/50 p-2 rounded text-center">
                        <span className="block font-bold text-blue-900 text-[10px] uppercase">Accuracy</span>
                        ±{selectedLog.proof_of_presence.geo_location?.accuracy_meters}m
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <ReportModal
          loading={reportLoading}
          report={generatedReport}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}

export default App;