import React, { useState, useEffect } from 'react';
import { Checkpoint, CleaningLog, LogStatus, SyncStatus, ShiftReport } from './types';
import { MOCK_BUILDING, MOCK_CHECKPOINTS, MOCK_USERS, INITIAL_LOGS } from './constants';
import FloorPlan from './components/FloorPlan';
import LogFeed from './components/LogFeed';
import StatsOverview from './components/StatsOverview';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ReportModal from './components/ReportModal';
import DashboardGrid from './components/DashboardGrid';
import { generateShiftReport } from './services/geminiService';
import { X, Camera, Check, AlertTriangle, MapPin, Scan, LayoutGrid, Map as MapIcon } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [logs, setLogs] = useState<CleaningLog[]>(INITIAL_LOGS);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(MOCK_CHECKPOINTS);
  const [selectedLog, setSelectedLog] = useState<CleaningLog | null>(null);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'floorplan' | 'grid'>('floorplan');
  
  // Report State
  const [reportLoading, setReportLoading] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<ShiftReport | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // 10% chance to simulate a new log arrival
      if (Math.random() > 0.9) {
        const randomCheckpoint = checkpoints[Math.floor(Math.random() * checkpoints.length)];
        const randomUser = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
        
        const isHazard = Math.random() > 0.8;
        const newLog: CleaningLog = {
          id: `log-${Date.now()}`,
          cleaner_id: randomUser.uid,
          checkpoint_id: randomCheckpoint.id,
          building_id: MOCK_BUILDING.id,
          sync_status: SyncStatus.SYNCED,
          created_at: new Date().toISOString(),
          proof_of_presence: {
            nfc_tap_timestamp: new Date().toISOString(),
            nfc_payload_hash: 'hash' + Date.now(),
            geo_location: {
               latitude: 37.78193 + (Math.random() - 0.5) * 0.0005,
               longitude: -122.40476 + (Math.random() - 0.5) * 0.0005,
               accuracy_meters: Math.floor(Math.random() * 10) + 2
            }
          },
          proof_of_quality: {
            photo_storage_path: 'gs://new_photo.jpg',
            ai_inference_timestamp: new Date().toISOString(),
            ai_model_used: randomCheckpoint.ai_config.model_version,
            inference_time_ms: 150 + Math.random() * 50,
            detected_objects: isHazard ? [{ label: 'spill', confidence: 0.95, bounding_box: {x:20, y:30, w:30, h:30}}] : [],
            overall_score: isHazard ? 40 : 95 + Math.random() * 5,
            passed_validation: !isHazard
          },
          verification_result: {
            status: isHazard ? LogStatus.FLAGGED : LogStatus.VERIFIED,
            rejection_reason: isHazard ? 'HAZARD_DETECTED' : null
          }
        };

        setLogs(prev => [newLog, ...prev]);

        // Update checkpoint status based on new log
        setCheckpoints(prev => prev.map(cp => {
          if (cp.id === newLog.checkpoint_id) {
             return {
               ...cp,
               current_status: newLog.verification_result.status === LogStatus.VERIFIED ? 'clean' : 'attention'
             };
          }
          return cp;
        }));
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [checkpoints]);

  const handleGenerateReport = async () => {
    setReportLoading(true);
    setShowReportModal(true);
    const report = await generateShiftReport(logs, checkpoints);
    setGeneratedReport(report);
    setReportLoading(false);
  };

  const selectedCheckpoint = checkpoints.find(c => c.id === selectedCheckpointId);

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

        {/* Dashboard Content */}
        <div className="p-6 overflow-y-auto h-[calc(100vh-80px)] scroll-smooth">
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
                             if(logsForCp.length > 0) setSelectedLog(logsForCp[0]);
                          }} 
                        />
                    ) : (
                        <DashboardGrid 
                            checkpoints={checkpoints}
                            logs={logs}
                            onSelectCheckpoint={(id) => {
                                setSelectedCheckpointId(id);
                                const logsForCp = logs.filter(l => l.checkpoint_id === id);
                                if(logsForCp.length > 0) setSelectedLog(logsForCp[0]);
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
                       src="https://picsum.photos/600/600" 
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
                     <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm font-mono border border-white/10">
                       {selectedLog.proof_of_quality?.ai_model_used}
                     </div>
                  </div>
                  <div className="mt-4 flex gap-4">
                     <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100 flex-1 shadow-sm">
                        <div className={`text-2xl font-bold ${selectedLog.proof_of_quality?.passed_validation ? 'text-green-600' : 'text-red-600'}`}>
                           {selectedLog.proof_of_quality?.overall_score}%
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-1">AI Clean Score</div>
                     </div>
                     <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100 flex-1 shadow-sm">
                        <div className="text-2xl font-bold text-gray-900">
                           {selectedLog.proof_of_quality?.inference_time_ms}<span className="text-sm font-normal text-gray-400">ms</span>
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-1">Inference Time</div>
                     </div>
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

                   <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wide">Verification Status</h4>
                      {selectedLog.verification_result.status === LogStatus.VERIFIED ? (
                         <div className="flex items-center gap-3 text-green-700 bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm">
                            <div className="p-2 bg-green-100 rounded-full">
                               <Check size={20} />
                            </div>
                            <div>
                               <p className="font-bold">Automated Pass</p>
                               <p className="text-xs opacity-90">No hazards detected. SLA Compliant.</p>
                            </div>
                         </div>
                      ) : (
                         <div className="flex items-center gap-3 text-red-700 bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm">
                            <div className="p-2 bg-red-100 rounded-full animate-pulse">
                               <AlertTriangle size={20} />
                            </div>
                            <div>
                               <p className="font-bold">Flagged for Review</p>
                               <p className="text-xs opacity-90">Reason: {selectedLog.verification_result.rejection_reason}</p>
                            </div>
                         </div>
                      )}
                   </div>

                   <div className="pt-4 border-t border-gray-100">
                      <button className="w-full py-2.5 bg-gray-900 hover:bg-black text-white rounded-lg text-sm font-medium transition-all shadow hover:shadow-lg">
                        Override Status & Approve
                      </button>
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