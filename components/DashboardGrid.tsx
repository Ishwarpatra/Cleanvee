import React from 'react';
import { Checkpoint, CleaningLog, LogStatus } from '../types';
import { Clock, AlertTriangle, CheckCircle, XCircle, Ban } from 'lucide-react';

interface DashboardGridProps {
  checkpoints: Checkpoint[];
  logs: CleaningLog[];
  onSelectCheckpoint: (id: string) => void;
}

const DashboardGrid: React.FC<DashboardGridProps> = ({ checkpoints, logs, onSelectCheckpoint }) => {
  
  const getRoomStatus = (checkpointId: string) => {
    // Get logs for this checkpoint, sorted by date desc
    const roomLogs = logs
      .filter(l => l.checkpoint_id === checkpointId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const lastLog = roomLogs[0];
    
    if (!lastLog) {
      return { color: 'bg-red-50 border-red-200', icon: <Ban className="text-red-500" />, text: 'Never Cleaned', status: 'critical' };
    }

    const lastCleaned = new Date(lastLog.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastCleaned.getTime()) / (1000 * 60 * 60);

    // Logic: Red if Failed or > 8 hours
    if (lastLog.verification_result.status !== LogStatus.VERIFIED) {
        return { 
            color: 'bg-red-50 border-red-200', 
            icon: <XCircle className="text-red-500" />, 
            text: 'Cleaning Failed', 
            status: 'critical',
            lastLog 
        };
    }

    if (hoursDiff > 8) {
        return { 
            color: 'bg-red-50 border-red-200', 
            icon: <AlertTriangle className="text-red-500" />, 
            text: `Overdue (+${Math.floor(hoursDiff)}h)`, 
            status: 'critical',
            lastLog
        };
    }

    // Logic: Yellow if > 4 hours
    if (hoursDiff > 4) {
        return { 
            color: 'bg-amber-50 border-amber-200', 
            icon: <Clock className="text-amber-500" />, 
            text: `Due Soon (${Math.floor(hoursDiff)}h ago)`, 
            status: 'warning',
            lastLog
        };
    }

    // Logic: Green
    return { 
        color: 'bg-emerald-50 border-emerald-200', 
        icon: <CheckCircle className="text-emerald-500" />, 
        text: 'Clean & Verified', 
        status: 'good',
        lastLog
    };
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-1">
      {checkpoints.map(cp => {
        const status = getRoomStatus(cp.id);
        
        return (
          <div 
            key={cp.id}
            onClick={() => onSelectCheckpoint(cp.id)}
            className={`p-4 rounded-xl border shadow-sm cursor-pointer transition-all hover:shadow-md ${status.color}`}
          >
            <div className="flex justify-between items-start mb-3">
               <div>
                  <h4 className="font-bold text-gray-900 line-clamp-1">{cp.location_label}</h4>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{cp.floor_number === 1 ? 'Level 1' : `Level ${cp.floor_number}`}</p>
               </div>
               <div className="bg-white p-1.5 rounded-full shadow-sm">
                  {status.icon}
               </div>
            </div>
            
            <div className="space-y-2">
               <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Status</span>
                  <span className={`font-semibold ${
                      status.status === 'good' ? 'text-emerald-700' : 
                      status.status === 'warning' ? 'text-amber-700' : 'text-red-700'
                  }`}>
                    {status.text}
                  </span>
               </div>
               
               {status.lastLog && (
                 <div className="pt-2 border-t border-black/5 flex items-center justify-between text-xs text-gray-500">
                    <span>Last: {formatTime(status.lastLog.created_at)}</span>
                    {status.lastLog.proof_of_quality && (
                        <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">
                            Score: {status.lastLog.proof_of_quality.overall_score}%
                        </span>
                    )}
                 </div>
               )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardGrid;