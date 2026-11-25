import React from 'react';
import { Search, Landmark, RefreshCw } from 'lucide-react';
import { DatasetLoadStatus, MuseumRecord } from '../types/museum';

interface HeaderProps {
  records: MuseumRecord[];
  datasetStatus: DatasetLoadStatus;
  searchTerm: string;
  onQuickSearch: (val: string) => void;
  onRetryDataset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  records,
  datasetStatus,
  searchTerm,
  onQuickSearch,
  onRetryDataset,
}) => {
  const isReady = datasetStatus.stage === 'ready' && records.length > 0;
  const isError = datasetStatus.stage === 'error';

  const statusLabel = isReady
    ? `MuseumLens Dataset – ${records.length.toLocaleString()} Records Loaded`
    : isError
    ? 'Dataset retrieval failed'
    : datasetStatus.message;

  return (
    <header className="bg-[#161513] border-b border-[#2C2824] px-6 py-4 sticky top-0 z-30">
      <div className="max-w-[1680px] mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-[#24211D] border border-[#3B352C] flex items-center justify-center text-[#D1B06B]">
            <Landmark className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-xl font-serif font-semibold tracking-tight text-[#FCFAF5] whitespace-nowrap">
                MuseumLens
              </h1>
              <span className="text-xs font-mono text-[#B89248] whitespace-nowrap">
                PS 223
              </span>
            </div>
            <p className="text-xs text-[#A69E92] whitespace-nowrap">
              Museum Collection Data Storytelling
            </p>
          </div>
        </div>

        <div className="flex-1 max-w-md min-w-[220px] hidden lg:block">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8C8377] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onQuickSearch(e.target.value)}
              disabled={!isReady}
              placeholder="Search collection by title or Object ID..."
              aria-label="Quick collection search"
              className="w-full bg-[#211E1B] border border-[#36312B] rounded-lg pl-10 pr-4 py-2 text-sm text-[#F5F0E6] placeholder-[#8C8377] focus:border-[#B89248] disabled:opacity-50 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-[#8C8377] font-medium">
              Dataset Status
            </div>
            <div
              className={`text-xs font-mono tabular-nums ${
                isError ? 'text-[#E59999]' : isReady ? 'text-[#D1B06B]' : 'text-[#E7DFD2]'
              }`}
            >
              {statusLabel}
            </div>
          </div>

          {isError && (
            <button
              type="button"
              onClick={onRetryDataset}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#B89248] hover:bg-[#C9A358] text-[#141311] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
