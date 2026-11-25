import React from 'react';
import { ChevronLeft, ChevronRight, Compass, Loader2 } from 'lucide-react';
import type { MuseumRecord } from '../../types/museum';
import { ObjectCard } from '../ObjectCard';

interface AnalyticsDrilldownPanelProps {
  records: MuseumRecord[];
  totalMatching: number;
  page: number;
  totalPages: number;
  pageSize: number;
  isLoading: boolean;
  selectionSummary: string;
  onPageChange: (nextPage: number) => void;
  onPreviewImage: (record: MuseumRecord) => void;
  onSelectDetails: (record: MuseumRecord) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  onOpenInExplorer?: () => void;
}

export const AnalyticsDrilldownPanel: React.FC<AnalyticsDrilldownPanelProps> = ({
  records,
  totalMatching,
  page,
  totalPages,
  pageSize,
  isLoading,
  selectionSummary,
  onPageChange,
  onPreviewImage,
  onSelectDetails,
  onResetFilters,
  hasActiveFilters,
  onOpenInExplorer,
}) => {
  return (
    <section
      id="analytics-matching-objects"
      aria-labelledby="heading-matching-objects"
      className="space-y-5 pt-4 border-t border-[#2E2A25]"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-[#D1B06B] uppercase tracking-wider">
            Underlying Catalogue Records
          </div>
          <h3
            id="heading-matching-objects"
            className="text-xl sm:text-2xl font-serif font-semibold text-[#FCFAF5] mt-1"
          >
            Objects Behind This Selection ({totalMatching.toLocaleString()})
          </h3>
          <p className="text-xs text-[#A69E92] mt-1">{selectionSummary}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenInExplorer && (
            <button
              type="button"
              onClick={onOpenInExplorer}
              className="px-3.5 py-2 rounded-lg border border-[#3E372E] bg-[#26221D] hover:bg-[#332E27] text-xs font-semibold text-[#F5F0E6] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-[#D1B06B]" />
              Open in Collection Explorer
            </button>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-3.5 py-2 rounded-lg bg-[#B89248] hover:bg-[#C9A358] text-[#141311] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              Reset Analytics Filters
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-12 flex items-center justify-center gap-3 text-sm text-[#4A443C]">
          <Loader2 className="w-5 h-5 animate-spin text-[#96722D]" />
          Loading matching catalogue records...
        </div>
      ) : records.length === 0 ? (
        <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-12 text-center text-[#4A443C] space-y-3">
          <p className="text-lg font-serif font-semibold text-[#1C1917]">
            No museum objects match the active analytical filters
          </p>
          <p className="text-sm text-[#6B6357]">
            Clear one or more filters to view records from the 5,000-record dataset.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-1 px-4 py-2 rounded-lg bg-[#1B1917] hover:bg-[#2F2B26] text-[#FCFAF5] text-xs font-semibold transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {records.map((record) => (
              <ObjectCard
                key={`analytics-card-${record.recordKey}`}
                record={record}
                onPreviewImage={onPreviewImage}
                onSelectDetails={onSelectDetails}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              aria-label="Matching objects pagination"
              className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#2E2A25]"
            >
              <div className="text-xs font-mono text-[#B8B0A4] tabular-nums">
                Showing {((page - 1) * pageSize + 1).toLocaleString()}–
                {Math.min(page * pageSize, totalMatching).toLocaleString()} of{' '}
                {totalMatching.toLocaleString()} matching records
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#38342F] bg-[#24201C] text-xs font-medium text-[#F5F0E6] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2E2924] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>

                <span className="px-3 text-xs font-mono text-[#D1B06B] tabular-nums">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#38342F] bg-[#24201C] text-xs font-medium text-[#F5F0E6] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2E2924] transition-colors cursor-pointer"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </section>
  );
};
