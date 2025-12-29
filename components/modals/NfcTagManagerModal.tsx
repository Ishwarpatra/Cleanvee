import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { QrCode, Plus, Trash2, CheckCircle, XCircle, Search, MapPin } from 'lucide-react';

interface NfcTagManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    buildingId: string;
    buildingName: string;
}

interface NfcTag {
    id: string;
    label: string;
    location: string;
    floor: number;
    status: 'active' | 'inactive';
    lastScanned: string;
}

const NfcTagManagerModal: React.FC<NfcTagManagerModalProps> = ({ isOpen, onClose, buildingId, buildingName }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTag, setNewTag] = useState({ label: '', location: '', floor: 1 });

    // Mock tags data
    const [tags, setTags] = useState<NfcTag[]>([
        { id: 'tag-001', label: 'Main Lobby', location: 'Central entrance area', floor: 1, status: 'active', lastScanned: '10 mins ago' },
        { id: 'tag-002', label: 'Restroom 2F', location: 'North wing restroom', floor: 2, status: 'active', lastScanned: '2 hours ago' },
        { id: 'tag-003', label: 'Conf Room A', location: 'Executive conference room', floor: 3, status: 'active', lastScanned: '45 mins ago' },
        { id: 'tag-004', label: 'Kitchen', location: 'Break room kitchen', floor: 2, status: 'inactive', lastScanned: '3 days ago' },
        { id: 'tag-005', label: 'Executive Suite', location: 'CEO office area', floor: 5, status: 'active', lastScanned: '1 hour ago' },
    ]);

    const filteredTags = tags.filter(tag =>
        tag.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tag.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddTag = () => {
        if (newTag.label && newTag.location) {
            const tag: NfcTag = {
                id: `tag-${Date.now()}`,
                label: newTag.label,
                location: newTag.location,
                floor: newTag.floor,
                status: 'active',
                lastScanned: 'Never'
            };
            setTags(prev => [...prev, tag]);
            setNewTag({ label: '', location: '', floor: 1 });
            setShowAddForm(false);
        }
    };

    const handleToggleStatus = (tagId: string) => {
        setTags(prev => prev.map(tag =>
            tag.id === tagId
                ? { ...tag, status: tag.status === 'active' ? 'inactive' : 'active' }
                : tag
        ));
    };

    const handleDeleteTag = (tagId: string) => {
        if (confirm('Are you sure you want to delete this NFC tag?')) {
            setTags(prev => prev.filter(tag => tag.id !== tagId));
        }
    };

    const activeCount = tags.filter(t => t.status === 'active').length;
    const inactiveCount = tags.filter(t => t.status === 'inactive').length;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`NFC Tag Manager - ${buildingName}`}
            subtitle="Manage checkpoint tags for cleaning verification"
            size="xl"
        >
            <div className="p-6">
                {/* Stats Bar */}
                <div className="flex items-center gap-6 mb-6 p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <QrCode size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{tags.length}</p>
                            <p className="text-xs text-gray-500">Total Tags</p>
                        </div>
                    </div>
                    <div className="h-10 w-px bg-gray-200" />
                    <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-500" />
                        <span className="text-sm font-medium text-gray-700">{activeCount} Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <XCircle size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">{inactiveCount} Inactive</span>
                    </div>
                </div>

                {/* Search and Add */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search tags by name or location..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Add Tag
                    </button>
                </div>

                {/* Add Form */}
                {showAddForm && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">New NFC Checkpoint</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <input
                                type="text"
                                value={newTag.label}
                                onChange={(e) => setNewTag(prev => ({ ...prev, label: e.target.value }))}
                                placeholder="Tag Label (e.g., Restroom 3F)"
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                            <input
                                type="text"
                                value={newTag.location}
                                onChange={(e) => setNewTag(prev => ({ ...prev, location: e.target.value }))}
                                placeholder="Location description"
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                            <select
                                value={newTag.floor}
                                onChange={(e) => setNewTag(prev => ({ ...prev, floor: parseInt(e.target.value) }))}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(f => (
                                    <option key={f} value={f}>Floor {f}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleAddTag}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                            >
                                Create Tag
                            </button>
                        </div>
                    </div>
                )}

                {/* Tags List */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tag</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Floor</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last Scanned</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTags.map((tag) => (
                                <tr key={tag.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <QrCode size={16} className="text-purple-500" />
                                            <span className="font-medium text-gray-900 text-sm">{tag.label}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                            <MapPin size={12} className="text-gray-400" />
                                            {tag.location}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-gray-600">Floor {tag.floor}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleToggleStatus(tag.id)}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${tag.status === 'active'
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {tag.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                            {tag.status === 'active' ? 'Active' : 'Inactive'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-gray-500">{tag.lastScanned}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => handleDeleteTag(tag.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete tag"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTags.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        No tags found. Click "Add Tag" to create one.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
                <button
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                    Done
                </button>
            </div>
        </Modal>
    );
};

export default NfcTagManagerModal;
