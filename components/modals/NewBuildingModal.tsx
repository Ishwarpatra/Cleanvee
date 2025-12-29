import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Building2, MapPin, Layers, Save, X } from 'lucide-react';

interface NewBuildingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (building: NewBuildingData) => void;
}

interface NewBuildingData {
    name: string;
    address: string;
    city: string;
    state: string;
    floors: number;
    initialTags: number;
}

const NewBuildingModal: React.FC<NewBuildingModalProps> = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState<NewBuildingData>({
        name: '',
        address: '',
        city: '',
        state: '',
        floors: 1,
        initialTags: 0
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'floors' || name === 'initialTags' ? parseInt(value) || 0 : value
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'Building name is required';
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.state.trim()) newErrors.state = 'State is required';
        if (formData.floors < 1) newErrors.floors = 'At least 1 floor required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSave(formData);
            // Reset form
            setFormData({ name: '', address: '', city: '', state: '', floors: 1, initialTags: 0 });
            onClose();
        }
    };

    const handleCancel = () => {
        setFormData({ name: '', address: '', city: '', state: '', floors: 1, initialTags: 0 });
        setErrors({});
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleCancel} title="Add New Building" subtitle="Configure a new facility for cleaning management" size="lg">
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-6">
                    {/* Building Info Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <Building2 size={16} className="text-blue-600" />
                            Building Information
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Building Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g., Apex Tower HQ"
                                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Location Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <MapPin size={16} className="text-blue-600" />
                            Location Details
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Street Address *</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="e.g., 101 Market Street"
                                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.address ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                                />
                                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    placeholder="e.g., San Francisco"
                                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.city ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                                />
                                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">State *</label>
                                <input
                                    type="text"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    placeholder="e.g., CA"
                                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.state ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                                />
                                {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Configuration Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <Layers size={16} className="text-blue-600" />
                            Initial Configuration
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Number of Floors *</label>
                                <input
                                    type="number"
                                    name="floors"
                                    value={formData.floors}
                                    onChange={handleChange}
                                    min="1"
                                    max="200"
                                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.floors ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                                />
                                {errors.floors && <p className="text-red-500 text-xs mt-1">{errors.floors}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Initial NFC Tags</label>
                                <input
                                    type="number"
                                    name="initialTags"
                                    value={formData.initialTags}
                                    onChange={handleChange}
                                    min="0"
                                    placeholder="0"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                                <p className="text-xs text-gray-500 mt-1">You can add more tags later</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <X size={16} />
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                    >
                        <Save size={16} />
                        Create Building
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default NewBuildingModal;
