import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RotateCcw, ArrowDown, Loader2, AlertCircle } from 'lucide-react';
import type { DatasetLoadStatus, MuseumRecord } from '../../types/museum';
import type {
  AnalyticsFiltersState,
  AnalyticsObjectsResponse,
  AnalyticsSummaryResponse,
} from '../../types/analytics';
import { DatasetLoadingState } from '../DatasetLoadingState';
import { HistoricalDateSection } from './HistoricalDateSection';
import { MaterialAnalysisSection } from './MaterialAnalysisSection';
import {
  GeographicalAnalysisSection,
  MISSING_COUNTRY_FILTER,
} from './GeographicalAnalysisSection';
import { DataCompletenessSection } from './DataCompletenessSection';
import { AnalyticsDrilldownPanel } from './AnalyticsDrilldownPanel';

interface HistoricalAnalyticsPageProps {
  datasetStatus: DatasetLoadStatus;
  allRecords: MuseumRecord[];
  onRetryDataset: () => void;
  isRetrying: boolean;
  onPreviewImage: (record: MuseumRecord) => void;
  onSelectDetails: (record: MuseumRecord) => void;
  attachResolvedImage: (record: MuseumRecord) => MuseumRecord;
  onRequestImagesForRecords: (records: MuseumRecord[]) => void;
  onOpenInExplorerWithFilter: (opts: { country?: string; medium?: string }) => void;
}

const DEFAULT_FILTERS: AnalyticsFiltersState = {
  period: 'all',
  century: 'all',
  materialCategory: 'all',
  medium: 'all',
  country: 'all',
  region: 'all',
  geographyType: 'all',
};

const DRILLDOWN_PAGE_SIZE = 12;

function buildQueryParams(
  filters: AnalyticsFiltersState,
  extra?: Record<string, string | number>
): string {
  const params = new URLSearchParams();
  if (filters.period !== 'all') params.set('period', filters.period);
  if (filters.century !== 'all') params.set('century', filters.century);
  if (filters.materialCategory !== 'all') params.set('materialCategory', filters.materialCategory);
  if (filters.medium !== 'all') params.set('medium', filters.medium);
  if (filters.country !== 'all') params.set('country', filters.country);
  if (filters.region !== 'all') params.set('region', filters.region);
  if (filters.geographyType !== 'all') params.set('geographyType', filters.geographyType);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      params.set(k, String(v));
    }
  }
  return params.toString();
}

export const HistoricalAnalyticsPage: React.FC<HistoricalAnalyticsPageProps> = ({
  datasetStatus,
  allRecords,
  onRetryDataset,
  isRetrying,
  onPreviewImage,
  onSelectDetails,
  attachResolvedImage,
  onRequestImagesForRecords,
  onOpenInExplorerWithFilter,
}) => {
  const [filters, setFilters] = useState<AnalyticsFiltersState>(DEFAULT_FILTERS);
  const [summaryData, setSummaryData] = useState<AnalyticsSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [objectsData, setObjectsData] = useState<AnalyticsObjectsResponse | null>(null);
  const [objectsPage, setObjectsPage] = useState(1);
  const [objectsLoading, setObjectsLoading] = useState(false);

  const isDatasetReady = datasetStatus.stage === 'ready' && allRecords.length > 0;

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((v) => v !== 'all'),
    [filters]
  );

  // Fetch server-computed analytics summary whenever filters change
  useEffect(() => {
    if (!isDatasetReady) return;
    let cancelled = false;
    setSummaryLoading(true);
    setSummaryError(null);

    const qs = buildQueryParams(filters);
    fetch(`/api/analytics/summary${qs ? `?${qs}` : ''}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Analytics request failed (HTTP ${res.status}).`);
        return res.json();
      })
      .then((data: { ready?: boolean } & AnalyticsSummaryResponse) => {
        if (cancelled) return;
        if (data.ready) {
          setSummaryData(data);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSummaryError(
          err instanceof Error ? err.message : 'Unable to load server-side analytics.'
        );
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isDatasetReady, filters]);

  // Reset matching objects page when filters change
  useEffect(() => {
    setObjectsPage(1);
  }, [filters]);

  // Fetch server-filtered underlying catalogue objects
  useEffect(() => {
    if (!isDatasetReady) return;
    let cancelled = false;
    setObjectsLoading(true);

    const qs = buildQueryParams(filters, {
      page: objectsPage,
      pageSize: DRILLDOWN_PAGE_SIZE,
    });
    fetch(`/api/analytics/objects?${qs}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to fetch matching objects (HTTP ${res.status}).`);
        return res.json();
      })
      .then((data: { ready?: boolean } & AnalyticsObjectsResponse) => {
        if (cancelled) return;
        if (data.ready) {
          setObjectsData(data);
          onRequestImagesForRecords(data.records);
        }
      })
      .catch(() => {
        // Keep previous state cleanly on transient error
      })
      .finally(() => {
        if (!cancelled) setObjectsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isDatasetReady, filters, objectsPage, onRequestImagesForRecords]);

  const updateFilter = useCallback(
    (patch: Partial<AnalyticsFiltersState>, scrollToObjects = false) => {
      setFilters((prev) => ({ ...prev, ...patch }));
      if (scrollToObjects) {
        window.setTimeout(() => {
          document
            .getElementById('analytics-matching-objects')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      }
    },
    []
  );

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleInspectObjectId = useCallback(
    (objectID: string | number) => {
      const target = allRecords.find((r) => String(r.objectID) === String(objectID));
      if (target) {
        onRequestImagesForRecords([target]);
        onSelectDetails(target);
      }
    },
    [allRecords, onRequestImagesForRecords, onSelectDetails]
  );

  const resolvedDrilldownRecords = useMemo(() => {
    if (!objectsData?.records) return [];
    return objectsData.records.map(attachResolvedImage);
  }, [objectsData, attachResolvedImage]);

  const activeFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (filters.period !== 'all') {
      const label =
        summaryData?.filterOptions.periods.find((p) => p.id === filters.period)?.label ||
        filters.period;
      parts.push(`Period: ${label}`);
    }
    if (filters.century !== 'all') {
      const label =
        summaryData?.dateAnalysis.centuries.find((c) => c.id === filters.century)?.label ||
        filters.century;
      parts.push(`Century: ${label}`);
    }
    if (filters.materialCategory !== 'all') {
      const label =
        summaryData?.filterOptions.materialCategories.find((m) => m.id === filters.materialCategory)
          ?.label || filters.materialCategory;
      parts.push(`Material Category: ${label}`);
    }
    if (filters.medium !== 'all') {
      parts.push(`Medium: ${filters.medium}`);
    }
    if (filters.country !== 'all') {
      parts.push(
        `Country: ${
          filters.country === MISSING_COUNTRY_FILTER
            ? 'Not recorded in catalogue'
            : filters.country
        }`
      );
    }
    if (filters.region !== 'all') {
      parts.push(`Region: ${filters.region}`);
    }
    if (filters.geographyType !== 'all') {
      parts.push(`Geography Type: ${filters.geographyType}`);
    }
    if (parts.length === 0) {
      return `Showing all ${allRecords.length.toLocaleString()} records from the cached Met Open Access dataset (seed ${datasetStatus.seed}). Click any chart bar, slice, or timeline period to filter.`;
    }
    return `Active filters — ${parts.join(' · ')}`;
  }, [filters, summaryData, allRecords.length, datasetStatus.seed]);

  if (!isDatasetReady) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-[#2E2A25]">
          <div className="text-xs font-mono text-[#D1B06B] uppercase tracking-wider">
            Module 2 · Historical Data Analytics
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-[#FCFAF5] mt-1">
            Historical Analytics
          </h2>
        </div>
        <DatasetLoadingState
          status={datasetStatus}
          onRetry={onRetryDataset}
          isRetrying={isRetrying}
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#2E2A25]">
        <div>
          <div className="text-xs font-mono text-[#D1B06B] uppercase tracking-wider">
            Module 2 · MuseumLens Dataset – {allRecords.length.toLocaleString()} Records Loaded
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-[#FCFAF5] mt-1">
            Historical Data Analytics
          </h2>
          <p className="text-sm text-[#A69E92] mt-1 max-w-2xl">
            Server-computed analysis of catalogue dates, materials, documented geographical origins,
            and field completeness across the 5,000 selected Met Open Access records.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            document
              .getElementById('analytics-matching-objects')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          className="px-4 py-2 rounded-lg bg-[#26221D] hover:bg-[#332E27] border border-[#3E372E] text-[#F5F0E6] text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          <ArrowDown className="w-3.5 h-3.5 text-[#D1B06B]" />
          View Matching Objects ({(summaryData?.filteredTotal ?? allRecords.length).toLocaleString()})
        </button>
      </div>

      {/* Interactive Analytics Filter Bar */}
      <section
        aria-label="Historical analytics filters"
        className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-5 text-[#1C1917] space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-medium text-[#1C1917] font-mono tabular-nums">
            Analysing{' '}
            <strong className="font-semibold text-[#755821]">
              {(summaryData?.filteredTotal ?? allRecords.length).toLocaleString()}
            </strong>{' '}
            of {(summaryData?.datasetTotal ?? allRecords.length).toLocaleString()} catalogue records
            {summaryLoading && (
              <span className="inline-flex items-center gap-1.5 ml-3 text-xs text-[#6B6357] font-sans">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#96722D]" />
                Updating...
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            disabled={!hasActiveFilters}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              hasActiveFilters
                ? 'bg-[#1B1917] hover:bg-[#2F2B26] text-[#FCFAF5] cursor-pointer'
                : 'bg-[#ECE6DA] text-[#9E9589] cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-[#E8E0D2]">
          <div>
            <label
              htmlFor="analytics-filter-period"
              className="block text-xs font-medium text-[#5C554C] mb-1.5"
            >
              Historical Period
            </label>
            <select
              id="analytics-filter-period"
              value={filters.period}
              onChange={(e) => updateFilter({ period: e.target.value, century: 'all' })}
              className="w-full bg-[#FFFFFF] border border-[#D4C9B6] rounded-lg px-3 py-2 text-sm text-[#1C1917] focus:border-[#96722D]"
            >
              <option value="all">All Historical Periods</option>
              {summaryData?.filterOptions.periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.spanLabel})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="analytics-filter-material"
              className="block text-xs font-medium text-[#5C554C] mb-1.5"
            >
              Material Category
            </label>
            <select
              id="analytics-filter-material"
              value={filters.materialCategory}
              onChange={(e) => updateFilter({ materialCategory: e.target.value, medium: 'all' })}
              className="w-full bg-[#FFFFFF] border border-[#D4C9B6] rounded-lg px-3 py-2 text-sm text-[#1C1917] focus:border-[#96722D]"
            >
              <option value="all">All Material Categories</option>
              {summaryData?.filterOptions.materialCategories.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="analytics-filter-country"
              className="block text-xs font-medium text-[#5C554C] mb-1.5"
            >
              Documented Country
            </label>
            <select
              id="analytics-filter-country"
              value={filters.country}
              onChange={(e) => updateFilter({ country: e.target.value })}
              className="w-full bg-[#FFFFFF] border border-[#D4C9B6] rounded-lg px-3 py-2 text-sm text-[#1C1917] focus:border-[#96722D]"
            >
              <option value="all">All Countries (Documented & Unrecorded)</option>
              <option value={MISSING_COUNTRY_FILTER}>Not recorded in catalogue</option>
              {summaryData?.filterOptions.countries.map((c) => (
                <option key={c.label} value={c.label}>
                  {c.label} ({c.count.toLocaleString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active chart drill-down notice */}
        {(filters.century !== 'all' ||
          filters.medium !== 'all' ||
          filters.region !== 'all' ||
          filters.geographyType !== 'all') && (
          <div className="pt-2 border-t border-[#E8E0D2] flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#4A443C]">
            <span className="font-semibold text-[#755821]">Active chart drill-down:</span>
            {filters.century !== 'all' && (
              <button
                type="button"
                onClick={() => updateFilter({ century: 'all' })}
                className="underline hover:text-[#1C1917] cursor-pointer"
              >
                Century: {filters.century} ×
              </button>
            )}
            {filters.medium !== 'all' && (
              <button
                type="button"
                onClick={() => updateFilter({ medium: 'all' })}
                className="underline hover:text-[#1C1917] cursor-pointer"
              >
                Medium: {filters.medium} ×
              </button>
            )}
            {filters.region !== 'all' && (
              <button
                type="button"
                onClick={() => updateFilter({ region: 'all' })}
                className="underline hover:text-[#1C1917] cursor-pointer"
              >
                Region: {filters.region} ×
              </button>
            )}
            {filters.geographyType !== 'all' && (
              <button
                type="button"
                onClick={() => updateFilter({ geographyType: 'all' })}
                className="underline hover:text-[#1C1917] cursor-pointer"
              >
                Geography Type: {filters.geographyType} ×
              </button>
            )}
          </div>
        )}
      </section>

      {summaryError && (
        <div
          role="alert"
          className="rounded-xl bg-[#FDF2F2] border border-[#E5B4B4] p-4 text-sm text-[#8C2D2D] flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{summaryError}</span>
        </div>
      )}

      {!summaryData ? (
        <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-16 flex items-center justify-center gap-3 text-sm text-[#4A443C]">
          <Loader2 className="w-5 h-5 animate-spin text-[#96722D]" />
          Computing historical analytics from the 5,000-record dataset...
        </div>
      ) : (
        <>
          {/* Section 1: Historical Date Analysis */}
          <HistoricalDateSection
            summary={summaryData.dateAnalysis.summary}
            centuries={summaryData.dateAnalysis.centuries}
            timeline={summaryData.dateAnalysis.timeline}
            selectedPeriod={filters.period}
            selectedCentury={filters.century}
            onSelectPeriod={(period) => updateFilter({ period, century: 'all' })}
            onSelectCentury={(century) => updateFilter({ century })}
            onInspectObjectId={handleInspectObjectId}
          />

          {/* Section 2: Material Analysis */}
          <MaterialAnalysisSection
            summary={summaryData.materialAnalysis.summary}
            topMediums={summaryData.materialAnalysis.topMediums}
            categories={summaryData.materialAnalysis.categories}
            materialVsPeriod={summaryData.materialAnalysis.materialVsPeriod}
            selectedCategory={filters.materialCategory}
            selectedMedium={filters.medium}
            onSelectCategory={(materialCategory) =>
              updateFilter({ materialCategory, medium: 'all' })
            }
            onSelectMedium={(medium) => updateFilter({ medium })}
            onSelectPeriod={(period) => updateFilter({ period, century: 'all' })}
          />

          {/* Section 3: Geographical Analysis */}
          <GeographicalAnalysisSection
            summary={summaryData.geographicalAnalysis.summary}
            countries={summaryData.geographicalAnalysis.countries}
            regions={summaryData.geographicalAnalysis.regions}
            geographyTypes={summaryData.geographicalAnalysis.geographyTypes}
            selectedCountry={filters.country}
            selectedRegion={filters.region}
            selectedGeographyType={filters.geographyType}
            onSelectCountry={(country) => updateFilter({ country })}
            onSelectRegion={(region) => updateFilter({ region })}
            onSelectGeographyType={(geographyType) => updateFilter({ geographyType })}
          />

          {/* Section 4: Catalogue Data Completeness */}
          <DataCompletenessSection
            items={summaryData.dataCompleteness}
            totalRecords={summaryData.filteredTotal}
          />

          {/* Interactive Matching Catalogue Objects Drilldown */}
          <AnalyticsDrilldownPanel
            records={resolvedDrilldownRecords}
            totalMatching={objectsData?.totalMatching ?? summaryData.filteredTotal}
            page={objectsData?.page ?? 1}
            totalPages={objectsData?.totalPages ?? 1}
            pageSize={DRILLDOWN_PAGE_SIZE}
            isLoading={objectsLoading}
            selectionSummary={activeFilterSummary}
            onPageChange={setObjectsPage}
            onPreviewImage={onPreviewImage}
            onSelectDetails={onSelectDetails}
            onResetFilters={handleResetFilters}
            hasActiveFilters={hasActiveFilters}
            onOpenInExplorer={
              filters.country !== 'all' || filters.medium !== 'all'
                ? () =>
                    onOpenInExplorerWithFilter({
                      country: filters.country !== 'all' ? filters.country : undefined,
                      medium: filters.medium !== 'all' ? filters.medium : undefined,
                    })
                : undefined
            }
          />
        </>
      )}
    </div>
  );
};
