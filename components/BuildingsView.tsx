/**
 * BuildingsView.tsx — Building Management Interface
 *
 * Features:
 * - View all buildings
 * - Create new buildings
 * - Edit building details and SLA configuration
 * - Delete buildings
 * - Manage checkpoints per building
 * - Upload floor plan SVG
 */

import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, MapPin, Clock, AlertCircle, Loader2, Save, X } from 'lucide-react';
import { Building } from '../types';
import ErrorBoundary from './ui/ErrorBoundary';

const BuildingsViewComplete: React.FC = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Building>>({
    name: '',
    address: { street: '', city: '', state: '', zip: '' },
    client_sla_config: {
      required_cleanings_per_day: 3,
      cleaning_window_start: '06:00',
      cleaning_window_end: '20:00',
      max_cleaning_interval_hours: 4,
      grace_period_minutes: 15,
    },
  });

  // Load buildings from Firestore or mock data
  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const firebaseConfigured = Boolean(
          import.meta.env.VITE_FIREBASE_PROJECT_ID &&
          import.meta.env.VITE_FIREBASE_API_KEY
        );

        if (firebaseConfigured) {
          const { getFirestore, collection, query, where, getDocs } = await import('firebase/firestore');
          const { getApp } = await import('firebase/app');
          const db = getFirestore(getApp());

          const q = query(collection(db, 'buildings'), where('is_active', '!=', false));
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Building));
          setBuildings(data);
        } else {
          // Mock data for demo mode
          setBuildings([
            {
              id: 'bldg-001',
              name: 'Apex Tower HQ',
              address: { street: '101 Tech Blvd', city: 'San Francisco', state: 'CA', zip: '94105' },
              client_sla_config: {
                required_cleanings_per_day: 3,
                cleaning_window_start: '06:00',
                cleaning_window_end: '20:00',
              },
            },
            {
              id: 'bldg-002',
              name: 'Westside Logistics',
              address: { street: '4400 Industrial Pkwy', city: 'Oakland', state: 'CA', zip: '94601' },
              client_sla_config: {
                required_cleanings_per_day: 4,
                cleaning_window_start: '05:00',
                cleaning_window_end: '22:00',
              },
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to load buildings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBuildings();
  }, []);

  const handleSave = async () => {
    if (!formData.name || !formData.address) return;

    try {
      const firebaseConfigured = Boolean(
        import.meta.env.VITE_FIREBASE_PROJECT_ID &&
        import.meta.env.VITE_FIREBASE_API_KEY
      );

      if (firebaseConfigured) {
        const { getFirestore, collection, doc, setDoc, updateDoc } = await import('firebase/firestore');
        const { getApp } = await import('firebase/app');
        const db = getFirestore(getApp());

        if (editingId) {
          // Update existing building
          await updateDoc(doc(db, 'buildings', editingId), formData);
          setBuildings((prev) =>
            prev.map((b) => (b.id === editingId ? { ...b, ...formData } : b) as Building)
          );
        } else {
          // Create new building
          const newId = `bldg-${Date.now()}`;
          await setDoc(doc(db, 'buildings', newId), { ...formData, created_at: new Date().toISOString() });
          setBuildings((prev) => [...prev, { id: newId, ...formData } as Building]);
        }
      } else {
        // Demo mode: just update local state
        if (editingId) {
          setBuildings((prev) =>
            prev.map((b) => (b.id === editingId ? { ...b, ...formData } : b) as Building)
          );
        } else {
          const newId = `bldg-${Date.now()}`;
          setBuildings((prev) => [...prev, { id: newId, ...formData } as Building]);
        }
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        address: { street: '', city: '', state: '', zip: '' },
        client_sla_config: {
          required_cleanings_per_day: 3,
          cleaning_window_start: '06:00',
          cleaning_window_end: '20:00',
        },
      });
    } catch (err) {
      console.error('Failed to save building:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this building?')) return;

    try {
      const firebaseConfigured = Boolean(
        import.meta.env.VITE_FIREBASE_PROJECT_ID &&
        import.meta.env.VITE_FIREBASE_API_KEY
      );

      if (firebaseConfigured) {
        const { getFirestore, doc, updateDoc } = await import('firebase/firestore');
        const { getApp } = await import('firebase/app');
        const db = getFirestore(getApp());
        await updateDoc(doc(db, 'buildings', id), { is_active: false });
      }

      setBuildings((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error('Failed to delete building:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={40} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <ErrorBoundary componentName="BuildingsView">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 size={32} className="text-blue-600" />
              Buildings
            </h1>
            <p className="text-gray-500 mt-1">Manage facilities and SLA configurations</p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                name: '',
                address: { street: '', city: '', state: '', zip: '' },
                client_sla_config: {
                  required_cleanings_per_day: 3,
                  cleaning_window_start: '06:00',
                  cleaning_window_end: '20:00',
                },
              });
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus size={20} />
            New Building
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingId ? 'Edit Building' : 'New Building'}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Building Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Building Name
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Apex Tower HQ"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Address Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Street"
                    value={formData.address?.street || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, street: e.target.value },
                      })
                    }
                    className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={formData.address?.city || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, city: e.target.value },
                      })
                    }
                    className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={formData.address?.state || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, state: e.target.value },
                      })
                    }
                    className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="ZIP"
                    value={formData.address?.zip || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, zip: e.target.value },
                      })
                    }
                    className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* SLA Configuration */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">SLA Configuration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                        Required Cleanings/Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.client_sla_config?.required_cleanings_per_day || 3}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            client_sla_config: {
                              ...formData.client_sla_config,
                              required_cleanings_per_day: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                        Max Interval (hours)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.client_sla_config?.max_cleaning_interval_hours || 4}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            client_sla_config: {
                              ...formData.client_sla_config,
                              max_cleaning_interval_hours: parseInt(e.target.value),
                            },
                          })
                        }
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                        Window Start (HH:MM)
                      </label>
                      <input
                        type="time"
                        value={formData.client_sla_config?.cleaning_window_start || '06:00'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            client_sla_config: {
                              ...formData.client_sla_config,
                              cleaning_window_start: e.target.value,
                            },
                          })
                        }
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                        Window End (HH:MM)
                      </label>
                      <input
                        type="time"
                        value={formData.client_sla_config?.cleaning_window_end || '20:00'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            client_sla_config: {
                              ...formData.client_sla_config,
                              cleaning_window_end: e.target.value,
                            },
                          })
                        }
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Save size={20} />
                    Save Building
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buildings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {buildings.map((building) => (
            <div
              key={building.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{building.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(building.id);
                      setFormData(building);
                      setShowForm(true);
                    }}
                    className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors text-blue-600"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(building.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin size={16} />
                  <span className="text-sm">
                    {building.address.street}, {building.address.city}, {building.address.state} {building.address.zip}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock size={16} />
                  <span className="text-sm">
                    {building.client_sla_config.cleaning_window_start} -{' '}
                    {building.client_sla_config.cleaning_window_end}
                  </span>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-2">SLA Configuration</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-blue-800 dark:text-blue-200">
                    <div>
                      <span className="font-medium">Cleanings/Day:</span> {building.client_sla_config.required_cleanings_per_day}
                    </div>
                    <div>
                      <span className="font-medium">Max Interval:</span>{' '}
                      {building.client_sla_config.max_cleaning_interval_hours}h
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {buildings.length === 0 && (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">No buildings configured yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Create your first building to get started</p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default BuildingsViewComplete;
