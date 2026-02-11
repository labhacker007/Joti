'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  siblingCount?: number;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
  siblingCount = 1,
  className,
}: PaginationProps) {
  const generatePages = () => {
    const delta = siblingCount;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    let l: (number | string)[] = [];

    for (let i = 1; i < totalPages + 1; i++) {
      if (i == 1 || i == totalPages || range.includes(i)) {
        l.push(i);
      } else if (l[l.length - 1] !== '...') {
        l.push('...');
      }
    }

    return l;
  };

  const pages = generatePages();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={cn('flex justify-center items-center gap-2', className)}>
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1 || loading}
        className="p-2 rounded-lg border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Page Numbers */}
      <div className="flex gap-1">
        {pages.map((page, idx) => (
          <React.Fragment key={idx}>
            {page === '...' ? (
              <span className="px-3 py-2 text-muted-foreground">...</span>
            ) : (
              <button
                onClick={() => onPageChange(page as number)}
                disabled={loading}
                className={cn(
                  'px-3 py-2 rounded-lg transition-colors font-medium',
                  currentPage === page
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                aria-label={`Go to page ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Next Button */}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages || loading}
        className="p-2 rounded-lg border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Page Info */}
      <div className="ml-4 text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </div>
    </div>
  );
}

export default Pagination;
