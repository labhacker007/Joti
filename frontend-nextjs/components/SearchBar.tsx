'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  showAdvanced?: boolean;
  onAdvancedClick?: () => void;
}

export default function SearchBar({
  onSearch,
  placeholder = 'Search articles, keywords, IOCs...',
  showAdvanced = true,
  onAdvancedClick,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
    onSearch('');
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all',
            isFocused
              ? 'border-primary/50 bg-primary/5 ring-2 ring-primary/20'
              : 'border-border bg-background hover:border-border/80'
          )}
        >
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-foreground placeholder-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-muted rounded transition-colors flex-shrink-0"
              title="Clear search"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </form>

      {/* Hint for advanced search */}
      {showAdvanced && onAdvancedClick && (
        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
          <AlertCircle className="w-3 h-3" />
          <span>
            Tip: Use <button onClick={onAdvancedClick} className="underline hover:text-foreground">
              advanced filters
            </button>
            {' '}for date range, severity, source
          </span>
        </div>
      )}
    </div>
  );
}
