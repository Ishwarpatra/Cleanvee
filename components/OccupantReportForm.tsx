import React, { useState } from 'react';
import { Shield, Send, AlertTriangle, Wind, Droplets, Trash2, CheckCircle2 } from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Reuse firebase config (In production, move to a shared file)
const firebaseConfig = {
    apiKey: "AIzaSyDnLhKEkQH-JTkWlk1iye1jtZQwo12CyzI",
    authDomain: "vericlean-1a6ee.firebaseapp.com",
    projectId: "vericlean-1a6ee",
    storageBucket: "vericlean-1a6ee.firebasestorage.app",
    messagingSenderId: "931450395496",
    appId: "1:931450395496:web:f16dfff3c55932c42e14dd",
    measurementId: "G-1FNJZ897L4"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const OccupantReportForm: React.FC = () => {
    const [reportType, setReportType] = useState<string | null>(null);
    const [details, setDetails] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

    // Hardcoded for demo/QR code mock
    const checkpointId = 'cp-001';
    const buildingId = 'bldg-001';

    const issueTypes = [
        { id: 'BAD_SMELL', label: 'Bad Odor', icon: Wind, color: 'text-purple-600', bgColor: 'bg-purple-50' },
        { id: 'DIRTY', label: 'Visible Dirt', icon: Trash2, color: 'text-amber-600', bgColor: 'bg-amber-50' },
        { id: 'SPILL', label: 'Wet/Spill', icon: Droplets, color: 'text-blue-600', bgColor: 'bg-blue-50' },
        { id: 'OTHER', label: 'Other Issue', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reportType) return;

        setStatus('submitting');
        try {
            await addDoc(collection(db, 'occupant_feedback'), {
                checkpoint_id: checkpointId,
                building_id: buildingId,
                type: reportType,
                details: details,
                created_at: serverTimestamp(),
                source: 'QR_CODE_SCAN'
            });
            setStatus('success');
        } catch (error) {
            console.error('Error submitting report:', error);
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} className="text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
                    <p className="text-gray-500 mb-8">Your feedback has been received. Our team will address it immediately.</p>
                    <button
                        onClick={() => { setStatus('idle'); setReportType(null); setDetails(''); }}
                        className="w-full py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 p-8 text-white relative h-48 flex flex-col justify-end">
                    <div className="absolute top-8 left-8 p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                        <Shield size={32} />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Cleanvee</h1>
                    <p className="text-blue-100 opacity-90 font-medium">Facility Quality Report</p>
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Report an Issue</h2>
                        <p className="text-gray-500 text-sm">Help us keep your workspace clean and safe. Scanned at: <span className="font-semibold text-gray-700">Main Lobby</span></p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Category Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {issueTypes.map((type) => {
                                const Icon = type.icon;
                                const isSelected = reportType === type.id;
                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setReportType(type.id)}
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${isSelected
                                            ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/10'
                                            : 'border-gray-100 bg-white hover:border-gray-200'
                                            }`}
                                    >
                                        <div className={`p-3 rounded-xl ${type.bgColor} ${type.color}`}>
                                            <Icon size={24} />
                                        </div>
                                        <span className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>{type.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Optional Details */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Additional Details (Optional)</label>
                            <textarea
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                placeholder="e.g. Near the elevators, needs soap, etc..."
                                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:bg-white focus:outline-none transition-all resize-none h-32 text-gray-900"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            disabled={!reportType || status === 'submitting'}
                            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${!reportType
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                                }`}
                        >
                            {status === 'submitting' ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Submit Report <Send size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Privacy Note */}
                    <p className="mt-8 text-center text-xs text-gray-400">
                        Powered by Cleanvee AI Verification System.<br />
                        Anonymous report • Secured with Model Context Protocol
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OccupantReportForm;
