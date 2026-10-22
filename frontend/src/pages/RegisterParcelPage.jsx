import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { parcelService, adminService } from '../services/api';
import api from '../services/api';
import {
  Package,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building,
  User,
  Calendar,
  DollarSign,
  Scale,
  Maximize2,
  FileText,
  Copy,
  ExternalLink,
  Lock,
} from 'lucide-react';

const DEFAULT_CUSTOMERS = [
  { customer_id: 1, full_name: 'Aarav Sharma', city: 'Mumbai', email: 'aarav.sharma@email.com' },
  { customer_id: 2, full_name: 'Priya Patel', city: 'Bangalore', email: 'priya.patel@email.com' },
  { customer_id: 3, full_name: 'Rohan Gupta', city: 'Kolkata', email: 'rohan.gupta@email.com' },
  { customer_id: 4, full_name: 'Sneha Reddy', city: 'Hyderabad', email: 'sneha.reddy@email.com' },
  { customer_id: 5, full_name: 'Vikram Singh', city: 'New Delhi', email: 'vikram.singh@email.com' },
  { customer_id: 6, full_name: 'Ananya Iyer', city: 'Chennai', email: 'ananya.iyer@email.com' },
  { customer_id: 7, full_name: 'Karan Mehta', city: 'Ahmedabad', email: 'karan.mehta@email.com' },
  { customer_id: 8, full_name: 'Deepika Nair', city: 'Kochi', email: 'deepika.nair@email.com' },
  { customer_id: 9, full_name: 'Arjun Deshmukh', city: 'Pune', email: 'arjun.deshmukh@email.com' },
  { customer_id: 10, full_name: 'Meera Joshi', city: 'Jaipur', email: 'meera.joshi@email.com' },
];

const PARCEL_TYPES = [
  { value: 'DOCUMENT', label: 'Document (Envelope)' },
  { value: 'SMALL_PACKAGE', label: 'Small Package (<5 kg)' },
  { value: 'MEDIUM_PACKAGE', label: 'Medium Package (5-15 kg)' },
  { value: 'LARGE_PACKAGE', label: 'Large Package (>15 kg)' },
  { value: 'FRAGILE', label: 'Fragile (Delicate goods)' },
  { value: 'HAZARDOUS', label: 'Hazardous (Special handling)' },
];

export const RegisterParcelPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCourierAdmin = user?.role === 'COURIER_ADMIN';
  const isExecutive = isSuperAdmin || isCourierAdmin;

  const [hubs, setHubs] = useState([]);
  const [customers, setCustomers] = useState(DEFAULT_CUSTOMERS);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form inputs
  const [formData, setFormData] = useState({
    sender_id: '1',
    receiver_id: '2',
    origin_hub_id: user?.hub_id ? String(user.hub_id) : '1',
    destination_hub_id: '5',
    parcel_type: 'SMALL_PACKAGE',
    weight_kg: '2.5',
    length_cm: '25',
    width_cm: '18',
    height_cm: '12',
    declared_value: '1000',
    estimated_delivery_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    special_instructions: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [createdParcel, setCreatedParcel] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        // Fetch hubs
        const hubsRes = await adminService.getHubs().catch(() => ({ data: [] }));
        const hubList = Array.isArray(hubsRes.data)
          ? hubsRes.data
          : hubsRes.data?.hubs || [];

        if (hubList.length > 0) {
          setHubs(hubList);
          // Set initial destination hub different from origin
          const currentOrigin = user?.hub_id || hubList[0]?.hub_id;
          const otherHub = hubList.find((h) => h.hub_id !== currentOrigin);
          if (otherHub) {
            setFormData((prev) => ({
              ...prev,
              origin_hub_id: String(currentOrigin),
              destination_hub_id: String(otherHub.hub_id),
            }));
          }
        }

        // Try to fetch customers from API if route exists
        try {
          const custRes = await api.get('/api/customers?limit=100');
          if (Array.isArray(custRes.data) && custRes.data.length > 0) {
            setCustomers(custRes.data);
          }
        } catch {
          // Fallback to DEFAULT_CUSTOMERS
        }
      } catch (err) {
        console.error('Failed to load form prerequisites:', err);
      } finally {
        setLoadingInitial(false);
      }
    };

    loadPrerequisites();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (formData.sender_id === formData.receiver_id) {
      setError('Sender and Receiver must be different customers.');
      return;
    }

    if (formData.origin_hub_id === formData.destination_hub_id) {
      setError('Origin hub and Destination hub cannot be the same facility.');
      return;
    }

    if (parseFloat(formData.weight_kg) <= 0) {
      setError('Parcel weight must be greater than 0 kg.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        sender_id: parseInt(formData.sender_id, 10),
        receiver_id: parseInt(formData.receiver_id, 10),
        origin_hub_id: parseInt(formData.origin_hub_id, 10),
        destination_hub_id: parseInt(formData.destination_hub_id, 10),
        parcel_type: formData.parcel_type,
        weight_kg: parseFloat(formData.weight_kg),
        length_cm: parseFloat(formData.length_cm),
        width_cm: parseFloat(formData.width_cm),
        height_cm: parseFloat(formData.height_cm),
        declared_value: parseFloat(formData.declared_value) || 0,
        estimated_delivery_date: formData.estimated_delivery_date || null,
        special_instructions: formData.special_instructions || null,
      };

      const response = await parcelService.createParcel(payload);
      setCreatedParcel(response.data);
    } catch (err) {
      console.error('Failed to register parcel:', err);
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to register parcel. Please verify all inputs.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyTracking = () => {
    if (createdParcel?.tracking_number) {
      navigator.clipboard.writeText(createdParcel.tracking_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (createdParcel) {
    return (
      <div className="max-w-2xl mx-auto py-10 animate-fade-in">
        <div className="bg-white rounded-xl border border-slate-200/90 p-8 shadow-xs text-center space-y-6">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Parcel Registered Successfully!</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Consignment is now recorded in the immutable tracking ledger with status{' '}
              <span className="font-bold text-indigo-600">REGISTERED</span>.
            </p>
          </div>

          {/* Tracking Number Display Card */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
              Assigned Tracking Number
            </span>
            <div className="flex items-center justify-center gap-3 mt-2">
              <span className="font-mono text-2xl sm:text-3xl font-black text-indigo-950 tracking-tight">
                {createdParcel.tracking_number}
              </span>
              <button
                onClick={handleCopyTracking}
                className="p-2 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition shadow-xs"
                title="Copy to clipboard"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            {copied && (
              <p className="text-xs font-bold text-emerald-600 mt-2">Copied to clipboard!</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              to={`/parcels/${createdParcel.parcel_id || createdParcel.id}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs sm:text-sm hover:bg-indigo-700 hover:shadow-glow transition-all"
            >
              <span>View Parcel Details</span>
              <ExternalLink className="w-4 h-4" />
            </Link>

            <button
              onClick={() => {
                setCreatedParcel(null);
                setFormData((prev) => ({
                  ...prev,
                  weight_kg: '2.5',
                  special_instructions: '',
                }));
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 transition"
            >
              Register Another Parcel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Register New Parcel</h1>
            <p className="text-xs text-slate-500">
              Create an official shipment manifest entry at your collection or sorting hub facility.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs sm:text-sm flex items-start gap-3 animate-shake">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <div>
            <p className="font-bold">Registration Error</p>
            <p className="text-xs text-rose-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Main Registration Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-6"
      >
        {/* Parties Involved: Sender & Receiver */}
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" /> Parties Involved
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Select sender consignor and destination consignee customer profiles
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Sender (Consignor) *
              </label>
              <select
                name="sender_id"
                value={formData.sender_id}
                onChange={handleChange}
                required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl bg-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {customers.map((c) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.full_name} ({c.city} - {c.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Receiver (Consignee) *
              </label>
              <select
                name="receiver_id"
                value={formData.receiver_id}
                onChange={handleChange}
                required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl bg-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {customers.map((c) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.full_name} ({c.city} - {c.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Route: Origin & Destination Hubs */}
        <div className="pt-6 border-t border-slate-100">
          <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-600" /> Network Hub Routing
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Specify originating intake hub and final destination distribution hub
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Origin Hub *
                </label>
                {!isExecutive && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <Lock className="w-3 h-3 text-amber-600" /> Station Locked
                  </span>
                )}
              </div>
              {!isExecutive ? (
                <div className="py-2.5 px-3 border border-slate-200 rounded-xl bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 flex items-center justify-between">
                  <span>
                    {hubs.find((h) => String(h.hub_id) === String(formData.origin_hub_id))?.hub_name ||
                      user?.hub_name ||
                      `Hub #${user?.hub_id}`}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">Hub #{formData.origin_hub_id}</span>
                </div>
              ) : (
                <select
                  name="origin_hub_id"
                  value={formData.origin_hub_id}
                  onChange={handleChange}
                  required
                  className="w-full py-2.5 px-3 border border-slate-200 rounded-xl bg-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {hubs.length > 0 ? (
                    hubs.map((h) => (
                      <option key={h.hub_id} value={h.hub_id}>
                        {h.hub_name} ({h.city})
                      </option>
                    ))
                  ) : (
                    <option value="">Loading facilities...</option>
                  )}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Destination Hub *
              </label>
              <select
                name="destination_hub_id"
                value={formData.destination_hub_id}
                onChange={handleChange}
                required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl bg-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {hubs.length > 0 ? (
                  hubs
                    .filter((h) => String(h.hub_id) !== String(formData.origin_hub_id))
                    .map((h) => (
                      <option key={h.hub_id} value={h.hub_id}>
                        {h.hub_name} ({h.city})
                      </option>
                    ))
                ) : (
                  <option value="">Loading facilities...</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Physical Specs: Type, Weight, Dimensions */}
        <div className="pt-6 border-t border-slate-100">
          <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" /> Physical Specifications
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Volumetric dimensions and mass for linehaul stowage calculation
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Parcel Type *
              </label>
              <select
                name="parcel_type"
                value={formData.parcel_type}
                onChange={handleChange}
                required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl bg-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {PARCEL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Weight (kg) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                name="weight_kg"
                value={formData.weight_kg}
                onChange={handleChange}
                required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Declared Value (₹) *
              </label>
              <input
                type="number"
                step="10"
                min="0"
                name="declared_value"
                value={formData.declared_value}
                onChange={handleChange}
                required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Length (cm) *
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                name="length_cm"
                value={formData.length_cm}
                onChange={handleChange}
                required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Width (cm) *
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                name="width_cm"
                value={formData.width_cm}
                onChange={handleChange}
                required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Height (cm) *
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                name="height_cm"
                value={formData.height_cm}
                onChange={handleChange}
                required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Schedule & Notes */}
        <div className="pt-6 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Estimated Delivery Date
              </label>
              <input
                type="date"
                name="estimated_delivery_date"
                value={formData.estimated_delivery_date}
                onChange={handleChange}
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Special Handling Instructions
              </label>
              <textarea
                rows={2}
                name="special_instructions"
                value={formData.special_instructions}
                onChange={handleChange}
                placeholder="e.g. Fragile glassware, keep upright, call customer before delivery"
                className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate('/parcels')}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-glow transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                <span>Register Parcel</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegisterParcelPage;
