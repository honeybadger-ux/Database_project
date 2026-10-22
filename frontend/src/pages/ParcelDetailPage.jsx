import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { parcelService, deliveryService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import TrackingTimeline from '../components/TrackingTimeline';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import {
  Package,
  ArrowLeft,
  Truck,
  MapPin,
  Building,
  User,
  Scale,
  Maximize2,
  Calendar,
  DollarSign,
  Send,
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertCircle,
  FileText,
  Clock,
  Shield,
  Phone,
  Navigation,
  CheckCircle2,
} from 'lucide-react';

export const ParcelDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [parcel, setParcel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status Update Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState(null);

  // Delivery Attempt Modal State
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [attemptData, setAttemptData] = useState({
    outcome: 'DELIVERED',
    recipient_name: '',
    signature_collected: true,
    remarks: 'Delivered to recipient with verified acknowledgment.',
  });
  const [deliverySubmitting, setDeliverySubmitting] = useState(false);
  const [deliveryError, setDeliveryError] = useState(null);

  const fetchParcelDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await parcelService.getParcel(id);
      setParcel(response.data);
      const recName = response.data?.receiver?.full_name || response.data?.receiver_name;
      if (recName) {
        setAttemptData((prev) => ({
          ...prev,
          recipient_name: recName,
        }));
      }
    } catch (err) {
      console.error('Failed to load parcel details:', err);
      setError(
        err.response?.data?.detail || 'Parcel not found or network error occurred.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParcelDetails();
  }, [id]);

  // Open status modal for specific action
  const openStatusChange = (statusPreset) => {
    setNewStatus(statusPreset);
    setStatusRemarks(`Status progressed to ${statusPreset.replace(/_/g, ' ')}`);
    setStatusError(null);
    setStatusModalOpen(true);
  };

  // Handle parcel status update
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!newStatus) return;

    setStatusSubmitting(true);
    setStatusError(null);

    try {
      await parcelService.updateParcelStatus(id, {
        status: newStatus,
        hub_id: user?.hub_id || parcel?.current_hub_id || parcel?.origin_hub_id,
        remarks: statusRemarks,
      });

      setStatusModalOpen(false);
      await fetchParcelDetails();
    } catch (err) {
      console.error('Failed to update status:', err);
      setStatusError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          'Failed to update parcel status.'
      );
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Handle delivery attempt submission
  const handleDeliverySubmit = async (e) => {
    e.preventDefault();
    setDeliverySubmitting(true);
    setDeliveryError(null);

    try {
      await deliveryService.recordAttempt({
        parcel_id: parseInt(id, 10),
        outcome: attemptData.outcome,
        recipient_name: attemptData.recipient_name,
        signature_collected: attemptData.signature_collected,
        remarks: attemptData.remarks,
      });

      setDeliveryModalOpen(false);
      await fetchParcelDetails();
    } catch (err) {
      console.error('Failed to record delivery attempt:', err);
      setDeliveryError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          'Failed to record delivery attempt.'
      );
    } finally {
      setDeliverySubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" message="Loading parcel tracking details..." />
      </div>
    );
  }

  if (error || !parcel) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-xl border border-rose-200 shadow-sm text-center">
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Error Loading Parcel</h2>
        <p className="text-sm text-slate-600 mb-6">{error || 'Parcel record could not be found.'}</p>
        <button
          onClick={() => navigate('/parcels')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Parcel List
        </button>
      </div>
    );
  }

  const currentStatus = parcel.current_status;

  // Role and regional permission guards
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCourierAdmin = user?.role === 'COURIER_ADMIN';
  const isManager = user?.role === 'HUB_MANAGER';
  const isClerk = user?.role === 'CLERK';
  const isCourier = user?.role === 'COURIER';
  const isWarehouse = user?.role === 'WAREHOUSE_STAFF';

  const isExecutive = isSuperAdmin || (isCourierAdmin && (user?.courier_id === parcel?.courier_id || !parcel?.courier_id));
  const isOriginHub = isExecutive || user?.hub_id === parcel?.origin_hub_id;
  const isDestinationHub = isExecutive || user?.hub_id === parcel?.destination_hub_id;
  const isCurrentHub = isExecutive || user?.hub_id === parcel?.current_hub_id;

  const canSendOutOfDelivery = currentStatus === 'ARRIVED_AT_HUB' && (isManager || isClerk || isWarehouse || isExecutive) && isDestinationHub && parcel?.current_hub_id === parcel?.destination_hub_id;
  const canDispatchShipment = currentStatus === 'ARRIVED_AT_HUB' && (isManager || isClerk || isExecutive) && isCurrentHub && parcel?.current_hub_id !== parcel?.destination_hub_id;
  const canRecordDelivery = currentStatus === 'OUT_FOR_DELIVERY' && (isCourier || isManager || isExecutive) && isDestinationHub;
  const canReattemptDelivery = currentStatus === 'FAILED_DELIVERY' && (isCourier || isClerk || isManager || isExecutive) && isDestinationHub;
  const canCheckinOrigin = ['REGISTERED', 'PICKED_UP'].includes(currentStatus) && (isClerk || isManager || isWarehouse || isExecutive) && isOriginHub;
  const canManualTransition = isManager || isExecutive;
  const hasActionAvailable = canSendOutOfDelivery || canDispatchShipment || canRecordDelivery || canReattemptDelivery || canCheckinOrigin || canManualTransition;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/parcels')}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Tracking:
              </span>
              <h1 className="font-mono text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {parcel.tracking_number}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Registered on {parcel.created_at ? new Date(parcel.created_at).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>

        {/* Current status badge */}
        <div className="flex items-center gap-3">
          <StatusBadge status={parcel.current_status} size="lg" />
        </div>
      </div>

      {/* Contextual Action Bar */}
      <div className="bg-[#0f172a] rounded-xl p-5 text-white shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
              Operational Stage Control
            </span>
            <h2 className="text-lg font-black text-white mt-0.5 tracking-tight">
              Actions for {currentStatus.replace(/_/g, ' ')}
            </h2>
            <p className="text-xs text-indigo-200/80 font-normal">
              Role-authorized actions scoped to your regional jurisdiction.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* If ARRIVED_AT_HUB */}
            {canSendOutOfDelivery && (
              <button
                onClick={() => openStatusChange('OUT_FOR_DELIVERY')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-sm transition"
              >
                <Navigation className="w-4 h-4" /> Send Out for Delivery
              </button>
            )}

            {canDispatchShipment && (
              <Link
                to="/shipments/create"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition"
              >
                <Truck className="w-4 h-4" /> Dispatch on Shipment
              </Link>
            )}

            {/* If OUT_FOR_DELIVERY */}
            {canRecordDelivery && (
              <button
                onClick={() => setDeliveryModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition"
              >
                <CheckCircle className="w-4 h-4" /> Record Delivery Attempt
              </button>
            )}

            {/* If FAILED_DELIVERY */}
            {canReattemptDelivery && (
              <>
                <button
                  onClick={() => openStatusChange('OUT_FOR_DELIVERY')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm transition"
                >
                  <RotateCcw className="w-4 h-4" /> Re-attempt Delivery
                </button>
                <button
                  onClick={() => openStatusChange('RETURNED_TO_SENDER')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm transition"
                >
                  <XCircle className="w-4 h-4" /> Return to Sender
                </button>
              </>
            )}

            {/* If REGISTERED or PICKED_UP */}
            {canCheckinOrigin && (
              <button
                onClick={() => openStatusChange('RECEIVED_AT_ORIGIN_HUB')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition"
              >
                <Building className="w-4 h-4" /> Check-in at Origin Hub
              </button>
            )}

            {/* General Action - Restrict to HUB_MANAGER or Root Admin */}
            {canManualTransition && (
              <button
                onClick={() => {
                  setNewStatus(currentStatus);
                  setStatusRemarks('');
                  setStatusModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition"
              >
                Manual Status Transition
              </button>
            )}

            {/* Fallback when no actions apply for this user's role / station */}
            {!hasActionAvailable && (
              <span className="text-xs text-indigo-200/70 italic flex items-center gap-1.5 bg-white/5 px-3.5 py-2 rounded-xl border border-white/10">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                No stage transitions currently pending for your station & role.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Routing Information Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600" /> Route & Network Journey
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                  Origin Hub
                </span>
                <p className="text-base font-bold text-slate-900">
                  {parcel.origin_hub?.hub_name || parcel.origin_hub_name || `Hub #${parcel.origin_hub_id}`}
                </p>
                {(parcel.sender?.city || parcel.sender_city) && (
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {parcel.sender?.city || parcel.sender_city}, {parcel.sender?.state || parcel.sender_state || ''}
                  </p>
                )}
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                  Destination Hub
                </span>
                <p className="text-base font-bold text-slate-900">
                  {parcel.destination_hub?.hub_name || parcel.destination_hub_name || `Hub #${parcel.destination_hub_id}`}
                </p>
                {(parcel.receiver?.city || parcel.receiver_city) && (
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {parcel.receiver?.city || parcel.receiver_city}, {parcel.receiver?.state || parcel.receiver_state || ''}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
              <div>
                Stationed Facility:{' '}
                <span className="font-bold text-indigo-700">
                  {parcel.current_hub?.hub_name || parcel.current_hub_name || (parcel.current_hub_id ? `Hub #${parcel.current_hub_id}` : 'In Transit Linehaul')}
                </span>
              </div>
              <div>
                Est. Delivery:{' '}
                <span className="font-semibold text-slate-800">
                  {parcel.estimated_delivery_date
                    ? new Date(parcel.estimated_delivery_date).toLocaleDateString()
                    : 'To be scheduled'}
                </span>
              </div>
            </div>
          </div>

          {/* Sender & Receiver Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sender */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                <User className="w-4 h-4 text-indigo-600" /> Sender (Consignor)
              </div>
              <h4 className="text-base font-bold text-slate-900">
                {parcel.sender?.full_name || parcel.sender_name || `Customer #${parcel.sender_id}`}
              </h4>
              <p className="text-xs text-slate-500 mt-1 font-mono">{parcel.sender?.email || parcel.sender_email || 'No email on record'}</p>
              <p className="text-xs text-slate-500 font-mono">{parcel.sender?.phone || parcel.sender_phone || ''}</p>
              {(parcel.sender?.address_line1 || parcel.sender_address) && (
                <p className="text-xs text-slate-600 mt-2.5 pt-2.5 border-t border-slate-100 leading-relaxed font-medium">
                  {parcel.sender_address || parcel.sender?.address_line1}
                </p>
              )}
            </div>

            {/* Receiver */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                <User className="w-4 h-4 text-emerald-600" /> Receiver (Consignee)
              </div>
              <h4 className="text-base font-bold text-slate-900">
                {parcel.receiver?.full_name || parcel.receiver_name || `Customer #${parcel.receiver_id}`}
              </h4>
              <p className="text-xs text-slate-500 mt-1 font-mono">{parcel.receiver?.email || parcel.receiver_email || 'No email on record'}</p>
              <p className="text-xs text-slate-500 font-mono">{parcel.receiver?.phone || parcel.receiver_phone || ''}</p>
              {(parcel.receiver?.address_line1 || parcel.receiver_address) && (
                <p className="text-xs text-slate-600 mt-2.5 pt-2.5 border-t border-slate-100 leading-relaxed font-medium">
                  {parcel.receiver_address || parcel.receiver?.address_line1}
                </p>
              )}
            </div>
          </div>

          {/* Delivery Attempts Ledger */}
          {parcel.delivery_attempts && parcel.delivery_attempts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">Delivery Attempts</h3>
                <span className="text-xs font-bold px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                  {parcel.delivery_attempts.length} Attempt(s)
                </span>
              </div>

              <div className="space-y-3">
                {parcel.delivery_attempts.map((att) => (
                  <div
                    key={att.attempt_id}
                    className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900">
                          Attempt #{att.attempt_number}
                        </span>
                        <StatusBadge status={att.outcome} size="xs" />
                        {att.signature_collected && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                            ✓ Signature Collected
                          </span>
                        )}
                      </div>
                      {att.remarks && <p className="text-slate-600 mt-1 font-medium">{att.remarks}</p>}
                    </div>

                    <div className="text-left sm:text-right text-slate-500">
                      <div>{att.attempted_at ? new Date(att.attempted_at).toLocaleString() : 'N/A'}</div>
                      {att.recipient_name && (
                        <div className="font-bold text-slate-800 mt-0.5">
                          Received by: {att.recipient_name}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Physical Specs & Timeline */}
        <div className="space-y-6">
          {/* Specifications Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" /> Package Specifications
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Type</span>
                <span className="font-bold text-slate-900">
                  {parcel.parcel_type?.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Weight</span>
                <span className="font-bold text-slate-900">{parcel.weight_kg} kg</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Dimensions</span>
                <span className="font-bold text-slate-900">
                  {parcel.length_cm} × {parcel.width_cm} × {parcel.height_cm} cm
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Declared Value</span>
                <span className="font-bold text-slate-900">₹{parcel.declared_value}</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 font-medium">Max Delivery Attempts</span>
                <span className="font-bold text-slate-900">
                  {parcel.max_delivery_attempts || 3}
                </span>
              </div>

              {parcel.special_instructions && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs">
                  <span className="font-bold block mb-1">Special Handling:</span>
                  {parcel.special_instructions}
                </div>
              )}
            </div>
          </div>

          {/* Tracking History Timeline */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-5">Milestone Audit Log</h3>
            <TrackingTimeline events={parcel.tracking_events || []} />
          </div>
        </div>
      </div>

      {/* MODAL 1: Update Status */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Update Parcel Status"
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4 text-xs">
          {statusError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700">
              {statusError}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Status *
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              required
              className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 bg-white font-semibold"
            >
              <option value="REGISTERED">REGISTERED</option>
              <option value="PICKED_UP">PICKED_UP</option>
              <option value="RECEIVED_AT_ORIGIN_HUB">RECEIVED_AT_ORIGIN_HUB</option>
              <option value="IN_TRANSIT">IN_TRANSIT</option>
              <option value="ARRIVED_AT_HUB">ARRIVED_AT_HUB</option>
              <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="FAILED_DELIVERY">FAILED_DELIVERY</option>
              <option value="RETURNED_TO_SENDER">RETURNED_TO_SENDER</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Remarks / Scan Notes *
            </label>
            <textarea
              rows={3}
              value={statusRemarks}
              onChange={(e) => setStatusRemarks(e.target.value)}
              placeholder="e.g. Scanned into sorting bin 4 at Central Hub"
              required
              className="w-full p-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStatusModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={statusSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm disabled:opacity-50"
            >
              {statusSubmitting ? 'Updating...' : 'Commit Status'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Record Delivery Attempt */}
      <Modal
        isOpen={deliveryModalOpen}
        onClose={() => setDeliveryModalOpen(false)}
        title="Record Last-Mile Delivery Attempt"
      >
        <form onSubmit={handleDeliverySubmit} className="space-y-4 text-xs">
          {deliveryError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700">
              {deliveryError}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Attempt Outcome *
            </label>
            <select
              value={attemptData.outcome}
              onChange={(e) =>
                setAttemptData({
                  ...attemptData,
                  outcome: e.target.value,
                  signature_collected: e.target.value === 'DELIVERED',
                })
              }
              className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 bg-white font-semibold"
            >
              <option value="DELIVERED">Delivered (Handed to recipient)</option>
              <option value="FAILED_NO_ONE_HOME">Failed: No One Home</option>
              <option value="FAILED_WRONG_ADDRESS">Failed: Incorrect Address</option>
              <option value="FAILED_REFUSED">Failed: Customer Refused</option>
              <option value="FAILED_OTHER">Failed: Other Reason</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Recipient Name (if handed over)
            </label>
            <input
              type="text"
              value={attemptData.recipient_name}
              onChange={(e) =>
                setAttemptData({ ...attemptData, recipient_name: e.target.value })
              }
              placeholder="e.g. Priya Patel"
              className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="sigCheckbox"
              checked={attemptData.signature_collected}
              onChange={(e) =>
                setAttemptData({
                  ...attemptData,
                  signature_collected: e.target.checked,
                })
              }
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <label htmlFor="sigCheckbox" className="font-semibold text-slate-700">
              Customer Signature / Verified Acknowledgment
            </label>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Courier Notes / Observations
            </label>
            <textarea
              rows={2}
              value={attemptData.remarks}
              onChange={(e) =>
                setAttemptData({ ...attemptData, remarks: e.target.value })
              }
              placeholder="e.g. Handed to security reception or customer unreachable"
              className="w-full p-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeliveryModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={deliverySubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm disabled:opacity-50"
            >
              {deliverySubmitting ? 'Recording...' : 'Submit Attempt'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ParcelDetailPage;
