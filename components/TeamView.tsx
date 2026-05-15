/**
 * TeamView.tsx — Team Member Management Interface
 *
 * Features:
 * - View all team members
 * - Add new team members
 * - Edit team member roles and building assignments
 * - Remove team members
 * - Filter by role
 */

import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Mail, Building2, AlertCircle, Loader2, Save, X } from 'lucide-react';
import { User, Role } from '../types';
import ErrorBoundary from './ui/ErrorBoundary';

const TeamView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<Role | 'all'>('all');
  const [formData, setFormData] = useState<Partial<User>>({
    email: '',
    full_name: '',
    role: Role.CLEANER,
    assigned_building_ids: [],
  });

  // Load users from Firestore or mock data
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const firebaseConfigured = Boolean(
          import.meta.env.VITE_FIREBASE_PROJECT_ID &&
          import.meta.env.VITE_FIREBASE_API_KEY
        );

        if (firebaseConfigured) {
          const { getFirestore, collection, query, where, getDocs } = await import('firebase/firestore');
          const { getApp } = await import('firebase/app');
          const db = getFirestore(getApp());

          const q = query(collection(db, 'users'), where('is_active', '!=', false));
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() } as User));
          setUsers(data);
        } else {
          // Mock data for demo mode
          setUsers([
            {
              uid: 'u-101',
              email: 'sarah.j@cleanvee.com',
              full_name: 'Sarah Jenkins',
              role: Role.CLEANER,
              assigned_building_ids: ['bldg-001'],
            },
            {
              uid: 'u-102',
              email: 'mike.t@cleanvee.com',
              full_name: 'Mike Torres',
              role: Role.CLEANER,
              assigned_building_ids: ['bldg-001'],
            },
            {
              uid: 'u-103',
              email: 'manager@cleanvee.com',
              full_name: 'Jane Manager',
              role: Role.MANAGER,
              assigned_building_ids: ['bldg-001', 'bldg-002'],
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const handleSave = async () => {
    if (!formData.email || !formData.full_name) return;

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
          // Update existing user
          await updateDoc(doc(db, 'users', editingId), formData);
          setUsers((prev) =>
            prev.map((u) => (u.uid === editingId ? { ...u, ...formData } : u) as User)
          );
        } else {
          // Create new user
          const newId = `u-${Date.now()}`;
          await setDoc(doc(db, 'users', newId), { ...formData, created_at: new Date().toISOString() });
          setUsers((prev) => [...prev, { uid: newId, ...formData } as User]);
        }
      } else {
        // Demo mode: just update local state
        if (editingId) {
          setUsers((prev) =>
            prev.map((u) => (u.uid === editingId ? { ...u, ...formData } : u) as User)
          );
        } else {
          const newId = `u-${Date.now()}`;
          setUsers((prev) => [...prev, { uid: newId, ...formData } as User]);
        }
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        email: '',
        full_name: '',
        role: Role.CLEANER,
        assigned_building_ids: [],
      });
    } catch (err) {
      console.error('Failed to save user:', err);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) return;

    try {
      const firebaseConfigured = Boolean(
        import.meta.env.VITE_FIREBASE_PROJECT_ID &&
        import.meta.env.VITE_FIREBASE_API_KEY
      );

      if (firebaseConfigured) {
        const { getFirestore, doc, updateDoc } = await import('firebase/firestore');
        const { getApp } = await import('firebase/app');
        const db = getFirestore(getApp());
        await updateDoc(doc(db, 'users', uid), { is_active: false });
      }

      setUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const filteredUsers = filterRole === 'all' ? users : users.filter((u) => u.role === filterRole);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={40} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <ErrorBoundary componentName="TeamView">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users size={32} className="text-blue-600" />
              Team Members
            </h1>
            <p className="text-gray-500 mt-1">Manage staff roles and building assignments</p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                email: '',
                full_name: '',
                role: Role.CLEANER,
                assigned_building_ids: [],
              });
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus size={20} />
            Add Member
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingId ? 'Edit Team Member' : 'Add Team Member'}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name || ''}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g., Sarah Jenkins"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="sarah@cleanvee.com"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
                  <select
                    value={formData.role || Role.CLEANER}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={Role.CLEANER}>Cleaner</option>
                    <option value={Role.MANAGER}>Manager</option>
                    <option value={Role.ADMIN}>Admin</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Save size={20} />
                    Save Member
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

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {(['all', Role.CLEANER, Role.MANAGER, Role.ADMIN] as const).map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-4 py-2.5 font-medium border-b-2 transition-colors ${
                filterRole === role
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {role === 'all' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </div>

        {/* Team Members Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Buildings</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 dark:text-white">{user.full_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Mail size={16} />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.role === Role.ADMIN
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : user.role === Role.MANAGER
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      }`}
                    >
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Building2 size={16} />
                      <span className="text-sm">{user.assigned_building_ids?.length || 0} buildings</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingId(user.uid);
                          setFormData(user);
                          setShowForm(true);
                        }}
                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors text-blue-600"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.uid)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-600"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">No team members found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Add your first team member to get started</p>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default TeamView;
