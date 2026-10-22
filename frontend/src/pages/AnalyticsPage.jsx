import React, { useState, useEffect } from 'react';
import { adminService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Clock,
  PieChart as PieIcon,
  RefreshCw,
  AlertCircle,
  Truck,
  CheckCircle2,
  Building,
  Filter,
  Package,
  ShieldCheck,
  Shield,
  Activity,
} from 'lucide-react';

const STATUS_COLORS = {
  DELIVERED: '#10b981',
  IN_TRANSIT: '#3b82f6',
  ARRIVED_AT_HUB: '#8b5cf6',
  OUT_FOR_DELIVERY: '#f97316',
  RECEIVED_AT_ORIGIN_HUB: '#6366f1',
  PICKED_UP: '#06b6d4',
  REGISTERED: '#64748b',
  FAILED_DELIVERY: '#ef4444',
  RETURNED_TO_SENDER: '#ec4899',
  CANCELLED: '#475569',
};

const OUTCOME_COLORS = {
  DELIVERED: '#10b981',
  FAILED_NO_ONE_HOME: '#f59e0b',
  FAILED_WRONG_ADDRESS: '#ef4444',
  FAILED_REFUSED: '#dc2626',
  FAILED_OTHER: '#64748b',
};

const formatHubLabel = (name) => {
  if (!name) return '';
  return name
    .replace('Central Sorting Hub', 'Sorting')
    .replace('Regional Distribution Hub', 'Dist')
    .replace('Collection Center', 'Coll')
    .replace(' Hub', '');
};

const formatStatusLabel = (status) => {
  if (!status) return '';
  return status
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

const formatOutcomeLabel = (outcome) => {
  switch (outcome) {
    case 'DELIVERED':
      return 'Delivered Successfully';
    case 'FAILED_NO_ONE_HOME':
      return 'Customer Not Available';
    case 'FAILED_WRONG_ADDRESS':
      return 'Incorrect Address';
    case 'FAILED_REFUSED':
      return 'Consignment Refused';
    case 'FAILED_OTHER':
      return 'Other Exceptions';
    default:
      return formatStatusLabel(outcome);
  }
};

export const AnalyticsPage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCourierAdmin = user?.role === 'COURIER_ADMIN';
  const isExecutive = isSuperAdmin || isCourierAdmin;
  const canFilterHubs = isExecutive;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hubs, setHubs] = useState([]);
  const [selectedHub, setSelectedHub] = useState('');

  // Datasets
  const [overviewStats, setOverviewStats] = useState(null);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [hubThroughput, setHubThroughput] = useState([]);
  const [transitTimes, setTransitTimes] = useState([]);
  const [deliveryRates, setDeliveryRates] = useState([]);

  useEffect(() => {
    if (canFilterHubs) {
      adminService
        .getHubs()
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : res.data?.hubs || [];
          setHubs(list);
        })
        .catch(() => {});
    }
  }, [canFilterHubs]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    const params = {};
    if (!isExecutive && user?.hub_id) {
      params.hub_id = user.hub_id;
    } else if (isExecutive && selectedHub) {
      params.hub_id = selectedHub;
    }

    try {
      const [overviewRes, statusRes, throughputRes, transitRes, deliveryRes] = await Promise.all([
        adminService.getAnalyticsOverview(params).catch(() => ({ data: null })),
        adminService.getStatusDistribution(params).catch(() => ({ data: [] })),
        adminService.getHubThroughput(params).catch(() => ({ data: [] })),
        adminService.getTransitTimes(params).catch(() => ({ data: [] })),
        adminService.getDeliveryRates(params).catch(() => ({ data: [] })),
      ]);

      setOverviewStats(overviewRes.data);
      setStatusDistribution(Array.isArray(statusRes.data) ? statusRes.data : []);
      setHubThroughput(Array.isArray(throughputRes.data) ? throughputRes.data : []);

      const trData = Array.isArray(transitRes.data) ? transitRes.data : [];
      setTransitTimes(
        trData.map((d) => ({
          ...d,
          routeShort: `${formatHubLabel(d.origin_hub)} → ${formatHubLabel(d.destination_hub)}`,
          routeFull: `${d.origin_hub} → ${d.destination_hub}`,
          avg_transit_hours: parseFloat(d.avg_transit_hours || 0),
        }))
      );

      setDeliveryRates(Array.isArray(deliveryRes.data) ? deliveryRes.data : []);
    } catch (err) {
      console.error('Failed to load analytics dashboard data:', err);
      setError('Unable to fetch live analytics metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedHub]);

  const totalParcelsInDistribution = statusDistribution.reduce(
    (sum, item) => sum + (item.parcel_count || 0),
    0
  );

  const totalDeliveryAttempts = deliveryRates.reduce(
    (sum, item) => sum + (item.attempt_count || 0),
    0
  );

  const deliveredItem = deliveryRates.find((d) => d.outcome === 'DELIVERED');
  const deliverySuccessRate = deliveredItem ? deliveredItem.rate_percentage : 0;
  const signaturesCollected = deliveryRates.reduce(
    (sum, item) => sum + (item.signatures_obtained || 0),
    0
  );

  const carrierTitle = user?.courier_name || 'Carrier Network';

  if (loading && !overviewStats && statusDistribution.length === 0) {
    return (
      <div className="py-20">
        <LoadingSpinner size="lg" message="Synthesizing multi-hub operational telemetry..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Logistics Intelligence
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isExecutive
              ? `Operational metrics, consignment pipeline, and transit durations for ${carrierTitle}.`
              : `Operational throughput and last-mile metrics for ${user?.hub_name || 'assigned facility'}.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canFilterHubs && hubs.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedHub}
                onChange={(e) => setSelectedHub(e.target.value)}
                className="py-1.5 px-3 border border-slate-200 rounded-lg text-xs font-medium bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">All Facilities</option>
                {hubs.map((h) => (
                  <option key={h.hub_id} value={h.hub_id}>
                    {h.hub_name} ({h.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stat Cards (4 Clean Balanced Cards) */}
      {overviewStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Parcels */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Consignments
              </span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
                {overviewStats.total_parcels}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-medium">
                <span className="text-emerald-600 font-semibold">{overviewStats.delivered_parcels} delivered</span>
                <span>&bull;</span>
                <span className="text-amber-600 font-semibold">{overviewStats.active_parcels} active</span>
              </div>
            </div>
          </div>

          {/* Card 2: Resolution SLA */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Resolution Rate
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600 font-mono">
                {deliverySuccessRate}%
              </div>
              <div className="text-xs text-slate-500 mt-1 font-medium">
                {totalDeliveryAttempts} attempts logged {signaturesCollected > 0 ? `(${signaturesCollected} signed)` : ''}
              </div>
            </div>
          </div>

          {/* Card 3: Linehaul Runs */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Linehaul Runs
              </span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
                {overviewStats.total_shipments}
              </div>
              <div className="text-xs text-slate-500 mt-1 font-medium">
                Inter-hub manifested runs
              </div>
            </div>
          </div>

          {/* Card 4: Facilities & Personnel */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Facilities
              </span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Building className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
                {overviewStats.total_hubs}
              </div>
              <div className="text-xs text-slate-500 mt-1 font-medium">
                {overviewStats.total_employees} active staff members
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Row 1: Pipeline Breakdown & Last-Mile Resolution (Properly Sized) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Pipeline Lifecycle Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-indigo-600" />
                <span>Consignment Pipeline Status</span>
              </h2>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-mono border border-indigo-100">
                {totalParcelsInDistribution} Parcels
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Consignment volumes across intake, linehaul, and last-mile delivery.
            </p>

            {statusDistribution.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <PieIcon className="w-8 h-8 text-slate-300 mb-1" />
                <p className="text-xs font-semibold text-slate-600">No consignment records</p>
              </div>
            ) : (
              <div>
                {/* Donut Chart Centered */}
                <div className="relative w-full h-56 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        dataKey="parcel_count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        stroke="#ffffff"
                        strokeWidth={2}
                      >
                        {statusDistribution.map((entry, index) => {
                          const fillColor =
                            STATUS_COLORS[entry.status] ||
                            ['#2563eb', '#0284c7', '#0d9488', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'][
                              index % 7
                            ];
                          return <Cell key={`cell-${index}`} fill={fillColor} />;
                        })}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                        formatter={(val, name, props) => [
                          `${val} parcels (${props.payload.percentage || ''}%)`,
                          formatStatusLabel(props.payload.status),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-slate-900 font-mono">
                      {totalParcelsInDistribution}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Total
                    </span>
                  </div>
                </div>

                {/* Status Breakdown Grid (Uncramped 2-Column Grid) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
                  {statusDistribution.map((item, idx) => {
                    const color = STATUS_COLORS[item.status] || '#64748b';
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-medium text-slate-700 truncate" title={formatStatusLabel(item.status)}>
                            {formatStatusLabel(item.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-[11px]">
                          <span className="font-bold text-slate-900">{item.parcel_count}</span>
                          <span className="text-slate-400">({item.percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card: Last-Mile Delivery Outcomes */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Last-Mile Resolution & Outcomes</span>
              </h2>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-mono border border-emerald-100">
                {deliverySuccessRate}% Success
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Resolution outcomes of last-mile delivery runs and exception breakdown.
            </p>

            {deliveryRates.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mb-1" />
                <p className="text-xs font-semibold text-slate-600">No delivery attempts recorded</p>
              </div>
            ) : (
              <div>
                {/* Donut Chart Centered */}
                <div className="relative w-full h-56 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deliveryRates}
                        dataKey="attempt_count"
                        nameKey="outcome"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        stroke="#ffffff"
                        strokeWidth={2}
                      >
                        {deliveryRates.map((entry, index) => {
                          const fillColor = OUTCOME_COLORS[entry.outcome] || '#64748b';
                          return <Cell key={`cell-${index}`} fill={fillColor} />;
                        })}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                        formatter={(val, name, props) => [
                          `${val} attempts (${props.payload.rate_percentage || ''}%)`,
                          formatOutcomeLabel(props.payload.outcome),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-emerald-600 font-mono">
                      {deliverySuccessRate}%
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Delivered
                    </span>
                  </div>
                </div>

                {/* Outcome Breakdown Cards (Uncramped 2-Column Grid) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
                  {deliveryRates.map((item, idx) => {
                    const color = OUTCOME_COLORS[item.outcome] || '#64748b';
                    const isSuccess = item.outcome === 'DELIVERED';

                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg border text-xs ${
                          isSuccess
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                            : 'bg-slate-50 border-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0 pr-1">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-semibold text-slate-800 truncate">
                              {formatOutcomeLabel(item.outcome)}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-xs">{item.rate_percentage}%</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pl-3.5">
                          <span>{item.attempt_count} attempts</span>
                          {item.signatures_obtained > 0 && (
                            <span className="text-emerald-700 font-semibold">
                              ✓ {item.signatures_obtained} signed
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Facility Scan Throughput (Full-Width with ample room for labels) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span>Facility Throughput Telemetry</span>
          </h2>
          <span className="text-xs font-semibold text-slate-500 font-mono">
            {hubThroughput.length} Stations
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Total milestone scan events logged vs unique packages processed across facilities.
        </p>

        {hubThroughput.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <Building className="w-8 h-8 text-slate-300 mb-1" />
            <p className="text-xs font-semibold text-slate-600">No facility scan milestones recorded</p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={hubThroughput}
                margin={{ top: 10, right: 15, left: -10, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="hub_name"
                  tickFormatter={formatHubLabel}
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={45}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                  formatter={(val, name) => [val, name]}
                  labelFormatter={(label) => label}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                  iconType="circle"
                />
                <Bar
                  dataKey="total_events"
                  name="Total Scan Events"
                  fill="#4f46e5"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="unique_parcels"
                  name="Unique Packages Handled"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Row 3: Linehaul Transit Durations (Full-Width with readable route lanes) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Linehaul Transit Durations</span>
          </h2>
          <span className="text-xs font-semibold text-slate-500 font-mono">
            {transitTimes.length} Active Lanes
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Average elapsed hours from origin departure dispatch to destination facility receipt.
        </p>

        {transitTimes.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <Clock className="w-8 h-8 text-slate-300 mb-1" />
            <p className="text-xs font-semibold text-slate-600">No completed linehaul durations</p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={transitTimes.slice(0, 8)}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  unit="h"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  type="category"
                  dataKey="routeShort"
                  tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }}
                  width={200}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                  formatter={(val, name, props) => [
                    `${val} hours (${props.payload.total_shipments || 0} shipments completed)`,
                    'Average Duration',
                  ]}
                  labelFormatter={(label, items) => {
                    const item = items?.[0]?.payload;
                    return item ? item.routeFull : label;
                  }}
                />
                <Bar
                  dataKey="avg_transit_hours"
                  name="Average Duration (Hours)"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
