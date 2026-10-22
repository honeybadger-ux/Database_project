import React from 'react';
import {
  MapPin,
  Truck,
  CheckCircle2,
  XCircle,
  Package,
  Clock,
  RotateCcw,
  Navigation,
  UserCheck,
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export const TrackingTimeline = ({ events = [] }) => {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
        <Package className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
        <p className="text-sm font-medium text-slate-600">No tracking milestones recorded yet</p>
        <p className="text-xs text-slate-400 mt-1">Events will appear as the consignment moves through hubs</p>
      </div>
    );
  }

  // Sort descending by timestamp (latest first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp)
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case 'DELIVERED':
        return <CheckCircle2 className="w-4 h-4 text-white" />;
      case 'FAILED_DELIVERY':
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-white" />;
      case 'RETURNED_TO_SENDER':
        return <RotateCcw className="w-4 h-4 text-white" />;
      case 'IN_TRANSIT':
        return <Truck className="w-4 h-4 text-white" />;
      case 'OUT_FOR_DELIVERY':
        return <Navigation className="w-4 h-4 text-white" />;
      case 'ARRIVED_AT_HUB':
      case 'RECEIVED_AT_ORIGIN_HUB':
        return <MapPin className="w-4 h-4 text-white" />;
      case 'REGISTERED':
      case 'PICKED_UP':
        return <Package className="w-4 h-4 text-white" />;
      default:
        return <Clock className="w-4 h-4 text-white" />;
    }
  };

  const getIconBackground = (status, isLatest) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-600 ring-emerald-100 shadow-emerald-200';
      case 'FAILED_DELIVERY':
      case 'CANCELLED':
        return 'bg-rose-600 ring-rose-100 shadow-rose-200';
      case 'RETURNED_TO_SENDER':
        return 'bg-pink-600 ring-pink-100 shadow-pink-200';
      case 'IN_TRANSIT':
        return 'bg-amber-500 ring-amber-100 shadow-amber-200';
      case 'OUT_FOR_DELIVERY':
        return 'bg-orange-500 ring-orange-100 shadow-orange-200';
      case 'ARRIVED_AT_HUB':
        return 'bg-purple-600 ring-purple-100 shadow-purple-200';
      case 'RECEIVED_AT_ORIGIN_HUB':
        return 'bg-indigo-600 ring-indigo-100 shadow-indigo-200';
      default:
        return 'bg-blue-600 ring-blue-100 shadow-blue-200';
    }
  };

  return (
    <div className="relative pl-7 sm:pl-8 space-y-6 before:absolute before:left-3.5 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500 before:via-slate-200 before:to-slate-200">
      {sortedEvents.map((evt, idx) => {
        const isLatest = idx === 0;
        const eventTime = evt.created_at || evt.timestamp;
        const formattedDate = eventTime
          ? new Date(eventTime).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : 'Timestamp recorded';

        const hubName =
          evt.hub_name ||
          evt.hub?.hub_name ||
          (evt.hub_id ? `Hub #${evt.hub_id}` : null);

        const employeeName = evt.employee_name || evt.employee?.full_name;

        return (
          <div key={evt.tracking_id || evt.id || idx} className="relative group">
            {/* Timeline icon node */}
            <div
              className={`absolute -left-7 sm:-left-8 top-1.5 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full ring-4 shadow-sm transition-all duration-200 group-hover:scale-110 ${getIconBackground(
                evt.status,
                isLatest
              )} ${isLatest ? 'ring-offset-2 ring-indigo-200' : ''}`}
            >
              {getStatusIcon(evt.status)}
            </div>

            {/* Event content box */}
            <div
              className={`rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
                isLatest
                  ? 'bg-gradient-to-br from-white via-indigo-50/20 to-white border-indigo-200/90 shadow-card ring-1 ring-indigo-500/10'
                  : 'bg-white border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-card'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={evt.status} size="sm" />
                  {isLatest && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                      Latest Checkpoint
                    </span>
                  )}
                </div>
                <time className="text-xs font-medium text-slate-400 font-mono">{formattedDate}</time>
              </div>

              {evt.remarks && (
                <p className="text-sm text-slate-800 font-medium mt-2 leading-relaxed">
                  {evt.remarks}
                </p>
              )}

              <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 pt-2.5 border-t border-slate-100">
                {hubName && (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{hubName}</span>
                  </span>
                )}
                {employeeName && (
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Verified by: <strong className="font-semibold text-slate-700">{employeeName}</strong></span>
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TrackingTimeline;
