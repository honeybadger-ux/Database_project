import React, { useState, useEffect } from 'react';
import { adminService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import {
  Building2,
  PlusCircle,
  Edit2,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  MapPin,
  Phone,
  Power,
  Search,
  Filter,
  Shield,
  Lock,
} from 'lucide-react';

const HUB_TYPES = [
  { value: 'COLLECTION', label: 'Collection Center' },
  { value: 'SORTING', label: 'Central Sorting Hub' },
  { value: 'DISTRIBUTION', label: 'Regional Distribution Hub' },
];

export const HubManagementPage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCourierAdmin = user?.role === 'COURIER_ADMIN';
  const isHubManager = user?.role === 'HUB_MANAGER';
  const canAddHub = isSuperAdmin || isCourierAdmin;

  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHub, setEditingHub] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    hub_name: '',
    hub_type: 'COLLECTION',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    is_active: true,
  });

  const fetchHubs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminService.getHubs();
      const list = Array.isArray(response.data)
        ? response.data
        : response.data?.hubs || [];
      setHubs(list);
    } catch (err) {
      console.error('Failed to load hubs:', err);
      setError('Unable to load logistics hubs list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHubs();
  }, []);

  const openAddModal = () => {
    setEditingHub(null);
    setFormData({
      hub_name: '',
      hub_type: 'COLLECTION',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      is_active: true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (hub) => {
    setEditingHub(hub);
    setFormData({
      hub_name: hub.hub_name || '',
      hub_type: hub.hub_type || 'COLLECTION',
      address: hub.address || '',
      city: hub.city || '',
      state: hub.state || '',
      pincode: hub.pincode || '',
      phone: hub.phone || '',
      is_active: hub.is_active ?? true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setModalSubmitting(true);
    setFormError(null);

    try {
      if (editingHub) {
        const hubId = editingHub.hub_id || editingHub.id;
        await adminService.updateHub(hubId, formData);
      } else {
        const payload = isCourierAdmin && user?.courier_id ? { ...formData, courier_id: user.courier_id } : formData;
        await adminService.createHub(payload);
      }
      setModalOpen(false);
      await fetchHubs();
    } catch (err) {
      console.error('Failed to save hub:', err);
      setFormError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          'Failed to save hub record. Please check values.'
      );
    } finally {
      setModalSubmitting(false);
    }
  };

  const toggleHubStatus = async (hub) => {
    const hubId = hub.hub_id || hub.id;
    try {
      await adminService.updateHub(hubId, {
        ...hub,
        is_active: !hub.is_active,
      });
      await fetchHubs();
    } catch (err) {
      console.error('Failed to toggle hub active state:', err);
      setError('Could not update hub active status.');
    }
  };

  const filteredHubs = hubs.filter((h) => {
    const matchesSearch =
      !searchQuery.trim() ||
      h.hub_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.state?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = !typeFilter || h.hub_type === typeFilter;
    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'active' && h.is_active) ||
      (statusFilter === 'inactive' && !h.is_active);

    return matchesSearch && matchesType && matchesStatus;
  });

  const totalHubs = filteredHubs.length;
  const paginatedHubs = filteredHubs.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Hub Facilities Network</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {totalHubs} Facilities
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure logistics infrastructure, classification nodes, addresses, and operational availability.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchHubs}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh hubs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {canAddHub && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Facility</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by facility name, city, or state..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Classification Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-48 py-2 px-3 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
            >
              <option value="">All Classifications</option>
              {HUB_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-36 py-2 px-3 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs sm:text-sm flex items-center gap-3 animate-shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Hubs Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20">
            <LoadingSpinner size="lg" message="Loading hub network..." />
          </div>
        ) : filteredHubs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-[1.5]" />
            <h3 className="text-base font-bold text-slate-800">No hubs found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {canAddHub
                ? 'Add a new facility to expand your multi-hub logistics footprint.'
                : 'No network facilities matched your search criteria.'}
            </p>
            {canAddHub && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add Facility
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Facility Name</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedHubs.map((hub) => {
                  const hubId = hub.hub_id || hub.id;
                  const isActive = hub.is_active ?? true;
                  const canManageThisHub =
                    isSuperAdmin ||
                    (isCourierAdmin && (hub.courier_id === user?.courier_id || !hub.courier_id)) ||
                    (isHubManager && user?.hub_id === hubId);

                  return (
                    <tr key={hubId} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          <span className="text-slate-900">{hub.hub_name}</span>
                          {user?.hub_id === hubId && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                              Your Station
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal pl-6 mt-0.5">
                          ID: #{hubId} • {hub.address}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={hub.hub_type} size="xs" />
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {hub.city}, {hub.state}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">PIN: {hub.pincode}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {hub.phone || 'N/A'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {canManageThisHub ? (
                          <button
                            type="button"
                            onClick={() => toggleHubStatus(hub)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                            }`}
                            title="Click to toggle operational status"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {isActive ? 'Active' : 'Inactive'}
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {canManageThisHub ? (
                          <button
                            onClick={() => openEditModal(hub)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-400 bg-slate-50 border border-slate-200 cursor-default"
                            title="Facility managed by assigned Regional Manager"
                          >
                            <Lock className="w-3 h-3 text-slate-400" /> View Only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(totalHubs / pageSize))}
          onPageChange={(newPage) => setPage(newPage)}
          totalItems={totalHubs}
          pageSize={pageSize}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[10, 15, 25, 50]}
          itemLabel="facilities"
        />
      </div>

      {/* Add / Edit Hub Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingHub ? `Edit Facility: ${editingHub.hub_name}` : 'Register New Hub Facility'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Facility Name *
            </label>
            <input
              type="text"
              name="hub_name"
              value={formData.hub_name}
              onChange={handleFormChange}
              placeholder="e.g. Pune Distribution Hub"
              required
              className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Hub Type / Role *
              </label>
              <select
                name="hub_type"
                value={formData.hub_type}
                onChange={handleFormChange}
                required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                {HUB_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone Contact
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleFormChange}
                placeholder="020-7777777"
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Street Address *
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleFormChange}
              placeholder="e.g. 707 Hadapsar Industrial Estate"
              required
              className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                City *
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleFormChange}
                placeholder="Pune"
                required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                State *
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleFormChange}
                placeholder="Maharashtra"
                required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                PIN Code *
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleFormChange}
                placeholder="411028"
                required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-mono font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="hubActiveCheck"
              name="is_active"
              checked={formData.is_active}
              onChange={handleFormChange}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <label htmlFor="hubActiveCheck" className="font-bold text-slate-700">
              Facility is currently operational (Active)
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm disabled:opacity-50"
            >
              {modalSubmitting ? 'Saving...' : editingHub ? 'Update Facility' : 'Create Hub'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default HubManagementPage;
