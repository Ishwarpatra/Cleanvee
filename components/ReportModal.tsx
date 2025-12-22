import React from 'react';
import { ShiftReport } from '../types';
import { Sparkles, X, Loader2, AlertTriangle, CheckCircle, TrendingUp, Lightbulb } from 'lucide-react';

interface ReportModalProps {
  loading: boolean;
  report: ShiftReport | null;
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ loading, report, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white flex justify-between items-start shrink-0">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Sparkles size={18} className="text-yellow-300 animate-pulse" /> 
              AI Shift Summary
            </h3>
            <p className="text-indigo-100 text-sm mt-1 font-medium">Powered by Gemini 3 Flash</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
                <Loader2 size={40} className="animate-spin text-indigo-600 relative z-10" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Analyzing patterns...</p>
                <p className="text-sm text-gray-500 mt-1">Processing cleaning logs and SLA data</p>
              </div>
            </div>
          ) : report ? (
            <div className="space-y-6">
              {/* Score Card */}
              <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                 <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-indigo-200" />
                      <circle 
                        cx="32" cy="32" r="28" 
                        stroke="currentColor" strokeWidth="4" fill="none" 
                        className={`text-indigo-600 transition-all duration-1000 ease-out`}
                        strokeDasharray={175}
                        strokeDashoffset={175 - (175 * report.complianceScore) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-sm font-bold text-indigo-900">{report.complianceScore}%</span>
                 </div>
                 <div>
                    <h4 className="font-bold text-gray-900">Compliance Score</h4>
                    <p className="text-sm text-gray-600">Overall adherence to facility SLA requirements.</p>
                 </div>
              </div>

              {/* Issues */}
              <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertTriangle size={14} /> Key Issues Detected
                </h4>
                {report.keyIssues.length > 0 ? (
                  <ul className="space-y-2">
                    {report.keyIssues.map((issue, idx) => (
                      <li key={idx} className="flex items-start gap-3 bg-red-50 p-3 rounded-lg text-sm text-red-800 border border-red-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-lg">No critical issues detected.</p>
                )}
              </div>

              {/* Insights */}
              <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <TrendingUp size={14} /> Efficiency Insight
                </h4>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-900 leading-relaxed">
                  {report.efficiencyInsight}
                </div>
              </div>

              {/* Recommendation */}
              <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Lightbulb size={14} /> AI Recommendation
                </h4>
                <div className="flex gap-3 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                   <CheckCircle size={20} className="text-emerald-600 shrink-0" />
                   <p className="text-sm text-emerald-900 font-medium leading-relaxed">
                     {report.recommendation}
                   </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Failed to load report. Please try again.
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="bg-gray-50 px-6 py-4 flex justify-end shrink-0 border-t border-gray-100">
            <button 
              onClick={onClose} 
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 mr-2 transition-colors"
            >
              Close
            </button>
            <button className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-medium text-white hover:bg-indigo-700 shadow-sm transition-colors">
              Export PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportModal;