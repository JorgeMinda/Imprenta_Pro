// src/components/Pagination.tsx
import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  total:            number;
  page:             number;
  pageSize:         number;
  onPageChange:     (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export default function Pagination({
  total, page, pageSize, onPageChange,
  onPageSizeChange, pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  const getPages = (): (number | '...')[] => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const base     = 'flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-all';
  const active   = 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30';
  const inactive = 'text-gray-400 hover:text-white hover:bg-white/10';
  const disabled = 'text-gray-700 cursor-not-allowed';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-3 border-t border-white/5">
      <p className="text-xs text-gray-500 shrink-0">
        {total === 0 ? 'Sin resultados' : `${from}–${to} de ${total} registros`}
      </p>

      <div className="flex items-center gap-1.5">
        {onPageSizeChange && (
          <div className="flex items-center gap-2 mr-3">
            <span className="text-xs text-gray-500 hidden sm:block">Por página:</span>
            <select value={pageSize}
              onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
              className="bg-gray-800/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-indigo-500 transition-all">
              {pageSizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <button onClick={() => onPageChange(1)} disabled={page === 1}
          className={`${base} ${page === 1 ? disabled : inactive}`} title="Primera">
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
          className={`${base} ${page === 1 ? disabled : inactive}`} title="Anterior">
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPages().map((p, i) =>
          p === '...'
            ? <span key={`d${i}`} className="text-gray-600 px-1 text-sm">…</span>
            : <button key={p} onClick={() => onPageChange(p as number)}
                className={`${base} ${p === page ? active : inactive}`}>{p}</button>
        )}

        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
          className={`${base} ${page === totalPages ? disabled : inactive}`} title="Siguiente">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={() => onPageChange(totalPages)} disabled={page === totalPages}
          className={`${base} ${page === totalPages ? disabled : inactive}`} title="Última">
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Hook reutilizable ─────────────────────────────────────────────────────────
export function usePagination<T>(items: T[], defaultPageSize = 10) {
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const paginated  = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    page:        safePage,
    pageSize,
    totalPages,
    paginated,
    total:       items.length,
    setPage,
    setPageSize: (s: number) => { setPageSize(s); setPage(1); },
  };
}