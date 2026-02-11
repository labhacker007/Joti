'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  empty?: string;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
}

export function Table<T extends { id?: string | number }>({
  data,
  columns,
  loading,
  empty = 'No data available',
  onRowClick,
  rowClassName,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;

    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey as keyof T];
      const bVal = b[sortKey as keyof T];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-muted-foreground">{empty}</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border rounded-lg">
      <table className="w-full">
        <thead className="bg-muted border-b border-border">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                onClick={() => handleSort(String(col.key), col.sortable)}
                className={cn(
                  'px-4 py-3 text-left text-sm font-semibold text-foreground',
                  col.className,
                  col.sortable && 'cursor-pointer hover:bg-accent transition-colors'
                )}
              >
                <div className="flex items-center gap-2">
                  {col.label}
                  {col.sortable && sortKey === String(col.key) && (
                    sortDir === 'asc' ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item, idx) => (
            <tr
              key={item.id || idx}
              onClick={() => onRowClick?.(item)}
              className={cn(
                'border-b border-border hover:bg-muted transition-colors',
                onRowClick && 'cursor-pointer',
                rowClassName?.(item)
              )}
            >
              {columns.map((col) => {
                const value = item[col.key as keyof T];
                const rendered = col.render ? col.render(value as any, item) : value;

                return (
                  <td
                    key={String(col.key)}
                    className={cn('px-4 py-3 text-sm text-foreground', col.className)}
                  >
                    {rendered as React.ReactNode}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
