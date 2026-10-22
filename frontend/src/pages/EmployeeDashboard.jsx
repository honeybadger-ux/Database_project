import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { parcelService, shipmentService } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Package,
  Truck,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  PlusCircle,
  Building,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  BarChart3,
  ArrowRight,
  Navigation,
  Layers,
} from 'lucide-react';

export const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [stats, setStats] = useState({
    parcelsAtHub: 0,
    pendingDispatch: 0,
    incomingShipments: 0,
    outgoingShipments: 0,
    deliveredCount: 0,
  });

  const [recentParcels, setRecentParcels] = useState([]);
  const [recentShipments, setRecentShipments] = useState([]);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCourierAdmin = user?.role === 'COURIER_ADMIN';
  const isManager = ['SUPER_ADMIN', 'COURIER_ADMIN', 'HUB_MANAGER'].includes(user?.role);
  const canRegister = ['SUPER_ADMIN', 'COURIER_ADMIN', 'HUB_MANAGER', 'CLERK'].includes(user?.role);
  const isCourier = user?.role === 'COURIER';
  const isDriver = user?.role === 'DRIVER';
  const isWarehouse = user?.role === 'WAREHOUSE_STAFF';

  const carrierTitle = user?.courier_name || 'Carrier Partner';

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const hubId = user?.hub_id;

      // Fetch parcels for employee hub
      const parcelsPromise = parcelService
        .getParcels(hubId ? { hub_id: hubId, limit: 25 } : { limit: 25 })
        .catch(() => ({ data: [] }));

      // Fetch inbound & outbound shipments
      const inboundPromise = shipmentService
        .getShipments(hubId ? { hub_id: hubId, direction: 'inbound' } : {})
        .catch(() => ({ data: [] }));

      const outboundPromise = shipmentService
        .getShipments(hubId ? { hub_id: hubId, direction: 'outbound' } : {})
        .catch(() => ({ data: [] }));

      const [parcelsRes, inboundRes, outboundRes] = await Promise.all([
        parcelsPromise,
        inboundPromise,
        outboundPromise,
      ]);

      const parcelList = Array.isArray(parcelsRes.data)
        ? parcelsRes.data
        : parcelsRes.data?.parcels || [];

      const inboundList = Array.isArray(inboundRes.data)
        ? inboundRes.data
        : inboundRes.data?.shipments || [];

      const outboundList = Array.isArray(outboundRes.data)
        ? outboundRes.data
        : outboundRes.data?.shipments || [];

      const atHub = parcelList.filter((p) =>
        ['RECEIVED_AT_ORIGIN_HUB', 'ARRIVED_AT_HUB'].includes(p.current_status)
      ).length;

      const pending = parcelList.filter((p) =>
        ['REGISTERED', 'RECEIVED_AT_ORIGIN_HUB', 'ARRIVED_AT_HUB'].includes(p.current_status)
      ).length;

      const incoming = inboundList.filter((s) =>
        ['DISPATCHED', 'IN_TRANSIT', 'LOADING'].includes(s.status)
      ).length;

      const delivered = parcelList.filter((p) => p.current_status === 'DELIVERED').length;

      setStats({
        parcelsAtHub: atHub || parcelList.length,
        pendingDispatch: pending,
        incomingShipments: incoming,
        outgoingShipments: outboundList.length,
        deliveredCount: delivered,
      });

      setRecentParcels(parcelList.slice(0, 7));
      setRecentShipments(inboundList.slice(0, 4));
    } catch (err) {
      console.error('Error fetching dashboard operations data:', err);
      setError('Unable to load dashboard metrics. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  if (loading && recentParcels.length === 0) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" message="Loading hub operations overview..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Station Operations: {user?.full_name}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {carrierTitle}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Facility: <strong className="text-slate-700">{user?.hub_name || `Hub #${user?.hub_id}`}</strong> &bull; Consignment handling, linehaul dispatch, and receipt.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role-Specific Operational Actions */}
          {isCourier && (
            <>
              <Link
                to="/parcels?status=OUT_FOR_DELIVERY"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs shadow-xs transition"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Active Deliveries</span>
              </Link>
              <Link
                to="/parcels?status=ARRIVED_AT_HUB"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                <Package className="w-3.5 h-3.5 text-indigo-400" />
                <span>Station Parcels</span>
              </Link>
            </>
          )}

          {isDriver && (
            <>
              <Link
                to="/shipments?direction=all&status=IN_TRANSIT"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>My Active Runs</span>
              </Link>
              <Link
                to="/shipments?direction=outbound"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                <span>Outbound Dispatches</span>
              </Link>
            </>
          )}

          {isWarehouse && (
            <>
              <Link
                to="/parcels?status=ARRIVED_AT_HUB"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-xs transition"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Staged for Sorting</span>
              </Link>
              <Link
                to="/shipments"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                <Truck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Linehauls</span>
              </Link>
            </>
          )}

          {canRegister && (
            <>
              <Link
                to="/parcels/register"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Register Parcel</span>
              </Link>
              <Link
                to="/shipments/create"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                <Truck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Manifest Run</span>
              </Link>
            </>
          )}

          <button
            onClick={fetchDashboardData}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh operational metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Interactive Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/parcels?status=ARRIVED_AT_HUB"
          className="group bg-white hover:bg-indigo-50/20 p-5 rounded-xl border border-slate-200/90 hover:border-indigo-300 shadow-xs hover:shadow-sm transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-indigo-700 transition">
              At Facility
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
              {stats.parcelsAtHub}
            </span>
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
              <span>In Storage</span>
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
            </span>
          </div>
        </Link>

        <Link
          to="/parcels?status=RECEIVED_AT_ORIGIN_HUB"
          className="group bg-white hover:bg-amber-50/20 p-5 rounded-xl border border-slate-200/90 hover:border-amber-300 shadow-xs hover:shadow-sm transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-amber-700 transition">
              Pending Run
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
              {stats.pendingDispatch}
            </span>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 flex items-center gap-1">
              <span>Ready to Load</span>
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
            </span>
          </div>
        </Link>

        <Link
          to="/shipments?direction=inbound"
          className="group bg-white hover:bg-blue-50/20 p-5 rounded-xl border border-slate-200/90 hover:border-blue-300 shadow-xs hover:shadow-sm transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-blue-700 transition">
              Inbound Linehauls
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
              {stats.incomingShipments}
            </span>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
              <span>En Route</span>
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
            </span>
          </div>
        </Link>

        <Link
          to="/parcels?status=DELIVERED"
          className="group bg-white hover:bg-emerald-50/20 p-5 rounded-xl border border-slate-200/90 hover:border-emerald-300 shadow-xs hover:shadow-sm transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-emerald-700 transition">
              Delivered
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
              {stats.deliveredCount}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
              <span>Finalized</span>
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
            </span>
          </div>
        </Link>
      </div>

      {/* Main Operational Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Hub Consignments */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <span>Consignments at Station</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Parcels stationed at or originating from your facility
                </p>
              </div>
              <Link
                to="/parcels"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentParcels.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <Package className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                <p className="text-xs font-semibold text-slate-600">No active consignments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pl-1">Tracking ID</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Weight</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right pr-1">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {recentParcels.map((p) => {
                      const pId = p.parcel_id || p.id;
                      return (
                        <tr
                          key={pId}
                          className="hover:bg-slate-50 transition-colors group"
                        >
                          <td className="py-3 pl-1 font-mono font-bold text-indigo-900">
                            <Link
                              to={`/parcels/${pId}`}
                              className="hover:underline flex items-center gap-1 group-hover:text-indigo-600"
                            >
                              {p.tracking_number}
                            </Link>
                          </td>
                          <td className="py-3 text-slate-600">
                            {p.parcel_type?.replace(/_/g, ' ')}
                          </td>
                          <td className="py-3 text-slate-600 font-mono">{p.weight_kg} kg</td>
                          <td className="py-3">
                            <StatusBadge status={p.current_status} size="xs" />
                          </td>
                          <td className="py-3 pr-1 text-right">
                            <Link
                              to={`/parcels/${pId}`}
                              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 transition"
                            >
                              Inspect
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Inbound Shipments Feed */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-cyan-600" />
                <span>Inbound Linehauls</span>
              </h2>
              <Link
                to="/shipments"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                View
              </Link>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Dispatches routed to this station
            </p>

            {recentShipments.length === 0 ? (
              <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <Truck className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                <p className="text-xs font-semibold text-slate-600">No incoming linehauls</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentShipments.map((s) => {
                  const sId = s.shipment_id || s.id;
                  return (
                    <div
                      key={sId}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          Shipment #{sId}
                        </span>
                        <StatusBadge status={s.status} size="xs" />
                      </div>
                      <div className="text-xs text-slate-600">
                        Origin: <span className="font-medium text-slate-800">{s.from_hub_name || `Hub #${s.from_hub_id}`}</span>
                      </div>
                      {s.vehicle_number && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Vehicle: <span className="font-mono font-medium text-slate-700">{s.vehicle_number}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <Link
              to="/shipments/create"
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Manifest New Linehaul</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
