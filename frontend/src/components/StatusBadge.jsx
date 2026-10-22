import React from 'react';

const STATUS_CONFIGS = {
  // ── Parcel Lifecycle Statuses ─────────────────────────────
  REGISTERED: {
    badge: 'bg-slate-100/90 text-slate-700 border-slate-200/80',
    dot: 'bg-slate-400',
    pulse: false,
    label: 'Registered',
  },
  PICKED_UP: {
    badge: 'bg-sky-50 text-sky-700 border-sky-200/70',
    dot: 'bg-sky-500',
    pulse: false,
    label: 'Picked Up',
  },
  RECEIVED_AT_ORIGIN_HUB: {
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
    dot: 'bg-indigo-500',
    pulse: false,
    label: 'Received at Hub',
  },
  IN_TRANSIT: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-500',
    pulse: true,
    label: 'In Transit',
  },
  ARRIVED_AT_HUB: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200/70',
    dot: 'bg-purple-500',
    pulse: false,
    label: 'Arrived at Hub',
  },
  OUT_FOR_DELIVERY: {
    badge: 'bg-orange-50 text-orange-800 border-orange-200/80',
    dot: 'bg-orange-500',
    pulse: true,
    label: 'Out for Delivery',
  },
  DELIVERED: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dot: 'bg-emerald-500',
    pulse: false,
    label: 'Delivered',
  },
  FAILED_DELIVERY: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200/80',
    dot: 'bg-rose-500',
    pulse: false,
    label: 'Failed Attempt',
  },
  RETURNED_TO_SENDER: {
    badge: 'bg-pink-50 text-pink-700 border-pink-200/80',
    dot: 'bg-pink-500',
    pulse: false,
    label: 'Returned to Sender',
  },
  CANCELLED: {
    badge: 'bg-slate-100 text-slate-500 border-slate-200',
    dot: 'bg-slate-400',
    pulse: false,
    label: 'Cancelled',
  },

  // ── Shipment Statuses ─────────────────────────────────────
  LOADING: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200/70',
    dot: 'bg-blue-500',
    pulse: true,
    label: 'Manifest Loading',
  },
  DISPATCHED: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-500',
    pulse: true,
    label: 'Dispatched',
  },
  ARRIVED: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dot: 'bg-emerald-500',
    pulse: false,
    label: 'Arrived at Facility',
  },

  // ── Employee Roles ────────────────────────────────────────
  HUB_MANAGER: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200/70',
    dot: 'bg-purple-600',
    pulse: false,
    label: 'Hub Manager',
  },
  CLERK: {
    badge: 'bg-sky-50 text-sky-700 border-sky-200/70',
    dot: 'bg-sky-500',
    pulse: false,
    label: 'Counter Clerk',
  },
  COURIER: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    dot: 'bg-emerald-500',
    pulse: false,
    label: 'Delivery Courier',
  },
  DRIVER: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200/70',
    dot: 'bg-amber-500',
    pulse: false,
    label: 'Linehaul Driver',
  },
  WAREHOUSE_STAFF: {
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
    dot: 'bg-indigo-500',
    pulse: false,
    label: 'Warehouse Team',
  },

  // ── Hub Facility Types ────────────────────────────────────
  COLLECTION: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200/70',
    dot: 'bg-blue-500',
    pulse: false,
    label: 'Collection Hub',
  },
  SORTING: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200/70',
    dot: 'bg-purple-500',
    pulse: false,
    label: 'Sorting Spine',
  },
  DISTRIBUTION: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    dot: 'bg-emerald-500',
    pulse: false,
    label: 'Distribution Hub',
  },

  // ── Delivery Attempt Outcomes ─────────────────────────────
  FAILED_NO_ONE_HOME: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-500',
    pulse: false,
    label: 'No One Home',
  },
  FAILED_WRONG_ADDRESS: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200/80',
    dot: 'bg-rose-500',
    pulse: false,
    label: 'Incorrect Address',
  },
  FAILED_REFUSED: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200/80',
    dot: 'bg-rose-500',
    pulse: false,
    label: 'Customer Refused',
  },
  FAILED_OTHER: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
    pulse: false,
    label: 'Delivery Exception',
  },
};

export const StatusBadge = ({ status, size = 'sm', showDot = true, customLabel, className = '' }) => {
  if (!status) return null;

  const key = String(status).toUpperCase();
  const config = STATUS_CONFIGS[key] || {
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    pulse: false,
    label: status.replace(/_/g, ' '),
  };

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[11px] font-semibold tracking-tight',
    sm: 'px-2.5 py-1 text-xs font-semibold tracking-tight',
    md: 'px-3 py-1.5 text-xs font-bold tracking-tight',
    lg: 'px-3.5 py-1.5 text-sm font-bold tracking-tight',
  }[size] || 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-2xs transition-colors ${sizeClasses} ${config.badge} ${className}`}
    >
      {showDot && (
        <span className="relative flex h-2 w-2 flex-shrink-0">
          {config.pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dot} opacity-75`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
        </span>
      )}
      <span className="truncate">{customLabel || config.label}</span>
    </span>
  );
};

export default StatusBadge;
