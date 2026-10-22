import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { shipmentService, parcelService, adminService } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Truck,
  ArrowLeft,
  Building,
  Package,
  Layers,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Lock,
} from 'lucide-react';

export const CreateShipmentPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCourierAdmin = user?.role === 'COURIER_ADMIN';
  const isExecutive = isSuperAdmin || isCourierAdmin;

  const [hubs, setHubs] = useState([]);
  const [availableParcels, setAvailableParcels] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form Fields
  const [fromHubId, setFromHubId] = useState(user?.hub_id ? String(user.hub_id) : '1');
  const [toHubId, setToHubId] = useState('2');
  const [vehicleNumber, setVehicleNumber] = useState('MH-01-AB-4050');
  const [selectedParcelIds, setSelectedParcelIds] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [createdShipment, setCreatedShipment] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoadingInitial(true);
      try {
        // Load hubs
        const hubsRes = await adminService.getHubs().catch(() => ({ data: [] }));
        const hubList = Array.isArray(hubsRes.data)
          ? hubsRes.data
          : hubsRes.data?.hubs || [];
        setHubs(hubList);

        if (hubList.length > 0) {
          const defaultOrigin = user?.hub_id ? String(user.hub_id) : String(hubList[0].hub_id);
          setFromHubId(defaultOrigin);
          const dest = hubList.find((h) => String(h.hub_id) !== defaultOrigin);
          if (dest) setToHubId(String(dest.hub_id));
        }
      } catch (err) {
        console.error('Failed to load dispatch hubs:', err);
      } finally {
        setLoadingInitial(false);
      }
    };

    loadData();
  }, [user]);

  // Dynamically fetch eligible parcels whenever fromHubId changes
  useEffect(() => {
    if (!fromHubId) return;

    const fetchParcelsForHub = async () => {
      try {
        const parcelsRes = await parcelService
          .getParcels({ hub_id: parseInt(fromHubId, 10), limit: 100 })
          .catch(() => ({ data: [] }));

        const parcelList = Array.isArray(parcelsRes.data)
          ? parcelsRes.data
          : parcelsRes.data?.parcels || [];

        // Filter strictly eligible parcels for linehaul dispatch (must be physically received at hub)
        const eligible = parcelList.filter((p) =>
          ['RECEIVED_AT_ORIGIN_HUB', 'ARRIVED_AT_HUB'].includes(p.current_status)
        );

        setAvailableParcels(eligible);
        const defaultSelected = eligible.slice(0, 5).map((p) => p.parcel_id || p.id);
        setSelectedParcelIds(defaultSelected);
      } catch (err) {
        console.error('Failed to load eligible parcels for origin hub', err);
      }
    };

    fetchParcelsForHub();
  }, [fromHubId]);

  const toggleSelectParcel = (id) => {
    setSelectedParcelIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedParcelIds.length === availableParcels.length) {
      setSelectedParcelIds([]);
    } else {
      setSelectedParcelIds(availableParcels.map((p) => p.parcel_id || p.id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (fromHubId === toHubId) {
      setError('Origin hub and destination hub cannot be the same facility.');
      return;
    }

    if (!vehicleNumber.trim()) {
      setError('Please provide a vehicle license / fleet registration number.');
      return;
    }

    if (selectedParcelIds.length === 0) {
      setError('Please select at least one parcel consignment to include in this shipment.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        from_hub_id: parseInt(fromHubId, 10),
        to_hub_id: parseInt(toHubId, 10),
        vehicle_number: vehicleNumber.trim(),
        parcel_ids: selectedParcelIds.map((id) => parseInt(id, 10)),
      };

      const response = await shipmentService.createShipment(payload);
      setCreatedShipment(response.data);
    } catch (err) {
      console.error('Failed to create shipment:', err);
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to manifest shipment. Please check network logs.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" message="Loading dispatch hubs and eligible parcels..." />
      </div>
    );
  }

  if (createdShipment) {
    const sId = createdShipment.shipment_id || createdShipment.id;
    return (
      <div className="max-w-2xl mx-auto py-10 animate-fade-in">
        <div className="bg-white rounded-xl border border-slate-200/90 p-8 shadow-xs text-center space-y-6">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Shipment Dispatched!</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Linehaul manifest has been generated and consolidated parcels have transitioned to{' '}
              <span className="font-bold text-amber-600">IN_TRANSIT</span>.
            </p>
          </div>

          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-5 text-left space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-indigo-100/60">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Manifest ID</span>
              <span className="font-mono font-bold text-indigo-900 text-base">#{sId}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-indigo-100/60">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Vehicle Assigned</span>
              <span className="font-mono font-bold text-slate-900">{vehicleNumber}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Parcels Consolidated</span>
              <span className="font-bold text-slate-900">
                {selectedParcelIds.length} Packages
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              to="/shipments"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs sm:text-sm hover:bg-indigo-700 hover:shadow-glow transition-all"
            >
              <span>View Shipments Manifest</span>
              <ExternalLink className="w-4 h-4" />
            </Link>

            <button
              onClick={() => {
                setCreatedShipment(null);
                setSelectedParcelIds([]);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 transition"
            >
              Dispatch Another
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create Linehaul Shipment</h1>
            <p className="text-xs text-slate-500">
              Consolidate parcels into an inter-hub freight manifest and assign a transit vehicle fleet.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs sm:text-sm flex items-start gap-3 animate-shake">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <div>
            <p className="font-bold">Manifest Creation Error</p>
            <p className="text-xs text-rose-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-6"
      >
        {/* Route Selection */}
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-600" /> Transit Route & Fleet Assignment
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Select departure point, arrival hub, and carrier vehicle number
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  From Hub (Origin) *
                </label>
                {!isExecutive && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <Lock className="w-3 h-3 text-amber-600" /> Station Origin
                  </span>
                )}
              </div>
              {!isExecutive ? (
                <div className="py-2.5 px-3 border border-slate-200 rounded-xl bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 flex items-center justify-between">
                  <span>
                    {hubs.find((h) => String(h.hub_id) === String(fromHubId))?.hub_name ||
                      user?.hub_name ||
                      `Hub #${fromHubId}`}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">Hub #{fromHubId}</span>
                </div>
              ) : (
                <select
                  value={fromHubId}
                  onChange={(e) => setFromHubId(e.target.value)}
                  className="w-full py-2.5 px-3 border border-slate-200 rounded-xl bg-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {hubs.map((h) => (
                    <option key={h.hub_id} value={h.hub_id}>
                      {h.hub_name} ({h.city})
                    </option>
                  ))}
                </select>
              )}
              <span className="text-[11px] text-slate-400 mt-1 block">
                Eligible parcels at selected origin will automatically populate below
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                To Hub (Destination) *
              </label>
              <select
                value={toHubId}
                onChange={(e) => setToHubId(e.target.value)}
                required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl bg-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                {hubs
                  .filter((h) => String(h.hub_id) !== String(fromHubId))
                  .map((h) => (
                    <option key={h.hub_id} value={h.hub_id}>
                      {h.hub_name} ({h.city})
                    </option>
                  ))}
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Select next destination sorting or distribution hub
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Vehicle / Fleet Number *
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. MH-01-AB-1234"
                required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-500 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Parcel Selection Checklist */}
        <div className="pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" /> Consignments for Dispatch
              </h2>
              <p className="text-xs text-slate-500">
                Parcels currently stationed at origin hub eligible to load onto vehicle
              </p>
            </div>

            {availableParcels.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                {selectedParcelIds.length === availableParcels.length
                  ? 'Deselect All'
                  : 'Select All Eligible'}
              </button>
            )}
          </div>

          <div className="mt-4">
            {availableParcels.length === 0 ? (
              <div className="text-center py-10 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
                <p className="text-sm font-medium text-slate-600">
                  No eligible parcels found at this hub.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Parcels must be in status RECEIVED_AT_ORIGIN_HUB or ARRIVED_AT_HUB to dispatch.
                </p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {availableParcels.map((p) => {
                  const pId = p.parcel_id || p.id;
                  const isChecked = selectedParcelIds.includes(pId);

                  return (
                    <div
                      key={pId}
                      onClick={() => toggleSelectParcel(pId)}
                      className={`p-3.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        isChecked ? 'bg-indigo-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-indigo-600">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                        <div>
                          <span className="font-mono font-bold text-slate-900 mr-2">
                            {p.tracking_number}
                          </span>
                          <span className="text-slate-500 font-medium">
                            {p.parcel_type?.replace(/_/g, ' ')} • {p.weight_kg}kg
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 hidden sm:inline font-medium">
                          Dest: {p.destination_hub_name || `Hub #${p.destination_hub_id}`}
                        </span>
                        <StatusBadge status={p.current_status} size="xs" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-3 text-xs text-slate-500 flex justify-between">
            <span>
              Selected:{' '}
              <span className="font-bold text-slate-800">
                {selectedParcelIds.length} of {availableParcels.length}
              </span>{' '}
              packages
            </span>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate('/shipments')}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || selectedParcelIds.length === 0}
            className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-glow transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Dispatching...
              </>
            ) : (
              <>
                <Truck className="w-4 h-4" />
                <span>Create & Dispatch Manifest ({selectedParcelIds.length})</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateShipmentPage;
