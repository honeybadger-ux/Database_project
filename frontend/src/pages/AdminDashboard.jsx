import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Shield,
  Building2,
  Users,
  BarChart3,
  Package,
  Truck,
  CheckCircle2,
  Activity,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Building,
  Filter,
} from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCourierAdmin = user?.role === 'COURIER_ADMIN';
  const isExecutive = isSuperAdmin || isCourierAdmin;

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hubs, setHubs] = useState([]);
  const [selectedHub, setSelectedHub] = useState('');

  const carrierTitle = user?.courier_name || 'Carrier Partner';

  useEffect(() => {
    if (isExecutive) {
      adminService
        .getHubs()
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : res.data?.hubs || [];
          setHubs(list);
        })
        .catch((err) => console.error('Failed to load hubs list:', err));
    }
  }, [isExecutive]);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (isExecutive && selectedHub) {
        params.hub_id = selectedHub;
      }
      const response = await adminService.getAnalyticsOverview(params);
      setOverview(response.data);
    } catch (err) {
      console.error('Failed to load admin overview:', err);
      setError('Failed to retrieve live administrative metrics.');
      setOverview({
        total_parcels: 0,
        active_parcels: 0,
        delivered_parcels: 0,
        total_hubs: 0,
        total_employees: 0,
        total_shipments: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [selectedHub]);

  if (loading && !overview) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" message="Loading administrative enterprise overview..." />
      </div>
    );
  }

  const stats = overview || {
    total_parcels: 0,
    active_parcels: 0,
    delivered_parcels: 0,
    total_hubs: 0,
    total_employees: 0,
    total_shipments: 0,
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {isSuperAdmin
                ? 'Master Logistics Administration'
                : isCourierAdmin
                ? `${carrierTitle} Operations Governance`
                : `Station Admin: ${user?.hub_name || `Hub #${user?.hub_id}`}`}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Admin Deck
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Network facilities, workforce rosters, linehaul capacity, and operational telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isExecutive && hubs.length > 0 && (
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-400" />
              <select
                value={selectedHub}
                onChange={(e) => setSelectedHub(e.target.value)}
                className="py-1.5 px-3 border border-slate-200 rounded-lg text-xs font-medium bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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

          <button
            onClick={fetchOverview}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh admin overview"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <Link
            to="/admin/analytics"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Intelligence</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 6 Metric Cards in Clean Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Parcels
          </span>
          <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">{stats.total_parcels}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            In Transit
          </span>
          <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">{stats.active_parcels}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Delivered
          </span>
          <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">{stats.delivered_parcels}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            {isExecutive ? 'Hubs' : 'Station'}
          </span>
          <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">
            {isExecutive ? stats.total_hubs : `Hub #${user?.hub_id}`}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Staff Members
          </span>
          <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">{stats.total_employees}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Linehaul Runs
          </span>
          <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">{stats.total_shipments}</span>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <Building2 className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Hub Facilities Network</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Manage Collection, Central Sorting, and Regional Distribution hubs. Configure addresses, contacts, and active statuses.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100">
            <Link
              to="/admin/hubs"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <span>Manage Hubs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Workforce & Authorizations</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Hub Managers, Clerks, Couriers, and Warehouse personnel. Assign roles and facility stations.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100">
            <Link
              to="/admin/employees"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <span>Manage Workforce</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Logistics Intelligence</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Analyze transit durations, facility throughput, consignment status breakdown, and last-mile resolution benchmarks.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100">
            <Link
              to="/admin/analytics"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <span>View Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
