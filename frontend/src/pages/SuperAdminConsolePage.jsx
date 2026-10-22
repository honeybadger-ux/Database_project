import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Building2,
  Users,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Search,
  Filter,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { superAdminService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

export const SuperAdminConsolePage = () => {
  const { logout } = useAuth();
  const [overview, setOverview] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [disputeFilter, setDisputeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);

  // Forms
  const [newCourier, setNewCourier] = useState({
    name: '',
    code: '',
    base_rate: '45.00',
    rating: '4.70',
    tracking_url_prefix: '',
  });

  const [newSeller, setNewSeller] = useState({
    company_name: '',
    contact_email: '',
    contact_phone: '',
    city: '',
    state: '',
  });

  const [resolveForm, setResolveForm] = useState({
    status: 'RESOLVED',
    resolution_notes: '',
  });

  useEffect(() => {
    loadData();
  }, [disputeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, disputesRes] = await Promise.all([
        superAdminService.getOverview(),
        superAdminService.getDisputes({ status: disputeFilter || undefined }),
      ]);
      setOverview(overviewRes.data);
      setDisputes(disputesRes.data);
    } catch (err) {
      console.error('Failed to load super admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourier = async (e) => {
    e.preventDefault();
    try {
      await superAdminService.onboardCourier({
        ...newCourier,
        base_rate: parseFloat(newCourier.base_rate),
        rating: parseFloat(newCourier.rating),
      });
      setIsCourierModalOpen(false);
      setNewCourier({ name: '', code: '', base_rate: '45.00', rating: '4.70', tracking_url_prefix: '' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to onboard courier.');
    }
  };

  const handleCreateSeller = async (e) => {
    e.preventDefault();
    try {
      await superAdminService.onboardSeller(newSeller);
      setIsSellerModalOpen(false);
      setNewSeller({ company_name: '', contact_email: '', contact_phone: '', city: '', state: '' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to onboard seller.');
    }
  };

  const handleOpenResolveModal = (dispute) => {
    setSelectedDispute(dispute);
    setResolveForm({
      status: dispute.status === 'OPEN' ? 'RESOLVED' : dispute.status,
      resolution_notes: dispute.resolution_notes || '',
    });
    setIsResolveModalOpen(true);
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDispute) return;
    try {
      await superAdminService.resolveDispute(selectedDispute.dispute_id, resolveForm);
      setIsResolveModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update dispute.');
    }
  };

  if (loading && !overview) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 rounded-2xl shadow-xl p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                Super Root Admin Console • Platform Owner Authority
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Aggregator Master Governance Console
            </h1>
            <p className="mt-1 text-slate-300 text-sm max-w-2xl">
              Cross-tenant carrier oversight, merchant onboarding, SLA auditing, and automated dispute resolution across all partner logistics networks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCourierModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Onboard Carrier
            </button>
            <button
              onClick={() => setIsSellerModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Onboard Merchant
            </button>
            <button
              onClick={loadData}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition text-white"
              title="Refresh Platform Metrics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 rounded-xl transition text-xs font-semibold flex items-center gap-1.5"
              title="Sign Out of Platform Owner Console"
            >
              <LogOut className="w-4 h-4 text-rose-300" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Top KPIs */}
        {overview && (
          <div className="mt-8 pt-6 border-t border-purple-800/50 grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <span className="text-xs text-purple-200">Courier Partners</span>
              <p className="text-2xl font-bold mt-1">{overview.total_couriers}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <span className="text-xs text-purple-200">Merchant Sellers</span>
              <p className="text-2xl font-bold mt-1">{overview.total_sellers}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <span className="text-xs text-purple-200">Platform Shipments</span>
              <p className="text-2xl font-bold mt-1">{overview.total_parcels}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <span className="text-xs text-purple-200">Total Disputes</span>
              <p className="text-2xl font-bold mt-1">{overview.total_disputes}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <span className="text-xs text-purple-200">Active Disputes</span>
              <p className="text-2xl font-bold text-amber-300 mt-1">{overview.active_disputes}</p>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 1: Dispute Resolution Arbitration Center */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Cross-Tenant Dispute Arbitration Console</h2>
              <p className="text-xs text-gray-500">
                Customer and merchant escalations requiring Super Root Admin arbitration and carrier resolution.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={disputeFilter}
              onChange={(e) => setDisputeFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Disputes</option>
              <option value="OPEN">Open Only</option>
              <option value="IN_INVESTIGATION">In Investigation</option>
              <option value="RESOLVED">Resolved Only</option>
              <option value="REJECTED">Rejected Only</option>
            </select>
          </div>
        </div>

        {disputes.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">No active disputes</p>
            <p className="text-xs text-gray-400 mt-1">All customer and merchant shipments are operating within SLA tolerances.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">ID</th>
                  <th className="px-6 py-3 font-semibold">Tracking #</th>
                  <th className="px-6 py-3 font-semibold">Carrier</th>
                  <th className="px-6 py-3 font-semibold">Raised By</th>
                  <th className="px-6 py-3 font-semibold">Reason</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Created</th>
                  <th className="px-6 py-3 font-semibold text-right">Arbitration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs">
                {disputes.map((d) => (
                  <tr key={d.dispute_id} className="hover:bg-gray-50/80 transition">
                    <td className="px-6 py-4 font-mono font-semibold text-gray-600">#{d.dispute_id}</td>
                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                      <a
                        href={`http://localhost:5173/?tracking=${d.tracking_number}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline flex items-center gap-1"
                      >
                        {d.tracking_number}
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </a>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{d.courier_name || 'Carrier'}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{d.raised_by_name || 'Customer'}</div>
                      <div className="text-[11px] text-gray-500">{d.raised_by_email} ({d.raised_by_type})</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-gray-700" title={d.reason}>
                      {d.reason}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          d.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : d.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : d.status === 'IN_INVESTIGATION'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{new Date(d.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenResolveModal(d)}
                        className="text-xs font-semibold text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-lg transition"
                      >
                        Arbitrate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: Courier Companies Management */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Onboarded Courier Carriers</h2>
              <p className="text-xs text-gray-500">Carrier tenants, base rates, SLA ratings, and volume throughput.</p>
            </div>
          </div>
          <button
            onClick={() => setIsCourierModalOpen(true)}
            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Carrier
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Courier Partner</th>
                <th className="px-6 py-3 font-semibold">Code</th>
                <th className="px-6 py-3 font-semibold">Base Rate</th>
                <th className="px-6 py-3 font-semibold">Rating</th>
                <th className="px-6 py-3 font-semibold">Hubs</th>
                <th className="px-6 py-3 font-semibold">Employees</th>
                <th className="px-6 py-3 font-semibold">Parcels</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {overview?.carriers?.map((c) => (
                <tr key={c.courier_id} className="hover:bg-gray-50/80 transition">
                  <td className="px-6 py-4 font-bold text-gray-900">{c.name}</td>
                  <td className="px-6 py-4 font-mono font-semibold text-gray-600">{c.code}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">₹{c.base_rate}</td>
                  <td className="px-6 py-4 text-amber-600 font-semibold">⭐ {c.rating}</td>
                  <td className="px-6 py-4 text-gray-700">{c.hubs_count}</td>
                  <td className="px-6 py-4 text-gray-700">{c.employees_count}</td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-indigo-600">{c.total_parcels}</span>
                    <span className="text-[11px] text-gray-400"> ({c.delivered_parcels} delivered)</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {c.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Merchant Sellers Management */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Onboarded E-Commerce Sellers</h2>
              <p className="text-xs text-gray-500">Merchant accounts utilizing platform aggregator services.</p>
            </div>
          </div>
          <button
            onClick={() => setIsSellerModalOpen(true)}
            className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Merchant
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Seller Company</th>
                <th className="px-6 py-3 font-semibold">Contact Email</th>
                <th className="px-6 py-3 font-semibold">Total Orders</th>
                <th className="px-6 py-3 font-semibold">Active Consignments</th>
                <th className="px-6 py-3 font-semibold">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {overview?.sellers?.map((s) => (
                <tr key={s.seller_id} className="hover:bg-gray-50/80 transition">
                  <td className="px-6 py-4 font-bold text-gray-900">{s.company_name}</td>
                  <td className="px-6 py-4 font-mono text-gray-600">{s.contact_email}</td>
                  <td className="px-6 py-4 font-semibold text-indigo-600">{s.total_orders}</td>
                  <td className="px-6 py-4 font-semibold text-amber-600">{s.active_orders}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {s.is_active ? 'ACTIVE' : 'SUSPENDED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Dispute Arbitration */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title={selectedDispute ? `Arbitrate Dispute #${selectedDispute.dispute_id}` : 'Arbitrate Dispute'}
      >
        {selectedDispute && (
          <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-gray-50 border rounded-xl space-y-1">
              <p><span className="font-semibold text-gray-700">Parcel Tracking:</span> {selectedDispute.tracking_number}</p>
              <p><span className="font-semibold text-gray-700">Courier Partner:</span> {selectedDispute.courier_name}</p>
              <p><span className="font-semibold text-gray-700">Claimant:</span> {selectedDispute.raised_by_name} ({selectedDispute.raised_by_email})</p>
              <p><span className="font-semibold text-gray-700">Dispute Reason:</span> {selectedDispute.reason}</p>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Arbitration Action</label>
              <select
                value={resolveForm.status}
                onChange={(e) => setResolveForm({ ...resolveForm, status: e.target.value })}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-purple-500 font-semibold"
              >
                <option value="RESOLVED">Resolve Dispute (Carrier Fault Addressed / Refund Approved)</option>
                <option value="IN_INVESTIGATION">Escalate to Investigation (Hold SLA)</option>
                <option value="REJECTED">Reject Dispute (SLA Upheld / Customer Absence)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Super Root Admin Resolution Notes</label>
              <textarea
                rows="3"
                required
                value={resolveForm.resolution_notes}
                onChange={(e) => setResolveForm({ ...resolveForm, resolution_notes: e.target.value })}
                placeholder="Enter formal arbitration ruling for this dispute..."
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-purple-500"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="px-3 py-1.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded"
              >
                Save Ruling
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: Onboard Courier Carrier */}
      <Modal
        isOpen={isCourierModalOpen}
        onClose={() => setIsCourierModalOpen(false)}
        title="Onboard New Logistics Partner"
      >
        <form onSubmit={handleCreateCourier} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Courier Carrier Name</label>
            <input
              type="text"
              required
              value={newCourier.name}
              onChange={(e) => setNewCourier({ ...newCourier, name: e.target.value })}
              placeholder="e.g. DHL Express India"
              className="w-full border rounded-lg p-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Carrier Code</label>
              <input
                type="text"
                required
                value={newCourier.code}
                onChange={(e) => setNewCourier({ ...newCourier, code: e.target.value.toUpperCase() })}
                placeholder="e.g. DHL"
                className="w-full border rounded-lg p-2 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Base Rate (₹)</label>
              <input
                type="number"
                step="0.5"
                required
                value={newCourier.base_rate}
                onChange={(e) => setNewCourier({ ...newCourier, base_rate: e.target.value })}
                className="w-full border rounded-lg p-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Initial SLA Rating (out of 5.0)</label>
            <input
              type="number"
              step="0.05"
              min="1.0"
              max="5.0"
              required
              value={newCourier.rating}
              onChange={(e) => setNewCourier({ ...newCourier, rating: e.target.value })}
              className="w-full border rounded-lg p-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsCourierModalOpen(false)}
              className="px-3 py-1.5 text-gray-700 bg-gray-100 rounded font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded"
            >
              Onboard Partner
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Onboard Seller Merchant */}
      <Modal
        isOpen={isSellerModalOpen}
        onClose={() => setIsSellerModalOpen(false)}
        title="Onboard New E-Commerce Merchant"
      >
        <form onSubmit={handleCreateSeller} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Merchant / Company Name</label>
            <input
              type="text"
              required
              value={newSeller.company_name}
              onChange={(e) => setNewSeller({ ...newSeller, company_name: e.target.value })}
              placeholder="e.g. Tata CLiQ Commerce"
              className="w-full border rounded-lg p-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Contact Email</label>
              <input
                type="email"
                required
                value={newSeller.contact_email}
                onChange={(e) => setNewSeller({ ...newSeller, contact_email: e.target.value })}
                placeholder="merchant-ops@tatacliq.com"
                className="w-full border rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Contact Phone</label>
              <input
                type="text"
                required
                value={newSeller.contact_phone}
                onChange={(e) => setNewSeller({ ...newSeller, contact_phone: e.target.value })}
                placeholder="+91 9820099881"
                className="w-full border rounded-lg p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Headquarters City</label>
              <input
                type="text"
                value={newSeller.city}
                onChange={(e) => setNewSeller({ ...newSeller, city: e.target.value })}
                placeholder="Mumbai"
                className="w-full border rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">State</label>
              <input
                type="text"
                value={newSeller.state}
                onChange={(e) => setNewSeller({ ...newSeller, state: e.target.value })}
                placeholder="Maharashtra"
                className="w-full border rounded-lg p-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsSellerModalOpen(false)}
              className="px-3 py-1.5 text-gray-700 bg-gray-100 rounded font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded"
            >
              Generate Keys & Onboard
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SuperAdminConsolePage;
