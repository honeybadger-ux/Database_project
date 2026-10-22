import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalItems = null,
  pageSize = 15,
  onPageSizeChange = null,
  pageSizeOptions = [15, 25, 50, 100],
  itemLabel = 'records',
}) => {
  if (totalItems === 0) return null;

  const effectiveTotalPages = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, currentPage), effectiveTotalPages);
  const rawStart = (safePage - 1) * pageSize + 1;
  const startItem = totalItems !== null && totalItems > 0 ? Math.min(rawStart, totalItems) : null;
  const endItem = totalItems !== null && totalItems > 0 ? Math.min(safePage * pageSize, totalItems) : null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3.5 px-4 border-t border-slate-100 text-xs bg-slate-50/50 rounded-b-3xl">
      {/* Left: Summary and page size selector */}
      <div className="flex flex-wrap items-center gap-3 text-slate-500 font-medium">
        {totalItems !== null ? (
          <div>
            Showing <span className="font-bold text-slate-800">{startItem}</span> to{' '}
            <span className="font-bold text-slate-800">{endItem}</span> of{' '}
            <span className="font-bold text-indigo-700 font-mono text-xs sm:text-sm">{totalItems}</span> {itemLabel}
          </div>
        ) : (
          <div>
            Page <span className="font-bold text-slate-800">{currentPage}</span> of{' '}
            <span className="font-bold text-slate-800">{effectiveTotalPages}</span>
          </div>
        )}

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span className="text-slate-400 text-[11px] font-semibold">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
              }}
              className="py-1 px-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page navigation buttons */}
      <div className="flex items-center space-x-1.5">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className={`p-1.5 rounded-lg border text-xs transition-all ${
            currentPage <= 1
              ? 'border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs'
          }`}
          title="First page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`inline-flex items-center px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            currentPage <= 1
              ? 'border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs'
          }`}
        >
          <ChevronLeft className="w-3.5 h-3.5 mr-1" />
          Prev
        </button>

        <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg font-bold font-mono">
          Page {currentPage} / {effectiveTotalPages}
        </span>

        {/* Next */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= effectiveTotalPages}
          className={`inline-flex items-center px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            currentPage >= effectiveTotalPages
              ? 'border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs'
          }`}
        >
          Next
          <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(effectiveTotalPages)}
          disabled={currentPage >= effectiveTotalPages}
          className={`p-1.5 rounded-lg border text-xs transition-all ${
            currentPage >= effectiveTotalPages
              ? 'border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs'
          }`}
          title="Last page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
