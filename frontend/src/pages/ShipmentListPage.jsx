import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { shipmentService, adminService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import {
  Truck,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  Building,
  CheckCircle2,
  Calendar,
  Layers,
  Clock,
  Eye,
  Lock,
  Search,
  Filter,
} from 'lucide-react';

export const ShipmentListPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCourierAdmin = user?.role === 'COURIER_ADMIN';
  const isExecutive = isSuperAdmin || isCourierAdmin;
  const canFilterHubs = isExecutive || user?.role === 'HUB_MANAGER';
  const canCreateShipment = ['SUPER_ADMIN', 'COURIER_ADMIN', 'HUB_MANAGER', 'CLERK'].includes(user?.role);

  const [direction, setDirection] = useState(searchParams.get('direction') || 'outbound'); // 'outbound' | 'inbound' | 'all'
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination synced with URL query params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [hubFilter, setHubFilter] = useState(searchParams.get('hub_id') || '');
  const [hubs, setHubs] = useState([]);
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [pageSize, setPageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);

  // Sync state when URL search params change externally
  useEffect(() => {
    const urlDir = searchParams.get('direction');
    if (urlDir && urlDir !== direction) setDirection(urlDir);

    const urlStatus = searchParams.get('status') || '';
    if (urlStatus !== statusFilter) setStatusFilter(urlStatus);

    const urlHub = searchParams.get('hub_id') || '';
    if (urlHub !== hubFilter) setHubFilter(urlHub);

    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== searchQuery) setSearchQuery(urlSearch);

    const urlPage = parseInt(searchParams.get('page') || '1', 10);
    if (urlPage !== page) setPage(urlPage);
  }, [searchParams]);

  // Keep URL search params in sync when user changes direction/filters
  const updateUrlFilters = (newDir, newStatus, newHub, newSearch, newPage) => {
    const params = new URLSearchParams();
    if (newDir && newDir !== 'outbound') params.set('direction', newDir);
    if (newStatus) params.set('status', newStatus);
    if (newHub) params.set('hub_id', newHub);
    if (newSearch && newSearch.trim()) params.set('search', newSearch.trim());
    if (newPage > 1) params.set('page', newPage.toString());
    setSearchParams(params, { replace: true });
  };

  // Shipment Detail Modal State
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Load hubs list for manager/admin filter
  useEffect(() => {
    if (canFilterHubs) {
      adminService
        .getHubs()
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : res.data?.hubs || [];
          setHubs(list);
        })
        .catch((err) => console.error('Failed to load hubs list:', err));
    }
  }, [canFilterHubs]);

  const fetchShipments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      };

      if (direction !== 'all') {
        params.direction = direction;
      }

      if (!isExecutive && user?.hub_id) {
        params.hub_id = user.hub_id;
      } else if (isExecutive && hubFilter) {
        params.hub_id = hubFilter;
      }

      if (statusFilter) {
        params.status = statusFilter;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const response = await shipmentService.getShipments(params);
      const data = response.data;
      const list = Array.isArray(data) ? data : data.shipments || [];
      setShipments(list);

      const countHeader = response.headers?.['x-total-count'];
      if (countHeader !== undefined && countHeader !== null) {
        setTotalRecords(parseInt(countHeader, 10));
      } else {
        setTotalRecords(list.length);
      }
    } catch (err) {
      console.error('Failed to load shipments:', err);
      setError('Unable to load linehaul shipments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchShipments();
    }, 300);
    return () => clearTimeout(timer);
  }, [direction, statusFilter, hubFilter, page, pageSize, searchQuery, user]);

  const openShipmentDetail = async (shipmentId) => {
    setModalLoading(true);
    setModalError(null);
    try {
      const response = await shipmentService.getShipment(shipmentId);
      setSelectedShipment(response.data);
    } catch (err) {
      console.error('Failed to load shipment details:', err);
      setModalError('Failed to fetch detailed shipment manifest.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleReceiveShipment = async (shipmentId) => {
    setReceiveLoading(true);
    try {
      await shipmentService.receiveShipment(shipmentId);
      await openShipmentDetail(shipmentId);
      await fetchShipments();
    } catch (err) {
      console.error('Failed to receive shipment:', err);
      setModalError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          'Failed to mark shipment as received.'
      );
    } finally {
      setReceiveLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Linehaul Shipments</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {totalRecords > 0 ? `${totalRecords} total runs` : `${shipments.length} runs`}
            </span>
            {!isExecutive && user?.hub_id && (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span>Station: {user?.hub_name || `Hub #${user.hub_id}`}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Inter-hub vehicle manifests, in-transit linehaul tracking, and arrival receipt at destination hubs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchShipments}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh shipments"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {canCreateShipment && (
            <Link
              to="/shipments/create"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Shipment</span>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              setPage(1);
              updateUrlFilters(direction, statusFilter, hubFilter, val, 1);
            }}
            placeholder="Search shipment ID, vehicle #, hub names..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Inbound / Outbound / All Direction Tabs */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl w-full sm:w-auto justify-center">
            <button
              onClick={() => {
                setDirection('outbound');
                setPage(1);
                updateUrlFilters('outbound', statusFilter, hubFilter, searchQuery, 1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                direction === 'outbound'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
              <span>Outbound</span>
            </button>

            <button
              onClick={() => {
                setDirection('inbound');
                setPage(1);
                updateUrlFilters('inbound', statusFilter, hubFilter, searchQuery, 1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                direction === 'inbound'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
              <span>Inbound</span>
            </button>

            <button
              onClick={() => {
                setDirection('all');
                setPage(1);
                updateUrlFilters('all', statusFilter, hubFilter, searchQuery, 1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                direction === 'all'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-indigo-500" />
              <span>All</span>
            </button>
          </div>

          {/* Hub filter for managers & executive admins */}
          {canFilterHubs && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Building className="w-4 h-4 text-slate-400 hidden sm:block" />
              <select
                value={hubFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setHubFilter(val);
                  setPage(1);
                  updateUrlFilters(direction, statusFilter, val, searchQuery, 1);
                }}
                className="w-full sm:w-48 py-2 px-3 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
              >
                <option value="">All Network Hubs</option>
                {hubs.map((h) => (
                  <option key={h.hub_id} value={h.hub_id}>
                    {h.hub_name} ({h.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => {
                const val = e.target.value;
                setStatusFilter(val);
                setPage(1);
                updateUrlFilters(direction, val, hubFilter, searchQuery, 1);
              }}
              className="w-full sm:w-40 py-2 px-3 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 text-slate-700 font-semibold"
            >
              <option value="">All Statuses</option>
              <option value="LOADING">Loading</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="ARRIVED">Arrived</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {(statusFilter || searchQuery || hubFilter || direction !== 'outbound') && (
            <button
              onClick={() => {
                setStatusFilter('');
                setSearchQuery('');
                setHubFilter('');
                setDirection('outbound');
                setPage(1);
                updateUrlFilters('outbound', '', '', '', 1);
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 whitespace-nowrap px-2"
            >
              Reset
                setHubFilter('');
                setPage(1);
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 whitespace-nowrap px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs sm:text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Shipments Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20">
            <LoadingSpinner size="lg" message="Loading vehicle manifests..." />
          </div>
        ) : shipments.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-[1.5]" />
            <h3 className="text-base font-bold text-slate-800">
              No shipments matching criteria
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              There are no linehaul records currently matching your search or filter options.
            </p>
            {direction === 'outbound' && (
              <Link
                to="/shipments/create"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Dispatch New Shipment
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Shipment ID</th>
                  <th className="py-3.5 px-4">Route (From → To)</th>
                  <th className="py-3.5 px-4">Vehicle #</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Parcels</th>
                  <th className="py-3.5 px-4">Dispatch Time</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {shipments.map((s) => {
                  const sId = s.shipment_id || s.id;
                  const fromHub = s.from_hub_name || `Hub #${s.from_hub_id}`;
                  const toHub = s.to_hub_name || `Hub #${s.to_hub_id}`;
                  const parcelCount = s.parcel_count ?? (s.parcels?.length || 0);

                  return (
                    <tr
                      key={sId}
                      className="hover:bg-indigo-50/40 transition-colors group cursor-pointer"
                      onClick={() => openShipmentDetail(sId)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-900 whitespace-nowrap">
                        #{sId}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">{fromHub}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-indigo-900">{toHub}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold px-2.5 py-0.5 bg-slate-100 rounded-lg text-slate-700 border border-slate-200/60">
                          {s.vehicle_number || 'N/A'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={s.status} size="xs" />
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
                          <Layers className="w-3.5 h-3.5 text-indigo-500" />
                          {parcelCount} package(s)
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-medium">
                        {s.dispatch_time
                          ? new Date(s.dispatch_time).toLocaleString(undefined, {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Pending departure'}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openShipmentDetail(sId);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> Manifest
                        </button>
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
          totalPages={Math.max(1, Math.ceil(totalRecords / pageSize))}
          onPageChange={(newPage) => setPage(newPage)}
          totalItems={totalRecords}
          pageSize={pageSize}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[15, 25, 50, 100]}
          itemLabel="shipments"
        />
      </div>

      {/* Shipment Manifest Modal */}
      <Modal
        isOpen={!!selectedShipment}
        onClose={() => setSelectedShipment(null)}
        title={`Shipment Manifest #${selectedShipment?.shipment_id || selectedShipment?.id || ''}`}
        maxWidth="max-w-3xl"
      >
        {selectedShipment && (
          <div className="space-y-6">
            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs">
                {modalError}
              </div>
            )}

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Route</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {selectedShipment.from_hub_name || `Hub #${selectedShipment.from_hub_id}`} →{' '}
                  {selectedShipment.to_hub_name || `Hub #${selectedShipment.to_hub_id}`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Vehicle Assigned</span>
                <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                  {selectedShipment.vehicle_number || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Manifest State</span>
                <div className="mt-1">
                  <StatusBadge status={selectedShipment.status} size="sm" />
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div>
                <span className="text-slate-400">Dispatched:</span>{' '}
                <span className="font-semibold text-slate-800">
                  {selectedShipment.dispatch_time
                    ? new Date(selectedShipment.dispatch_time).toLocaleString()
                    : 'Pending departure'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Arrived:</span>{' '}
                <span className="font-semibold text-slate-800">
                  {selectedShipment.arrival_time
                    ? new Date(selectedShipment.arrival_time).toLocaleString()
                    : 'En route'}
                </span>
              </div>
            </div>

            {/* Parcels Manifest */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                <span>Consignments in this Manifest</span>
                <span className="text-indigo-600 font-bold">
                  {(selectedShipment.parcels || []).length} Parcels
                </span>
              </h4>

              {(!selectedShipment.parcels || selectedShipment.parcels.length === 0) ? (
                <p className="text-xs text-slate-400 italic py-3">No individual parcels listed in manifest.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-200">
                  {selectedShipment.parcels.map((p, idx) => (
                    <div
                      key={p.parcel_id || p.id || idx}
                      className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/parcels/${p.parcel_id || p.id}`}
                          className="font-mono font-bold text-indigo-600 hover:underline"
                        >
                          {p.tracking_number}
                        </Link>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600 font-medium">
                          {p.parcel_type?.replace(/_/g, ' ')} ({p.weight_kg}kg)
                        </span>
                      </div>
                      <StatusBadge status={p.current_status} size="xs" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inbound Arrival Action Button */}
            {selectedShipment.status !== 'ARRIVED' && (() => {
              const isDestHub = user?.employee_id === 1 || user?.hub_id === selectedShipment.to_hub_id;
              const hasReceiveRole = ['HUB_MANAGER', 'CLERK', 'WAREHOUSE_STAFF'].includes(user?.role);
              const canReceive = isDestHub && hasReceiveRole && ['DISPATCHED', 'IN_TRANSIT'].includes(selectedShipment.status);

              if (canReceive) {
                return (
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs text-slate-500 font-medium">
                      Stationed at destination facility? Check-in this entire manifest.
                    </span>
                    <button
                      onClick={() =>
                        handleReceiveShipment(
                          selectedShipment.shipment_id || selectedShipment.id
                        )
                      }
                      disabled={receiveLoading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                    >
                      {receiveLoading ? (
                        'Processing check-in...'
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Receive Shipment at Hub
                        </>
                      )}
                    </button>
                  </div>
                );
              }

              if (selectedShipment.status === 'LOADING') {
                return (
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-amber-700 bg-amber-50/70 p-3 rounded-2xl border border-amber-200/60">
                    <span className="font-semibold">Linehaul manifest is currently being loaded at origin facility.</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Status: Loading</span>
                  </div>
                );
              }

              return (
                <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>
                    Inbound check-in is reserved for station staff at Destination Hub #{selectedShipment.to_hub_id}
                    {selectedShipment.to_hub_name ? ` (${selectedShipment.to_hub_name})` : ''}.
                  </span>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ShipmentListPage;
