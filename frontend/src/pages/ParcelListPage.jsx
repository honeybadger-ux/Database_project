import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { parcelService, adminService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';
import {
  Package,
  Search,
  Filter,
  PlusCircle,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  MapPin,
  Calendar,
  Layers,
  Building,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'REGISTERED', label: 'Registered' },
  { value: 'PICKED_UP', label: 'Picked Up' },
  { value: 'RECEIVED_AT_ORIGIN_HUB', label: 'Received at Origin Hub' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'ARRIVED_AT_HUB', label: 'Arrived at Hub' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'FAILED_DELIVERY', label: 'Failed Delivery' },
  { value: 'RETURNED_TO_SENDER', label: 'Returned to Sender' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const ParcelListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [parcels, setParcels] = useState([]);
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

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCourierAdmin = user?.role === 'COURIER_ADMIN';
  const canFilterHubs = isSuperAdmin || isCourierAdmin || user?.role === 'HUB_MANAGER';
  const canRegisterParcel = ['SUPER_ADMIN', 'COURIER_ADMIN', 'HUB_MANAGER', 'CLERK'].includes(user?.role);

  // Sync state when URL search params change externally
  useEffect(() => {
    const urlStatus = searchParams.get('status') || '';
    if (urlStatus !== statusFilter) setStatusFilter(urlStatus);

    const urlHub = searchParams.get('hub_id') || '';
    if (urlHub !== hubFilter) setHubFilter(urlHub);

    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== searchQuery) setSearchQuery(urlSearch);

    const urlPage = parseInt(searchParams.get('page') || '1', 10);
    if (urlPage !== page) setPage(urlPage);
  }, [searchParams]);

  // Keep URL search params in sync when user changes filters
  const updateUrlFilters = (newStatus, newHub, newSearch, newPage) => {
    const params = new URLSearchParams();
    if (newStatus) params.set('status', newStatus);
    if (newHub) params.set('hub_id', newHub);
    if (newSearch && newSearch.trim()) params.set('search', newSearch.trim());
    if (newPage > 1) params.set('page', newPage.toString());
    setSearchParams(params, { replace: true });
  };

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

  const fetchParcels = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      };

      if (statusFilter) params.status = statusFilter;
      if (hubFilter) params.hub_id = hubFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await parcelService.getParcels(params);
      const data = response.data;
      const list = Array.isArray(data) ? data : data.parcels || [];
      setParcels(list);

      const countHeader = response.headers?.['x-total-count'];
      if (countHeader !== undefined && countHeader !== null) {
        setTotalRecords(parseInt(countHeader, 10));
      } else {
        setTotalRecords(list.length);
      }
    } catch (err) {
      console.error('Failed to load parcels:', err);
      setError('Unable to load parcel consignment records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchParcels();
    }, 300);
    return () => clearTimeout(timer);
  }, [page, pageSize, statusFilter, hubFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Parcel Consignments</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {totalRecords > 0 ? `${totalRecords} total consignments` : `${parcels.length} records`}
            </span>
            {!isSuperAdmin && !isCourierAdmin && user?.hub_id && (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span>Station: {user?.hub_name || `Hub #${user.hub_id}`}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Search, filter, inspect status milestones, and initiate delivery and dispatch workflows.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchParcels}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh parcel list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {canRegisterParcel && (
            <Link
              to="/parcels/register"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Register Parcel</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              setPage(1);
              updateUrlFilters(statusFilter, hubFilter, val, 1);
            }}
            placeholder="Search tracking number, sender, or receiver..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Hub filter for managers & admins */}
          {canFilterHubs && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Building className="w-4 h-4 text-slate-400 hidden sm:block" />
              <select
                value={hubFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setHubFilter(val);
                  setPage(1);
                  updateUrlFilters(statusFilter, val, searchQuery, 1);
                }}
                className="w-full md:w-52 py-2 px-3 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
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

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => {
                const val = e.target.value;
                setStatusFilter(val);
                setPage(1);
                updateUrlFilters(val, hubFilter, searchQuery, 1);
              }}
              className="w-full md:w-48 py-2 px-3 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {(statusFilter || searchQuery || hubFilter) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setSearchQuery('');
                setHubFilter('');
                setPage(1);
                updateUrlFilters('', '', '', 1);
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 whitespace-nowrap px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs sm:text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table View */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20">
            <LoadingSpinner size="lg" message="Loading parcel manifests..." />
          </div>
        ) : parcels.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-[1.5]" />
            <h3 className="text-base font-bold text-slate-800">No parcels found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              There are no parcels matching the specified filter criteria.
            </p>
            <Link
              to="/parcels/register"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Register Parcel
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Tracking #</th>
                  <th className="py-3.5 px-4">Sender</th>
                  <th className="py-3.5 px-4">Receiver</th>
                  <th className="py-3.5 px-4">Route</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {parcels.map((p) => {
                  const parcelId = p.parcel_id || p.id;
                  const originText =
                    p.origin_hub_name ||
                    p.sender_city ||
                    `Hub #${p.origin_hub_id}`;
                  const destText =
                    p.destination_hub_name ||
                    p.receiver_city ||
                    `Hub #${p.destination_hub_id}`;

                  return (
                    <tr
                      key={parcelId}
                      onClick={() => navigate(`/parcels/${parcelId}`)}
                      className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-900 group-hover:text-indigo-600 whitespace-nowrap">
                        {p.tracking_number}
                        <div className="text-[10px] font-normal text-slate-400 font-sans mt-0.5">
                          {p.parcel_type?.replace(/_/g, ' ')} • {p.weight_kg}kg
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        <div className="font-semibold">{p.sender_name || 'Sender'}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {p.sender_city || ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        <div className="font-semibold">{p.receiver_name || 'Receiver'}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {p.receiver_city || ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-600 font-semibold whitespace-nowrap">
                          <span>{originText}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="text-slate-800">{destText}</span>
                        </div>
                        {p.current_hub_name && (
                          <div className="text-[10px] text-indigo-600 font-bold mt-0.5">
                            Stationed: {p.current_hub_name}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={p.current_status} size="xs" />
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-medium">
                        {p.created_at
                          ? new Date(p.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'N/A'}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="inline-flex items-center text-xs font-bold text-indigo-600 group-hover:underline">
                          View Details →
                        </span>
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
          itemLabel="consignments"
        />
      </div>
    </div>
  );
};

export default ParcelListPage;
