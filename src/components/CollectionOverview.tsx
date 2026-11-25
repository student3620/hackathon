import React from 'react';
import { Compass, ShieldAlert, ExternalLink } from 'lucide-react';
import { DatasetLoadStatus, DatasetStats } from '../types/museum';
import { DatasetLoadingState } from './DatasetLoadingState';

interface CollectionOverviewProps {
  stats: DatasetStats;
  datasetStatus: DatasetLoadStatus;
  onExploreClick: () => void;
  onRetryDataset: () => void;
  isRetrying: boolean;
}

export const CollectionOverview: React.FC<CollectionOverviewProps> = ({
  stats,
  datasetStatus,
  onExploreClick,
  onRetryDataset,
  isRetrying,
}) => {
  const isReady = datasetStatus.stage === 'ready' && stats.totalObjects > 0;
  const pct = (part: number) =>
    stats.totalObjects > 0 ? `${Math.round((part / stats.totalObjects) * 100)}% of selected` : '0%';

  const statItems = [
    {
      label: 'Total Selected Records',
      value: stats.totalObjects.toLocaleString(),
      detail: `Reservoir sample (seed ${datasetStatus.seed})`,
    },
    {
      label: 'Recorded Dates',
      value: stats.withDates.toLocaleString(),
      detail: pct(stats.withDates),
    },
    {
      label: 'Material Information',
      value: stats.withMaterials.toLocaleString(),
      detail: pct(stats.withMaterials),
    },
    {
      label: 'Documented Geography',
      value: stats.withGeography.toLocaleString(),
      detail: pct(stats.withGeography),
    },
    {
      label: 'Missing Geography',
      value: stats.missingGeography.toLocaleString(),
      detail: 'Marked unrecorded (PS 223)',
      highlight: true,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-6 sm:p-8 text-[#1C1917]">
        <div className="max-w-3xl space-y-3">
          <div className="text-xs font-mono text-[#755821] uppercase tracking-wider">
            Module 1 · Collection Explorer · Problem Statement PS 223
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-[#1C1917] leading-tight">
            Museum Collection Data Storytelling
          </h2>
          <p className="text-sm sm:text-base text-[#4A443C] leading-relaxed">
            Explore an automatically retrieved, reproducible 5,000-record representative sample from
            The Metropolitan Museum of Art Open Access catalogue (seed 223). Every record retains
            its original historical dates, materials, public-domain image linkage, and documented
            geographical metadata with strict unknown-origin protection.
          </p>

          <div className="pt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onExploreClick}
              className="px-4 py-2.5 rounded-lg bg-[#1B1917] hover:bg-[#2F2B26] text-[#FCFAF5] text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Compass className="w-4 h-4 text-[#D1B06B]" />
              Open Collection Explorer
            </button>

            <a
              href="https://github.com/metmuseum/openaccess"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-lg border border-[#D4C9B6] hover:border-[#96722D] text-[#1C1917] text-sm font-medium inline-flex items-center gap-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-[#96722D]" />
              Met Open Access Repository
            </a>
          </div>
        </div>
      </section>

      {!isReady ? (
        <DatasetLoadingState
          status={datasetStatus}
          onRetry={onRetryDataset}
          isRetrying={isRetrying}
        />
      ) : (
        <section aria-label="Collection summary statistics" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#D1B06B]">
              MuseumLens Dataset – {stats.totalObjects.toLocaleString()} Records Loaded
            </h3>
            <span className="text-xs font-mono text-[#A69E92] tabular-nums">
              Sampled from {datasetStatus.uniqueRecordsScanned.toLocaleString()} unique Met records
              (seed {datasetStatus.seed})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {statItems.map((item) => (
              <div
                key={item.label}
                className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-5 flex flex-col justify-between gap-3"
              >
                <span className="text-xs font-medium text-[#6B6357]">{item.label}</span>
                <div>
                  <div
                    className={`text-3xl font-serif font-semibold tabular-nums ${
                      item.highlight ? 'text-[#8A6326]' : 'text-[#1C1917]'
                    }`}
                  >
                    {item.value}
                  </div>
                  <div className="text-xs text-[#6B6357] mt-1 truncate" title={item.detail}>
                    {item.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-6 text-[#1C1917]">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-[#96722D] shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <h3 className="text-base font-serif font-semibold text-[#1C1917]">
              PS 223 Unknown-Origin Protection Standard
            </h3>
            <p className="text-sm text-[#4A443C] leading-relaxed">
              Recorded countries, regions, cities, and geography types are displayed verbatim from
              the original Met Open Access catalogue. Whenever geographical fields are blank,
              MuseumLens explicitly reports{' '}
              <span className="italic font-medium text-[#755821]">Not recorded in catalogue</span>{' '}
              and presents cultural attribution separately without inferring geographical origin.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
