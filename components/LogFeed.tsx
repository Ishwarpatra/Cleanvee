import React from 'react';
import { CleaningLog, LogStatus, Checkpoint, User } from '../types';
import { Check, X, AlertOctagon, Smartphone, Camera, Loader2 } from 'lucide-react';

interface LogFeedProps {
  logs: CleaningLog[];
  checkpoints: Checkpoint[];
  users: User[];
  onSelectLog: (log: CleaningLog) => void;
}

const LogFeed: React.FC<LogFeedProps> = ({ logs, checkpoints, users, onSelectLog }) => {
  const getCleanerName = (id: string) => users.find(u => u.uid === id)?.full_name || 'Unknown User';
  const getCheckpointName = (id: string) => checkpoints.find(c => c.id === id)?.location_label || 'Unknown Location';

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: LogStatus) => {
    switch (status) {
      case LogStatus.VERIFIED:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"><Check size={10} className="mr-1" /> Verified</span>;
      case LogStatus.REJECTED:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300"><X size={10} className="mr-1" /> Rejected</span>;
      case LogStatus.FLAGGED:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"><AlertOctagon size={10} className="mr-1" /> Review</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">Pending</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col transition-colors">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900 dark:text-white">Live Cleaning Feed</h3>
        <span className="flex items-center text-xs text-green-600 dark:text-green-400">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Live Sync Active
        </span>
      </div>

      <div className="overflow-y-auto flex-1 p-2 space-y-2 scrollbar-hide">
        {logs.length === 0 && (
          <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-sm">No activity yet today.</div>
        )}
        {logs.map((log) => (
          <div
            key={log.id}
            onClick={() => onSelectLog(log)}
            className="group p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all cursor-pointer flex items-start gap-3"
          >
            <div className="mt-1">
              {log.proof_of_quality ? (
                <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800">
                  <Camera size={16} />
                </div>
              ) : (
                <div className="w-8 h-8 rounded bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 flex items-center justify-center border border-gray-100 dark:border-gray-600">
                  <Smartphone size={16} />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {getCheckpointName(log.checkpoint_id)}
                </p>
                <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">{formatTime(log.created_at)}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                by {getCleanerName(log.cleaner_id)}
              </p>

              <div className="flex items-center justify-between">
                {getStatusBadge(log.verification_result.status)}

                {log.proof_of_quality && (
                  <span className={`text-xs font-mono font-medium ${log.proof_of_quality.overall_score > 80 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    AI Score: {log.proof_of_quality.overall_score}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogFeed;
