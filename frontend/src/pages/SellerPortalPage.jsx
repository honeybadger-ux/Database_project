import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  Truck,
  DollarSign,
  Clock,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Filter,
  Search,
  Building,
  RotateCcw,
  Key,
  LogOut,
  Eye,
  EyeOff,
  Copy,
  Lock,
} from 'lucide-react';
import { useSellerAuth } from '../context/SellerAuthContext';
import SellerLoginPage from './SellerLoginPage';
import { sellerService, rateService } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

const PRESET_ROUTES = [
  {
    name: 'Metro Express',
    route: 'Mumbai 400001 → Delhi 110001',
    origPin: '400001',
    destPin: '110001',
    origState: 'Maharashtra',
    destState: 'Delhi',
    weight: 1.5,
    tag: 'All 4 Couriers Available',
  },
  {
    name: 'Tier-2 Corridor',
    route: 'Delhi 110001 → Jaipur 302001',
    origPin: '110001',
    destPin: '302001',
    origState: 'Delhi',
    destState: 'Rajasthan',
    weight: 2.0,
    tag: 'DTDC, Blue Dart & Delhivery',
  },
  {
    name: 'Tier-3 Semi-Urban',
    route: 'Bangalore 560001 → Muzaffarpur 842001',
    origPin: '560001',
    destPin: '842001',
    origState: 'Karnataka',
    destState: 'Bihar',
    weight: 1.8,
    tag: 'Delhivery & DTDC (Blue Dart/FedEx ODA)',
  },
  {
    name: 'Remote North-East',
    route: 'Delhi 110001 → Imphal 795001',
    origPin: '110001',
    destPin: '795001',
    origState: 'Delhi',
    destState: 'Manipur',
    weight: 1.2,
    tag: 'Delhivery Exclusive Carrier',
  },
  {
    name: 'Himalayan Pass',
    route: 'Delhi 110001 → Leh Ladakh 194101',
    origPin: '110001',
    destPin: '194101',
    origState: 'Delhi',
    destState: 'Jammu & Kashmir',
    weight: 2.5,
    tag: 'Delhivery High-Altitude Exclusive',
  },
];

export const SellerPortalPage = () => {
  const { seller, isAuthenticated, loading: authLoading, logout } = useSellerAuth();

  const [sellerStats, setSellerStats] = useState(null);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleCopyApiKey = () => {
    if (seller?.api_key) {
      navigator.clipboard.writeText(seller.api_key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  // Rate calculator state
  const [calcForm, setCalcForm] = useState({
    origin_pincode: '400001',
    destination_pincode: '110001',
    origin_state: 'Maharashtra',
    dest_state: 'Delhi',
    weight_kg: 1.5,
    length_cm: 20,
    width_cm: 15,
    height_cm: 10,
    declared_value: 1200,
  });

  const [isComparing, setIsComparing] = useState(false);
  const [quotesData, setQuotesData] = useState(null);
  const [calcError, setCalcError] = useState('');

  // Booking modal state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookForm, setBookForm] = useState({
    sender_name: 'Fulfillment Warehouse Alpha',
    sender_phone: '+91 9820011223',
    sender_email: 'warehouse-mum@seller.in',
    sender_address: 'Gala 4, Logistics Park, Bhiwandi',
    sender_city: 'Mumbai',
    sender_state: 'Maharashtra',
    sender_pincode: '400001',
    receiver_name: 'Aditi Sharma',
    receiver_phone: '+91 9811099887',
    receiver_email: 'aditi.sharma@example.com',
    receiver_address: 'Flat 402, Green Avenue, Connaught Place',
    receiver_city: 'New Delhi',
    receiver_state: 'Delhi',
    receiver_pincode: '110001',
    parcel_type: 'SMALL_PACKAGE',
    special_instructions: 'Handle with care. Fragile e-commerce shipment.',
  });

  // Load dashboard metrics and orders on authentication
  useEffect(() => {
    if (isAuthenticated && seller) {
      loadSellerDashboard();
    }
  }, [isAuthenticated, seller?.seller_id]);

  const loadSellerDashboard = async () => {
    setLoadingOrders(true);
    try {
      const [statsRes, ordersRes] = await Promise.all([
        sellerService.getMyStats(),
        sellerService.getMyOrders({ limit: 50 }),
      ]);
      setSellerStats(statsRes.data);
      setSellerOrders(ordersRes.data);
    } catch (err) {
      console.error('Failed to load merchant data', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleCalculateRates = async (e, customData = null) => {
    if (e) e.preventDefault();
    setIsComparing(true);
    setCalcError('');
    const source = customData || calcForm;
    try {
      const res = await rateService.compareRates({
        origin_pincode: source.origin_pincode,
        destination_pincode: source.destination_pincode,
        origin_state: source.origin_state,
        dest_state: source.dest_state,
        weight_kg: parseFloat(source.weight_kg),
        length_cm: parseFloat(source.length_cm),
        width_cm: parseFloat(source.width_cm),
        height_cm: parseFloat(source.height_cm),
        declared_value: parseFloat(source.declared_value),
      });
      setQuotesData(res.data);
    } catch (err) {
      setCalcError(err.response?.data?.detail || 'Failed to compare courier rates. Please try again.');
    } finally {
      setIsComparing(false);
    }
  };

  const handleApplyPreset = (preset) => {
    const updated = {
      ...calcForm,
      origin_pincode: preset.origPin,
      destination_pincode: preset.destPin,
      origin_state: preset.origState,
      dest_state: preset.destState,
      weight_kg: preset.weight,
    };
    setCalcForm(updated);
    handleCalculateRates(null, updated);
  };

  const handleOpenBookModal = (quote) => {
    setSelectedQuote(quote);
    setBookingSuccess(null);
    setBookForm((prev) => ({
      ...prev,
      sender_pincode: calcForm.origin_pincode,
      sender_state: calcForm.origin_state,
      receiver_pincode: calcForm.destination_pincode,
      receiver_state: calcForm.dest_state,
    }));
    setIsBookModalOpen(true);
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!selectedQuote) return;
    setBookingLoading(true);
    try {
      const payload = {
        courier_id: selectedQuote.courier_id,
        sender_name: bookForm.sender_name,
        sender_phone: bookForm.sender_phone,
        sender_email: bookForm.sender_email,
        sender_address: bookForm.sender_address,
        sender_city: bookForm.sender_city,
        sender_state: bookForm.sender_state,
        sender_pincode: bookForm.sender_pincode,
        receiver_name: bookForm.receiver_name,
        receiver_phone: bookForm.receiver_phone,
        receiver_email: bookForm.receiver_email,
        receiver_address: bookForm.receiver_address,
        receiver_city: bookForm.receiver_city,
        receiver_state: bookForm.receiver_state,
        receiver_pincode: bookForm.receiver_pincode,
        parcel_type: bookForm.parcel_type,
        weight_kg: parseFloat(calcForm.weight_kg),
        length_cm: parseFloat(calcForm.length_cm),
        width_cm: parseFloat(calcForm.width_cm),
        height_cm: parseFloat(calcForm.height_cm),
        declared_value: parseFloat(calcForm.declared_value),
        special_instructions: bookForm.special_instructions,
      };

      const res = await sellerService.bookOrder(payload);
      setBookingSuccess(res.data);
      // Reload dashboard metrics & order list
      loadSellerDashboard();
    } catch (err) {
      alert(err.response?.data?.detail || 'Booking failed. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  // If loading auth state, show spinner
  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        <span className="mt-3 text-sm text-slate-500 font-medium">Verifying Merchant Session...</span>
      </div>
    );
  }

  // If unauthenticated, render isolated Merchant Login Page
  if (!isAuthenticated || !seller) {
    return <SellerLoginPage />;
  }

  const filteredOrders = sellerOrders.filter((ord) => {
    if (!orderSearch.trim()) return true;
    const term = orderSearch.toLowerCase();
    return (
      ord.tracking_number?.toLowerCase().includes(term) ||
      ord.receiver_name?.toLowerCase().includes(term) ||
      ord.receiver_city?.toLowerCase().includes(term) ||
      ord.courier_name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Merchant Header Hero */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-xl shadow-xl p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                Merchant Tenant Scoped
              </span>
              <span className="flex items-center gap-1 text-xs text-emerald-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Live Rate Matrix Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {seller.company_name}
            </h1>
            <p className="mt-1 text-emerald-200 text-sm max-w-2xl">
              Compare real-time rates, transit SLAs, and carrier ratings across DTDC, Blue Dart, Delhivery, and FedEx to automate 1-click dispatch.
            </p>
          </div>

          {/* Secure Merchant Account Badge */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 min-w-[280px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-200 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                Authenticated Merchant
              </span>
              <button
                onClick={logout}
                className="text-xs text-rose-300 hover:text-white flex items-center gap-1 font-semibold transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
            <div className="text-sm font-bold text-white truncate">{seller.company_name}</div>
            
            {/* Encrypted API Key Row */}
            <div className="flex items-center gap-2 mt-2">
              <span className="font-mono text-[11px] bg-black/40 text-emerald-300 px-2 py-1 rounded border border-white/10 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-emerald-400" />
                {showApiKey ? seller.api_key : 'sk_live_••••••••••••••••'}
              </span>
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="p-1 rounded bg-black/30 hover:bg-black/50 text-emerald-300 transition"
                title={showApiKey ? 'Mask Key' : 'Reveal Key'}
              >
                {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={handleCopyApiKey}
                className="p-1 rounded bg-black/30 hover:bg-black/50 text-emerald-300 transition"
                title={copiedKey ? 'Copied!' : 'Copy API Key'}
              >
                {copiedKey ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-emerald-300/80 font-medium">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>256-Bit SSL Scoped Merchant Token</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {sellerStats?.total_orders ?? '...'}
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Bookings
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {sellerStats?.active_orders ?? '...'}
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              In-Transit Parcels
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {sellerStats?.delivered_orders ?? '...'}
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Successfully Delivered
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              ₹{sellerStats?.total_shipping_spend ? Number(sellerStats.total_shipping_spend).toLocaleString('en-IN') : '0'}
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cumulative Spend
            </div>
          </div>
        </div>
      </div>

      {/* Rate Comparison Engine Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">
                Multi-Carrier Rate & SLA Comparison Engine
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Enter parcel origin, destination, and dimensions to evaluate cheapest price, fastest SLA, and serviceability.
            </p>
          </div>
        </div>

        {/* Quick Test Presets */}
        <div className="mb-6 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Differentiated Carrier Route Presets:</span>
            </span>
            <span className="text-[11px] text-slate-400">Click any lane to test real-world carrier serviceability & rates</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_ROUTES.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 text-slate-700 shadow-2xs transition flex items-center gap-1.5 group cursor-pointer"
                title={`${p.route} — ${p.tag}`}
              >
                <span className="font-bold">{p.name}</span>
                <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 font-mono">({p.origPin}→{p.destPin})</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleCalculateRates} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Origin Pincode
            </label>
            <input
              type="text"
              value={calcForm.origin_pincode}
              onChange={(e) => setCalcForm({ ...calcForm, origin_pincode: e.target.value })}
              placeholder="e.g. 400001"
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Destination Pincode
            </label>
            <input
              type="text"
              value={calcForm.destination_pincode}
              onChange={(e) => setCalcForm({ ...calcForm, destination_pincode: e.target.value })}
              placeholder="e.g. 110001"
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={calcForm.weight_kg}
              onChange={(e) => setCalcForm({ ...calcForm, weight_kg: e.target.value })}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Declared Value (₹)
            </label>
            <input
              type="number"
              step="50"
              min="100"
              value={calcForm.declared_value}
              onChange={(e) => setCalcForm({ ...calcForm, declared_value: e.target.value })}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-3 grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Length (cm)</label>
              <input
                type="number"
                value={calcForm.length_cm}
                onChange={(e) => setCalcForm({ ...calcForm, length_cm: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Width (cm)</label>
              <input
                type="number"
                value={calcForm.width_cm}
                onChange={(e) => setCalcForm({ ...calcForm, width_cm: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Height (cm)</label>
              <input
                type="number"
                value={calcForm.height_cm}
                onChange={(e) => setCalcForm({ ...calcForm, height_cm: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isComparing}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isComparing ? (
                <span>Comparing Rates...</span>
              ) : (
                <>
                  <span>Compare Carriers</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {calcError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 mb-6">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{calcError}</span>
          </div>
        )}

        {/* Carrier Quotes Cards */}
        {quotesData && quotesData.quotes && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Found {quotesData.quotes.filter(q => q.is_serviceable).length} Serviceable ({quotesData.quotes.filter(q => !q.is_serviceable).length} Unserviceable) Carriers &bull; Billable Weight:{' '}
                {quotesData.billable_weight_kg} kg
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quotesData.quotes.map((q) => {
                const isRecommended = quotesData.recommended_courier_id === q.courier_id;
                const isServiceable = q.is_serviceable;
                return (
                  <div
                    key={q.courier_id}
                    className={`rounded-xl p-5 border transition-all flex flex-col justify-between ${
                      !isServiceable
                        ? 'border-dashed border-rose-300 bg-rose-50/25 opacity-90'
                        : isRecommended
                        ? 'border-emerald-500 bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Carrier Header & Badge */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <span className={`text-xs font-extrabold block leading-tight ${isServiceable ? 'text-slate-900' : 'text-slate-700'}`}>
                            {q.courier_name}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            {q.courier_code} &bull; Rating {q.rating} ★
                          </span>
                        </div>
                        {!isServiceable ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            ODA / OUT OF AREA
                          </span>
                        ) : q.badge ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              q.badge === 'CHEAPEST'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : q.badge === 'FASTEST'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : q.badge === 'TOP_RATED'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-purple-100 text-purple-800 border border-purple-200'
                            }`}
                          >
                            {q.badge}
                          </span>
                        ) : null}
                      </div>

                      {/* Pricing or Unserviceable Notice */}
                      <div className="my-3 pb-3 border-b border-slate-100">
                        {isServiceable ? (
                          <>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-slate-900">₹{q.total_cost}</span>
                              <span className="text-[11px] text-slate-400">all inclusive</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">
                              Base: ₹{q.base_cost} + Wt: ₹{q.weight_surcharge}
                            </div>
                          </>
                        ) : (
                          <div className="py-1">
                            <span className="text-xs font-bold text-rose-700 block">Out of Delivery Area</span>
                            <p className="text-[11px] text-rose-600/90 mt-0.5 leading-snug">
                              {q.unserviceable_reason || 'Carrier network does not service this destination pincode'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Transit Details */}
                      <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {isServiceable ? (
                              <><strong>{q.estimated_transit_days} Day(s)</strong> transit</>
                            ) : (
                              <span className="text-slate-400">No active linehaul</span>
                            )}
                          </span>
                        </div>
                        {isServiceable && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span>Est. Delivery: {q.estimated_delivery_date}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isServiceable ? (
                      <button
                        type="button"
                        onClick={() => handleOpenBookModal(q)}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isRecommended
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        <span>1-Click Dispatch</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                      >
                        <span>Route Unavailable</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Live Merchant Order Pipeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">
                {seller.company_name} &mdash; Consignment Pipeline
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active consignments booked under your merchant account across all carrier partners.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search tracking, receiver, carrier..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
              />
            </div>
            <button
              onClick={loadSellerDashboard}
              className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600"
              title="Refresh consignments"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loadingOrders ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No consignments found for this account. Use the Rate Calculator above to book your first shipment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Tracking Number</th>
                  <th className="py-3 px-3">Carrier Partner</th>
                  <th className="py-3 px-3">Receiver</th>
                  <th className="py-3 px-3">Destination</th>
                  <th className="py-3 px-3">Weight</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Booked At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredOrders.map((ord) => (
                  <tr key={ord.parcel_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {ord.tracking_number}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {ord.courier_name || 'Carrier Partner'}
                      </span>
                    </td>
                    <td className="py-3 px-3">{ord.receiver_name || ord.receiver?.full_name}</td>
                    <td className="py-3 px-3 text-slate-500">
                      {ord.receiver_city || ord.receiver?.city}, {ord.receiver_state || ord.receiver?.state}
                    </td>
                    <td className="py-3 px-3">{ord.weight_kg} kg</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={ord.current_status} />
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {new Date(ord.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1-Click Booking Confirmation Modal */}
      {isBookModalOpen && selectedQuote && (
        <Modal
          isOpen={isBookModalOpen}
          onClose={() => setIsBookModalOpen(false)}
          title={`Confirm Booking &bull; ${selectedQuote.courier_name}`}
        >
          {bookingSuccess ? (
            <div className="py-4 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Order Booked & Manifested Successfully!
              </h3>
              <p className="text-xs text-slate-500">
                Tracking Number: <strong>{bookingSuccess.tracking_number}</strong>
                <br />
                Assigned Carrier: <strong>{selectedQuote.courier_name}</strong>
              </p>
              <button
                type="button"
                onClick={() => setIsBookModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleConfirmBooking} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">{selectedQuote.courier_name}</span>
                  <span className="text-slate-500 text-[11px]">
                    Est. Transit: {selectedQuote.estimated_transit_days} days &bull; SLA: {selectedQuote.estimated_delivery_date}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-slate-900">₹{selectedQuote.total_cost}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sender Name</label>
                  <input
                    type="text"
                    value={bookForm.sender_name}
                    onChange={(e) => setBookForm({ ...bookForm, sender_name: e.target.value })}
                    required
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sender Phone</label>
                  <input
                    type="text"
                    value={bookForm.sender_phone}
                    onChange={(e) => setBookForm({ ...bookForm, sender_phone: e.target.value })}
                    required
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Receiver Name</label>
                  <input
                    type="text"
                    value={bookForm.receiver_name}
                    onChange={(e) => setBookForm({ ...bookForm, receiver_name: e.target.value })}
                    required
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Receiver Phone</label>
                  <input
                    type="text"
                    value={bookForm.receiver_phone}
                    onChange={(e) => setBookForm({ ...bookForm, receiver_phone: e.target.value })}
                    required
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delivery Address</label>
                <input
                  type="text"
                  value={bookForm.receiver_address}
                  onChange={(e) => setBookForm({ ...bookForm, receiver_address: e.target.value })}
                  required
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={bookForm.receiver_city}
                    onChange={(e) => setBookForm({ ...bookForm, receiver_city: e.target.value })}
                    required
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={bookForm.receiver_state}
                    onChange={(e) => setBookForm({ ...bookForm, receiver_state: e.target.value })}
                    required
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={bookForm.receiver_pincode}
                    onChange={(e) => setBookForm({ ...bookForm, receiver_pincode: e.target.value })}
                    required
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm disabled:opacity-50"
                >
                  {bookingLoading ? 'Dispatching...' : 'Confirm & Generate Consignment'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
};

export default SellerPortalPage;
