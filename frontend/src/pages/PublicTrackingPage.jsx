import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { trackingService } from '../services/api';
import TrackingTimeline from '../components/TrackingTimeline';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import {
  Search,
  Package,
  MapPin,
  Calendar,
  Scale,
  Maximize2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Truck,
  Building,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  User,
  ShieldAlert,
  Send,
} from 'lucide-react';

export const PublicTrackingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTrk = searchParams.get('trk') || searchParams.get('tracking') || '';

  const [trackingNumber, setTrackingNumber] = useState(initialTrk);
  const [loading, setLoading] = useState(false);
  const [parcelData, setParcelData] = useState(null);
  const [error, setError] = useState(null);

  // Dispute modal state
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeSuccess, setDisputeSuccess] = useState(false);
  const [disputeForm, setDisputeForm] = useState({
    raised_by_name: '',
    raised_by_email: '',
    reason: '',
  });

  const fetchTracking = async (numberToSearch) => {
    const trimmed = (numberToSearch || trackingNumber).trim();
    if (!trimmed) {
      setError('Please enter a valid tracking number.');
      return;
    }

    setLoading(true);
    setError(null);
    setParcelData(null);
    setDisputeSuccess(false);

    try {
      const response = await trackingService.trackParcel(trimmed);
      setParcelData(response.data);
      setSearchParams({ trk: trimmed });
      setDisputeForm({
        raised_by_name: response.data.receiver_name || response.data.receiver?.full_name || '',
        raised_by_email: response.data.receiver_email || response.data.receiver?.email || '',
        reason: '',
      });
    } catch (err) {
      console.error('Tracking query error:', err);
      if (err.response && err.response.status === 404) {
        setError(`No shipment found matching tracking number "${trimmed}". Please verify your tracking ID.`);
      } else {
        setError(
          err.response?.data?.detail ||
            err.response?.data?.message ||
            'Failed to fetch parcel tracking information. Please check connection and try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTrk) {
      fetchTracking(initialTrk);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchTracking(trackingNumber);
  };

  const handleDemoClick = (trk) => {
    setTrackingNumber(trk);
    fetchTracking(trk);
  };

  const handleRaiseDispute = async (e) => {
    e.preventDefault();
    if (!parcelData) return;
    setDisputeLoading(true);
    try {
      await trackingService.raiseDispute(parcelData.tracking_number, {
        parcel_id: parcelData.parcel_id,
        raised_by_type: 'CUSTOMER',
        raised_by_name: disputeForm.raised_by_name,
        raised_by_email: disputeForm.raised_by_email,
        reason: disputeForm.reason,
      });
      setDisputeSuccess(true);
      setParcelData({ ...parcelData, dispute_status: 'OPEN' });
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit dispute. Please try again.');
    } finally {
      setDisputeLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-900/40">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 py-12 sm:py-16 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/25 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> National Logistics Gateway • Multi-Carrier Tracking Network
            </span>
            <span className="text-xs text-indigo-300/70">
              Aggregated across DTDC, Blue Dart, Delhivery & FedEx
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
            Unified Parcel Tracking
          </h1>
          <p className="text-sm sm:text-base text-indigo-100/80 max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
            Real-time live journey visibility, carrier SLA status, and Super Root Admin customer dispute resolution.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto relative">
            <div className="relative flex items-center shadow-2xl rounded-xl overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 p-2 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/30 transition-all">
              <Search className="w-5 h-5 text-indigo-300 ml-3 mr-2 flex-shrink-0" />
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter Consignment Tracking Number (e.g., TRK0000001, TRK0000116)..."
                className="w-full bg-transparent border-0 text-white placeholder-indigo-200/50 text-sm sm:text-base font-mono focus:outline-none focus:ring-0 py-2"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white px-5 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition shadow-lg flex items-center gap-2 flex-shrink-0"
              >
                {loading ? <LoadingSpinner size="sm" inline message="Searching..." /> : <>Track Order <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </form>

          {/* Sample Tracking Numbers */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-indigo-300/80">
            <span>Try sample AWB:</span>
            {['TRK0000001', 'TRK0000015', 'TRK0000050', 'TRK0000116'].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => handleDemoClick(sample)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 font-mono text-[11px] text-white transition cursor-pointer"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Error Message */}
      {error && !loading && (
        <div className="bg-white rounded-xl border border-rose-200 p-6 shadow-xs animate-shake">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Package Not Found</h3>
              <p className="text-slate-600 text-xs sm:text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Results View */}
      {parcelData && !loading && (
        <div className="space-y-6 animate-slide-up">
          {/* Main Parcel Summary Banner */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs">
            {/* Top row with Carrier Partner Branding */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-6">
              <div>
                {/* Carrier & Merchant Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Truck className="w-3.5 h-3.5 text-indigo-600" />
                    Fulfilled by: {parcelData.courier_name || 'Carrier Partner'}
                  </span>
                  {parcelData.seller_company_name && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      Merchant: {parcelData.seller_company_name}
                    </span>
                  )}
                  {parcelData.dispute_status && parcelData.dispute_status !== 'NONE' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      Dispute: {parcelData.dispute_status}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    AWB Tracking ID
                  </span>
                  <span className="font-mono text-2xl sm:text-3xl font-black text-indigo-950 tracking-tight">
                    {parcelData.tracking_number}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Booked on{' '}
                  <span className="font-semibold text-slate-700">
                    {new Date(parcelData.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </span>
                </p>
              </div>

              {/* Status and Dispute Trigger */}
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Consignment State
                  </span>
                  <StatusBadge status={parcelData.current_status} size="lg" />
                </div>
                <div className="pl-4 border-l border-slate-200">
                  <button
                    onClick={() => setIsDisputeModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 transition shadow-xs"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Report Issue / Dispute
                  </button>
                </div>
              </div>
            </div>

            {/* Route Details: Origin to Destination */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 mb-2">
                  <Building className="w-4 h-4 text-indigo-600" />
                  Origin Hub
                </div>
                <h4 className="font-bold text-slate-900 text-base">
                  {parcelData.origin_hub?.hub_name || parcelData.origin_hub_name || `Hub #${parcelData.origin_hub_id}`}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Sender: <strong className="font-semibold text-slate-700">{parcelData.sender?.full_name || parcelData.sender_name}</strong>
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {parcelData.sender?.city || parcelData.sender_city}, {parcelData.sender?.state || parcelData.sender_state}
                </p>
              </div>

              <div className="flex flex-col items-center justify-center p-4">
                <div className="w-full flex items-center justify-center gap-3 text-slate-400">
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-indigo-200 to-indigo-500" />
                  <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-xs">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-indigo-500 to-indigo-200" />
                </div>
                <span className="text-xs font-bold text-indigo-600 mt-3">
                  {parcelData.current_status === 'DELIVERED' ? 'Fulfillment Complete' : 'In Pipeline'}
                </span>
                {(parcelData.current_hub?.hub_name || parcelData.current_hub_name) && (
                  <span className="text-xs text-slate-500 mt-0.5 font-medium">
                    Current Location: <strong className="text-slate-700">{parcelData.current_hub?.hub_name || parcelData.current_hub_name}</strong>
                  </span>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 mb-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Destination Hub
                </div>
                <h4 className="font-bold text-slate-900 text-base">
                  {parcelData.destination_hub?.hub_name || parcelData.destination_hub_name || `Hub #${parcelData.destination_hub_id}`}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Recipient: <strong className="font-semibold text-slate-700">{parcelData.receiver?.full_name || parcelData.receiver_name}</strong>
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {parcelData.receiver?.city || parcelData.receiver_city}, {parcelData.receiver?.state || parcelData.receiver_state}
                </p>
              </div>
            </div>

            {/* Spec Attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="p-2.5 rounded-xl bg-white shadow-xs text-indigo-600">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-slate-400 font-semibold text-[11px] uppercase">Package Type</span>
                  <span className="font-bold text-slate-800 text-xs">{parcelData.parcel_type?.replace(/_/g, ' ')}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="p-2.5 rounded-xl bg-white shadow-xs text-indigo-600">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-slate-400 font-semibold text-[11px] uppercase">Weight</span>
                  <span className="font-bold text-slate-800 text-xs">{parcelData.weight_kg} kg</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="p-2.5 rounded-xl bg-white shadow-xs text-indigo-600">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-slate-400 font-semibold text-[11px] uppercase">Dimensions</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {parcelData.length_cm}×{parcelData.width_cm}×{parcelData.height_cm} cm
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="p-2.5 rounded-xl bg-white shadow-xs text-indigo-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-slate-400 font-semibold text-[11px] uppercase">Est. Delivery</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {parcelData.estimated_delivery_date
                      ? new Date(parcelData.estimated_delivery_date).toLocaleDateString()
                      : 'In transit'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline and Checkpoint History */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Carrier Milestones & Journey History</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live scans authenticated by {parcelData.courier_name} sorting and dispatch hubs.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-full">
                {(parcelData.tracking_events || []).length} Event(s)
              </span>
            </div>

            <TrackingTimeline events={parcelData.tracking_events || []} />
          </div>
        </div>
      )}

      {/* MODAL: Customer Dispute Filing */}
      <Modal
        isOpen={isDisputeModalOpen}
        onClose={() => setIsDisputeModalOpen(false)}
        title={parcelData ? `Report Issue on ${parcelData.tracking_number}` : 'Report Issue'}
      >
        {disputeSuccess ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-gray-900">Dispute Escalated to Super Root Admin</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Your escalation has been logged in the Aggregator Governance Console. Platform arbitration will review carrier fulfillment logs and respond within 24 hours.
            </p>
            <button
              onClick={() => setIsDisputeModalOpen(false)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleRaiseDispute} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px]">
              Filing a dispute initiates neutral platform mediation between you and <span className="font-bold">{parcelData?.courier_name}</span>.
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Your Full Name</label>
              <input
                type="text"
                required
                value={disputeForm.raised_by_name}
                onChange={(e) => setDisputeForm({ ...disputeForm, raised_by_name: e.target.value })}
                className="w-full border rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Contact Email</label>
              <input
                type="email"
                required
                value={disputeForm.raised_by_email}
                onChange={(e) => setDisputeForm({ ...disputeForm, raised_by_email: e.target.value })}
                className="w-full border rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Issue Description / Reason</label>
              <textarea
                rows="3"
                required
                value={disputeForm.reason}
                onChange={(e) => setDisputeForm({ ...disputeForm, reason: e.target.value })}
                placeholder="Explain the delivery delay, packaging damage, or service failure..."
                className="w-full border rounded-lg p-2"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsDisputeModalOpen(false)}
                className="px-3 py-1.5 text-gray-600 bg-gray-100 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={disputeLoading}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded flex items-center gap-1.5"
              >
                {disputeLoading ? <LoadingSpinner size="sm" /> : <><Send className="w-3.5 h-3.5" /> Submit Escalation</>}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default PublicTrackingPage;
