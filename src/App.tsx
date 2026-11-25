/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CollectionOverview } from './components/CollectionOverview';
import { SearchFilters, MISSING_GEOGRAPHY_FILTER } from './components/SearchFilters';
import { ObjectCard } from './components/ObjectCard';
import { ObjectDetailModal } from './components/ObjectDetailModal';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { ComingSoonView } from './components/ComingSoonView';
import { DatasetLoadingState } from './components/DatasetLoadingState';
import { HistoricalAnalyticsPage } from './components/analytics/HistoricalAnalyticsPage';
import { MISSING_COUNTRY_FILTER } from './components/analytics/GeographicalAnalysisSection';
import { AIStorytellerPage } from './components/storyteller/AIStorytellerPage';
import { VisualStoryStudioPage } from './components/visual/VisualStoryStudioPage';
import { MuseumRecord, ActiveTab, DatasetLoadStatus } from './types/museum';
import type { StoryConversationTurn, StoryResponsePayload } from './types/storyteller';
import { calculateDatasetStats } from './utils/csvParser';
import { isPublicDomainPermitted } from './utils/imagePolicy';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 24;

interface ResolvedImageEntry {
  primaryImage: string;
  primaryImageSmall: string;
  checked: boolean;
}

const INITIAL_STATUS: DatasetLoadStatus = {
  stage: 'connecting',
  message: 'Connecting to The Met dataset.',
  progressPercent: 2,
  bytesDownloaded: 0,
  totalBytes: null,
  rowsProcessed: 0,
  uniqueRecordsScanned: 0,
  selectedCount: 0,
  seed: 223,
  sourceUrl: 'https://media.githubusercontent.com/media/metmuseum/openaccess/master/MetObjects.csv',
  cachedOnDisk: false,
  loadedAt: null,
  error: null,
};

export default function App() {
  const [records, setRecords] = useState<MuseumRecord[]>([]);
  const [datasetStatus, setDatasetStatus] = useState<DatasetLoadStatus>(INITIAL_STATUS);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  // Per-objectID resolved official Met images (strictly keyed by objectID)
  const [imageMap, setImageMap] = useState<Record<string, ResolvedImageEntry>>({});
  const requestedImageIdsRef = useRef<Set<string>>(new Set());

  const [activeTab, setActiveTab] = useState<ActiveTab>('explorer');

  // Store complete selected MuseumRecord objects (never array indices)
  const [detailRecord, setDetailRecord] = useState<MuseumRecord | null>(null);
  const [previewImageRecord, setPreviewImageRecord] = useState<MuseumRecord | null>(null);

  // Shared Module 3 & Module 4 session state so users can seamlessly turn AI responses into Visual Stories
  const [storytellerTurns, setStorytellerTurns] = useState<StoryConversationTurn[]>([]);
  const [pendingVisualStorySource, setPendingVisualStorySource] =
    useState<StoryResponsePayload | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedMedium, setSelectedMedium] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedCulture, setSelectedCulture] = useState('all');
  const [selectedGeography, setSelectedGeography] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  const fetchProcessedRecords = useCallback(async () => {
    const res = await fetch('/api/dataset/records');
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status} while loading processed records.`);
    }
    const payload = (await res.json()) as {
      ready?: boolean;
      status?: DatasetLoadStatus;
      records?: MuseumRecord[];
    };

    if (payload.ready && Array.isArray(payload.records)) {
      const preloadedImages: Record<string, ResolvedImageEntry> = {};
      for (const r of payload.records) {
        if (r.imageChecked || r.primaryImage || r.primaryImageSmall) {
          preloadedImages[String(r.objectID)] = {
            primaryImage: r.primaryImage || '',
            primaryImageSmall: r.primaryImageSmall || '',
            checked: Boolean(r.imageChecked || r.primaryImage || r.primaryImageSmall),
          };
        }
      }
      setImageMap(preloadedImages);
      setRecords(payload.records);
      if (payload.status) {
        setDatasetStatus({
          ...payload.status,
          selectedCount: payload.records.length,
        });
      }
      return true;
    }
    return false;
  }, []);

  // Poll automatic backend dataset pipeline until ready or error
  useEffect(() => {
    let cancelled = false;
    let pollTimer: number | null = null;

    const pollStatus = async () => {
      try {
        const res = await fetch('/api/dataset/status');
        if (!res.ok) {
          throw new Error(`Unable to reach MuseumLens dataset service (HTTP ${res.status}).`);
        }
        const nextStatus = (await res.json()) as DatasetLoadStatus;
        if (cancelled) return;

        setDatasetStatus(nextStatus);

        if (nextStatus.stage === 'ready') {
          const loaded = await fetchProcessedRecords();
          if (cancelled) return;
          if (!loaded) {
            pollTimer = window.setTimeout(pollStatus, 700);
          }
          return;
        }

        if (nextStatus.stage === 'error') {
          return;
        }

        pollTimer = window.setTimeout(pollStatus, 700);
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Unable to connect to dataset service.';
        setDatasetStatus((prev) => ({
          ...prev,
          stage: 'error',
          message: 'Dataset retrieval failed.',
          error: message,
        }));
      }
    };

    pollStatus();

    return () => {
      cancelled = true;
      if (pollTimer !== null) {
        window.clearTimeout(pollTimer);
      }
    };
  }, [fetchProcessedRecords, retryNonce]);

  const handleRetryDataset = useCallback(async () => {
    setIsRetrying(true);
    requestedImageIdsRef.current.clear();
    try {
      const res = await fetch('/api/dataset/retry', { method: 'POST' });
      if (res.ok) {
        const status = (await res.json()) as DatasetLoadStatus;
        setDatasetStatus(status);
        setRetryNonce((n) => n + 1);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Retry request failed.';
      setDatasetStatus((prev) => ({
        ...prev,
        stage: 'error',
        message: 'Dataset retrieval failed.',
        error: message,
      }));
    } finally {
      setIsRetrying(false);
    }
  }, []);

  const stats = useMemo(() => calculateDatasetStats(records), [records]);

  const filteredRecords = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return records.filter((r) => {
      const matchSearch =
        query === '' ||
        r.title.toLowerCase().includes(query) ||
        String(r.objectID).toLowerCase().includes(query) ||
        r.accessionNumber.toLowerCase().includes(query) ||
        r.objectName.toLowerCase().includes(query);

      const matchDepartment =
        selectedDepartment === 'all' || r.department.trim() === selectedDepartment;
      const matchMedium = selectedMedium === 'all' || r.medium.trim() === selectedMedium;
      const matchPeriod =
        selectedPeriod === 'all' ||
        r.period.trim() === selectedPeriod ||
        r.objectDate.trim() === selectedPeriod;
      const matchCulture = selectedCulture === 'all' || r.culture.trim() === selectedCulture;

      let matchGeography = true;
      if (selectedGeography === MISSING_GEOGRAPHY_FILTER) {
        matchGeography = !r.country.trim() && !r.region.trim() && !r.city.trim();
      } else if (selectedGeography !== 'all') {
        matchGeography =
          r.country.trim() === selectedGeography || r.region.trim() === selectedGeography;
      }

      return (
        matchSearch &&
        matchDepartment &&
        matchMedium &&
        matchPeriod &&
        matchCulture &&
        matchGeography
      );
    });
  }, [
    records,
    searchTerm,
    selectedDepartment,
    selectedMedium,
    selectedPeriod,
    selectedCulture,
    selectedGeography,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    records,
    searchTerm,
    selectedDepartment,
    selectedMedium,
    selectedPeriod,
    selectedCulture,
    selectedGeography,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedBaseRecords = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, safePage]);

  // Reusable per-objectID official Met photograph resolver (shared by Module 1 and Module 2)
  const requestImagesForRecords = useCallback(
    (targetRecords: MuseumRecord[]) => {
      if (datasetStatus.stage !== 'ready' || targetRecords.length === 0) return;

      const pendingIds: string[] = [];
      for (const r of targetRecords) {
        const idStr = String(r.objectID);
        if (!isPublicDomainPermitted(r.isPublicDomain)) continue;
        const cached = imageMap[idStr];
        if (cached?.checked || r.primaryImage || r.primaryImageSmall) continue;
        if (requestedImageIdsRef.current.has(idStr)) continue;
        pendingIds.push(idStr);
      }

      if (pendingIds.length === 0) return;

      pendingIds.forEach((id) => requestedImageIdsRef.current.add(id));

      fetch('/api/dataset/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectIds: pendingIds }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { images?: Record<string, ResolvedImageEntry> } | null) => {
          if (!data?.images) return;
          setImageMap((prev) => ({ ...prev, ...data.images }));
        })
        .catch(() => {
          pendingIds.forEach((id) => requestedImageIdsRef.current.delete(id));
        });
    },
    [datasetStatus.stage, imageMap]
  );

  useEffect(() => {
    requestImagesForRecords(paginatedBaseRecords);
  }, [paginatedBaseRecords, requestImagesForRecords]);

  const attachResolvedImage = useCallback(
    (rec: MuseumRecord): MuseumRecord => {
      const entry = imageMap[String(rec.objectID)];
      if (!entry) return rec;
      return {
        ...rec,
        primaryImage: rec.primaryImage || entry.primaryImage,
        primaryImageSmall: rec.primaryImageSmall || entry.primaryImageSmall,
        imageChecked: rec.imageChecked || entry.checked,
      };
    },
    [imageMap]
  );

  const paginatedRecords = useMemo(
    () => paginatedBaseRecords.map(attachResolvedImage),
    [paginatedBaseRecords, attachResolvedImage]
  );

  const activePreviewRecord = useMemo(
    () => (previewImageRecord ? attachResolvedImage(previewImageRecord) : null),
    [previewImageRecord, attachResolvedImage]
  );

  const activeDetailRecord = useMemo(
    () => (detailRecord ? attachResolvedImage(detailRecord) : null),
    [detailRecord, attachResolvedImage]
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('all');
    setSelectedMedium('all');
    setSelectedPeriod('all');
    setSelectedCulture('all');
    setSelectedGeography('all');
  };

  const handleQuickSearch = (val: string) => {
    setSearchTerm(val);
    if (activeTab !== 'explorer') {
      setActiveTab('explorer');
    }
  };

  const handleOpenInExplorerWithFilter = useCallback(
    (opts: { country?: string; medium?: string }) => {
      setSearchTerm('');
      setSelectedDepartment('all');
      setSelectedPeriod('all');
      setSelectedCulture('all');
      setSelectedMedium(opts.medium || 'all');
      if (opts.country === MISSING_COUNTRY_FILTER) {
        setSelectedGeography(MISSING_GEOGRAPHY_FILTER);
      } else {
        setSelectedGeography(opts.country || 'all');
      }
      setActiveTab('explorer');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const handleCreateVisualStoryFromResponse = useCallback((response: StoryResponsePayload) => {
    setPendingVisualStorySource(response);
    setActiveTab('visual');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleClearPendingVisualSource = useCallback(() => {
    setPendingVisualStorySource(null);
  }, []);

  const isDatasetReady = datasetStatus.stage === 'ready' && records.length > 0;

  return (
    <div className="min-h-screen bg-[#141311] text-[#F5F0E6] flex flex-col font-sans antialiased">
      <Header
        records={records}
        datasetStatus={datasetStatus}
        searchTerm={searchTerm}
        onQuickSearch={handleQuickSearch}
        onRetryDataset={handleRetryDataset}
      />

      <div className="flex flex-col md:flex-row flex-1">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          recordCount={records.length}
        />

        <main className="flex-1 bg-[#1D1B18] p-5 sm:p-7 lg:p-8 min-w-0">
          <div className="max-w-[1380px] mx-auto">
            {activeTab === 'overview' && (
              <CollectionOverview
                stats={stats}
                datasetStatus={datasetStatus}
                onExploreClick={() => setActiveTab('explorer')}
                onRetryDataset={handleRetryDataset}
                isRetrying={isRetrying}
              />
            )}

            {activeTab === 'explorer' && (
              <div className="space-y-6">
                {/* Explorer Title Bar */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#2E2A25]">
                  <div>
                    <div className="text-xs font-mono text-[#D1B06B] uppercase tracking-wider">
                      {isDatasetReady
                        ? `MuseumLens Dataset – ${records.length.toLocaleString()} Records Loaded`
                        : datasetStatus.message}
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-[#FCFAF5] mt-1">
                      Collection Explorer
                    </h2>
                  </div>

                  {isDatasetReady && (
                    <div className="text-xs font-mono text-[#A69E92] tabular-nums">
                      Met Open Access · Reservoir Seed {datasetStatus.seed}
                    </div>
                  )}
                </div>

                {!isDatasetReady ? (
                  <DatasetLoadingState
                    status={datasetStatus}
                    onRetry={handleRetryDataset}
                    isRetrying={isRetrying}
                  />
                ) : (
                  <>
                    {/* Collection Overview Statistics Strip (calculated strictly from the 5,000 selected records) */}
                    <section
                      aria-label="Loaded collection statistics"
                      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5"
                    >
                      <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl px-4 py-3.5 text-[#1C1917]">
                        <div className="text-xs font-medium text-[#6B6357]">Total Selected</div>
                        <div className="text-2xl font-serif font-semibold tabular-nums mt-1">
                          {stats.totalObjects.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl px-4 py-3.5 text-[#1C1917]">
                        <div className="text-xs font-medium text-[#6B6357]">Recorded Dates</div>
                        <div className="text-2xl font-serif font-semibold tabular-nums mt-1">
                          {stats.withDates.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl px-4 py-3.5 text-[#1C1917]">
                        <div className="text-xs font-medium text-[#6B6357]">Material Info</div>
                        <div className="text-2xl font-serif font-semibold tabular-nums mt-1">
                          {stats.withMaterials.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl px-4 py-3.5 text-[#1C1917]">
                        <div className="text-xs font-medium text-[#6B6357]">
                          Documented Geography
                        </div>
                        <div className="text-2xl font-serif font-semibold tabular-nums mt-1">
                          {stats.withGeography.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl px-4 py-3.5 text-[#1C1917] col-span-2 sm:col-span-1">
                        <div className="text-xs font-medium text-[#6B6357]">Missing Geography</div>
                        <div className="text-2xl font-serif font-semibold text-[#8A6326] tabular-nums mt-1">
                          {stats.missingGeography.toLocaleString()}
                        </div>
                      </div>
                    </section>

                    <SearchFilters
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      selectedDepartment={selectedDepartment}
                      setSelectedDepartment={setSelectedDepartment}
                      selectedMedium={selectedMedium}
                      setSelectedMedium={setSelectedMedium}
                      selectedPeriod={selectedPeriod}
                      setSelectedPeriod={setSelectedPeriod}
                      selectedCulture={selectedCulture}
                      setSelectedCulture={setSelectedCulture}
                      selectedGeography={selectedGeography}
                      setSelectedGeography={setSelectedGeography}
                      records={records}
                      filteredCount={filteredRecords.length}
                      onResetFilters={handleResetFilters}
                    />

                    {filteredRecords.length === 0 ? (
                      <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-12 text-center text-[#4A443C] space-y-3">
                        <p className="text-lg font-serif font-semibold text-[#1C1917]">
                          No matching museum records found
                        </p>
                        <p className="text-sm text-[#6B6357]">
                          Adjust your search query or reset active filters to view available
                          catalogue entries.
                        </p>
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-2 px-4 py-2 rounded-lg bg-[#1B1917] hover:bg-[#2F2B26] text-[#FCFAF5] text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Reset All Filters
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Three-column desktop collection grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                          {paginatedRecords.map((record) => (
                            <ObjectCard
                              key={record.recordKey}
                              record={record}
                              onPreviewImage={setPreviewImageRecord}
                              onSelectDetails={setDetailRecord}
                            />
                          ))}
                        </div>

                        {/* Pagination controls */}
                        {totalPages > 1 && (
                          <nav
                            aria-label="Collection pagination"
                            className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#2E2A25]"
                          >
                            <div className="text-xs font-mono text-[#B8B0A4] tabular-nums">
                              Showing{' '}
                              {((safePage - 1) * PAGE_SIZE + 1).toLocaleString()}–
                              {Math.min(
                                safePage * PAGE_SIZE,
                                filteredRecords.length
                              ).toLocaleString()}{' '}
                              of {filteredRecords.length.toLocaleString()} records
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setCurrentPage((p) => Math.max(1, p - 1));
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                disabled={safePage <= 1}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#38342F] bg-[#24201C] text-xs font-medium text-[#F5F0E6] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2E2924] transition-colors cursor-pointer"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                                Previous
                              </button>

                              <span className="px-3 text-xs font-mono text-[#D1B06B] tabular-nums">
                                Page {safePage} of {totalPages}
                              </span>

                              <button
                                type="button"
                                onClick={() => {
                                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                disabled={safePage >= totalPages}
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
                  </>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <HistoricalAnalyticsPage
                datasetStatus={datasetStatus}
                allRecords={records}
                onRetryDataset={handleRetryDataset}
                isRetrying={isRetrying}
                onPreviewImage={setPreviewImageRecord}
                onSelectDetails={setDetailRecord}
                attachResolvedImage={attachResolvedImage}
                onRequestImagesForRecords={requestImagesForRecords}
                onOpenInExplorerWithFilter={handleOpenInExplorerWithFilter}
              />
            )}

            {activeTab === 'storyteller' && (
              <AIStorytellerPage
                datasetStatus={datasetStatus}
                allRecords={records}
                turns={storytellerTurns}
                setTurns={setStorytellerTurns}
                onCreateVisualStory={handleCreateVisualStoryFromResponse}
                onRetryDataset={handleRetryDataset}
                isRetrying={isRetrying}
                onSelectDetails={setDetailRecord}
                onRequestImagesForRecords={requestImagesForRecords}
              />
            )}

            {activeTab === 'visual' && (
              <VisualStoryStudioPage
                datasetStatus={datasetStatus}
                allRecords={records}
                storytellerTurns={storytellerTurns}
                pendingSourceResponse={pendingVisualStorySource}
                onClearPendingSource={handleClearPendingVisualSource}
                onReturnToStoryteller={() => setActiveTab('storyteller')}
                onRetryDataset={handleRetryDataset}
                isRetrying={isRetrying}
                onPreviewImage={setPreviewImageRecord}
                onSelectDetails={setDetailRecord}
                attachResolvedImage={attachResolvedImage}
                onRequestImagesForRecords={requestImagesForRecords}
              />
            )}

            {activeTab !== 'overview' &&
              activeTab !== 'explorer' &&
              activeTab !== 'analytics' &&
              activeTab !== 'storyteller' &&
              activeTab !== 'visual' && (
                <ComingSoonView
                  tab={activeTab}
                  onNavigateToExplorer={() => setActiveTab('explorer')}
                />
              )}
          </div>
        </main>
      </div>

      {activePreviewRecord && (
        <ImagePreviewModal
          key={`preview-modal-${activePreviewRecord.recordKey}`}
          record={activePreviewRecord}
          onClose={() => setPreviewImageRecord(null)}
          onOpenDetails={(rec) => setDetailRecord(rec)}
        />
      )}

      {activeDetailRecord && (
        <ObjectDetailModal
          key={`detail-modal-${activeDetailRecord.recordKey}`}
          record={activeDetailRecord}
          onClose={() => setDetailRecord(null)}
          onOpenImagePreview={(rec) => setPreviewImageRecord(rec)}
        />
      )}
    </div>
  );
}
