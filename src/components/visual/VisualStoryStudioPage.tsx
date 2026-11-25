import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Eye,
  Film,
  Layers,
  Loader2,
  Play,
  PlusCircle,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import type { AnalyticsFiltersState, AnalyticsObjectsResponse } from '../../types/analytics';
import type { DatasetLoadStatus, MuseumRecord } from '../../types/museum';
import type { StoryConversationTurn, StoryResponsePayload } from '../../types/storyteller';
import type { VisualStoryPayload } from '../../types/visualStory';
import { DatasetLoadingState } from '../DatasetLoadingState';
import { ObjectCard } from '../ObjectCard';
import { VisualStoryCharts, ChartDrilldownRequest } from './VisualStoryCharts';
import { VisualStoryPlayer } from './VisualStoryPlayer';

interface VisualStoryStudioPageProps {
  datasetStatus: DatasetLoadStatus;
  allRecords: MuseumRecord[];
  storytellerTurns: StoryConversationTurn[];
  pendingSourceResponse: StoryResponsePayload | null;
  onClearPendingSource: () => void;
  onReturnToStoryteller: () => void;
  onRetryDataset: () => void;
  isRetrying: boolean;
  onPreviewImage: (record: MuseumRecord) => void;
  onSelectDetails: (record: MuseumRecord) => void;
  attachResolvedImage: (record: MuseumRecord) => MuseumRecord;
  onRequestImagesForRecords: (records: MuseumRecord[]) => void;
}

type StudioMode = 'create' | 'watch';

const STORY_STARTERS: { label: string; category: string; question: string }[] = [
  {
    label: 'Historical Date Patterns',
    category: 'Chronology',
    question: 'How are objects distributed across historical centuries and periods in the collection?',
  },
  {
    label: 'Material Distribution',
    category: 'Materials',
    question: 'Which materials and mediums are most frequently recorded in the collection?',
  },
  {
    label: 'Documented Geographical Regions',
    category: 'Geography',
    question: 'How are objects distributed across documented countries, regions, and geography types?',
  },
  {
    label: 'Materials Across Historical Periods',
    category: 'Combined Story',
    question: 'Compare the recorded material distribution across two historical periods.',
  },
];

function isSafeExternalUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const VisualStoryStudioPage: React.FC<VisualStoryStudioPageProps> = ({
  datasetStatus,
  allRecords,
  storytellerTurns,
  pendingSourceResponse,
  onClearPendingSource,
  onReturnToStoryteller,
  onRetryDataset,
  isRetrying,
  onPreviewImage,
  onSelectDetails,
  attachResolvedImage,
  onRequestImagesForRecords,
}) => {
  const [studioMode, setStudioMode] = useState<StudioMode>('create');
  const [questionInput, setQuestionInput] = useState('');
  const [activeStory, setActiveStory] = useState<VisualStoryPayload | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [lastRequestParams, setLastRequestParams] = useState<{
    question: string;
    sourceMode: 'question' | 'storyteller_response';
    sourceTurnId: string | null;
    sourceAnswerContext: string | null;
  } | null>(null);

  // Interactive chart click drill-down state (powered by backend /api/analytics/objects)
  const [drilldownSelection, setDrilldownSelection] = useState<{
    filters: AnalyticsFiltersState;
    label: string;
    page: number;
  } | null>(null);
  const [drilldownData, setDrilldownData] = useState<AnalyticsObjectsResponse | null>(null);
  const [isDrilldownLoading, setIsDrilldownLoading] = useState(false);
  const [drilldownError, setDrilldownError] = useState<string | null>(null);

  const playerTopRef = useRef<HTMLDivElement | null>(null);
  const objectsSectionRef = useRef<HTMLElement | null>(null);
  const referencesSectionRef = useRef<HTMLElement | null>(null);
  const drilldownSectionRef = useRef<HTMLDivElement | null>(null);

  const isDatasetReady = datasetStatus.stage === 'ready' && allRecords.length > 0;

  const recordsById = useMemo(() => {
    const map = new Map<string, MuseumRecord>();
    for (const r of allRecords) {
      map.set(String(r.objectID), r);
    }
    return map;
  }, [allRecords]);

  const availableStorytellerResponses = useMemo(() => {
    return storytellerTurns
      .filter(
        (t): t is StoryConversationTurn & { response: StoryResponsePayload } =>
          t.status === 'success' && Boolean(t.response) && !t.response!.outOfScope
      )
      .map((t) => t.response)
      .reverse();
  }, [storytellerTurns]);

  const generateStory = useCallback(
    async (opts: {
      question: string;
      sourceMode: 'question' | 'storyteller_response';
      sourceTurnId?: string | null;
      sourceAnswerContext?: string | null;
      regenerate?: boolean;
    }) => {
      const trimmed = opts.question.trim();
      if (!trimmed || !isDatasetReady || isGenerating) return;

      setIsGenerating(true);
      setGenerationError(null);
      setDrilldownSelection(null);
      setDrilldownData(null);
      setDrilldownError(null);
      setStudioMode('watch');

      const reqMeta = {
        question: trimmed,
        sourceMode: opts.sourceMode,
        sourceTurnId: opts.sourceTurnId ?? null,
        sourceAnswerContext: opts.sourceAnswerContext ?? null,
      };
      setLastRequestParams(reqMeta);

      try {
        const res = await fetch('/api/visual-story/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: trimmed,
            sourceMode: opts.sourceMode,
            sourceTurnId: opts.sourceTurnId ?? null,
            sourceAnswerContext: opts.sourceAnswerContext ?? null,
            regenerate: Boolean(opts.regenerate),
          }),
        });

        const payload = (await res.json().catch(() => null)) as
          | VisualStoryPayload
          | { error?: string; code?: string }
          | null;

        if (!res.ok) {
          const msg =
            payload && 'error' in payload && typeof payload.error === 'string'
              ? payload.error
              : `Unable to generate visual story (HTTP ${res.status}).`;
          setGenerationError(msg);
          return;
        }

        if (!payload || !('storyTitle' in payload)) {
          setGenerationError('The server returned an unexpected visual story structure.');
          return;
        }

        setActiveStory(payload);
        setQuestionInput(trimmed);
        setShowDetailedReport(false);
        setStudioMode('watch');
      } catch {
        setGenerationError(
          'Unable to reach the MuseumLens server. Check your connection and try again.'
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [isDatasetReady, isGenerating]
  );

  // Automatically generate when user clicked "Create Visual Story" from Module 3 (AI Storyteller)
  useEffect(() => {
    if (!pendingSourceResponse || !isDatasetReady || isGenerating) return;
    const context = `${pendingSourceResponse.directAnswer} ${pendingSourceResponse.dataBasedExplanation}`.slice(
      0,
      900
    );
    const target = pendingSourceResponse;
    onClearPendingSource();
    generateStory({
      question: target.question,
      sourceMode: 'storyteller_response',
      sourceTurnId: target.id,
      sourceAnswerContext: context,
    });
  }, [pendingSourceResponse, isDatasetReady, isGenerating, onClearPendingSource, generateStory]);

  // Pre-resolve official Met photographs strictly by objectID for ALL scenes & featured objects
  useEffect(() => {
    if (!activeStory || !isDatasetReady) return;
    const seen = new Set<string>();
    const toResolve: MuseumRecord[] = [];
    const addId = (id: string | number) => {
      const idStr = String(id);
      if (seen.has(idStr)) return;
      seen.add(idStr);
      const rec = recordsById.get(idStr);
      if (rec) toResolve.push(rec);
    };

    for (const sc of activeStory.scenes) {
      sc.objectIds.forEach(addId);
    }
    for (const obj of activeStory.featuredObjects) {
      addId(obj.objectID);
    }
    for (const ref of activeStory.catalogueReferences) {
      addId(ref.objectID);
    }

    if (toResolve.length > 0) {
      onRequestImagesForRecords(toResolve);
    }
  }, [activeStory, isDatasetReady, recordsById, onRequestImagesForRecords]);

  const featuredMuseumRecords = useMemo(() => {
    if (!activeStory) return [];
    const list: MuseumRecord[] = [];
    for (const item of activeStory.featuredObjects) {
      const rec = recordsById.get(String(item.objectID));
      if (rec) list.push(attachResolvedImage(rec));
    }
    return list;
  }, [activeStory, recordsById, attachResolvedImage]);

  // Fetch matching objects via backend /api/analytics/objects whenever a user clicks any chart element
  useEffect(() => {
    if (!drilldownSelection || !isDatasetReady) return;
    let cancelled = false;
    setIsDrilldownLoading(true);
    setDrilldownError(null);

    const params = new URLSearchParams();
    const f = drilldownSelection.filters;
    if (f.period && f.period !== 'all') params.set('period', f.period);
    if (f.century && f.century !== 'all') params.set('century', f.century);
    if (f.materialCategory && f.materialCategory !== 'all') {
      params.set('materialCategory', f.materialCategory);
    }
    if (f.medium && f.medium !== 'all') params.set('medium', f.medium);
    if (f.country && f.country !== 'all') params.set('country', f.country);
    if (f.region && f.region !== 'all') params.set('region', f.region);
    if (f.geographyType && f.geographyType !== 'all') {
      params.set('geographyType', f.geographyType);
    }
    params.set('page', String(drilldownSelection.page));
    params.set('pageSize', '6');

    fetch(`/api/analytics/objects?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
        return res.json();
      })
      .then((data: AnalyticsObjectsResponse & { ready?: boolean }) => {
        if (cancelled) return;
        setDrilldownData(data);
        if (Array.isArray(data.records) && data.records.length > 0) {
          onRequestImagesForRecords(data.records);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setDrilldownError(
          err instanceof Error ? err.message : 'Unable to load matching catalogue objects.'
        );
      })
      .finally(() => {
        if (!cancelled) setIsDrilldownLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [drilldownSelection, isDatasetReady, onRequestImagesForRecords]);

  const drilldownResolvedRecords = useMemo(() => {
    if (!drilldownData?.records) return [];
    return drilldownData.records.map(attachResolvedImage);
  }, [drilldownData, attachResolvedImage]);

  const referencesById = useMemo(() => {
    const map = new Map<string, VisualStoryPayload['catalogueReferences'][number]>();
    if (!activeStory) return map;
    for (const ref of activeStory.catalogueReferences) {
      map.set(String(ref.objectID), ref);
    }
    for (const obj of activeStory.featuredObjects) {
      if (!map.has(String(obj.objectID))) {
        map.set(String(obj.objectID), obj);
      }
    }
    return map;
  }, [activeStory]);

  const handleInspectChartSlice = useCallback(
    (req: ChartDrilldownRequest) => {
      if (!activeStory) return;
      const mergedFilters: AnalyticsFiltersState = {
        ...activeStory.appliedFilters,
        ...req.filterPatch,
      };
      setDrilldownSelection({
        filters: mergedFilters,
        label: req.selectionLabel,
        page: 1,
      });
      window.setTimeout(() => {
        drilldownSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    },
    [activeStory]
  );

  const handleInspectObjectById = useCallback(
    (objectId: string) => {
      const rec = recordsById.get(String(objectId));
      if (rec) {
        onRequestImagesForRecords([rec]);
        onSelectDetails(rec);
      }
    },
    [recordsById, onRequestImagesForRecords, onSelectDetails]
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateStory({
      question: questionInput,
      sourceMode: 'question',
    });
  };

  const handleRegenerate = () => {
    if (!activeStory || isGenerating) return;
    generateStory({
      question: lastRequestParams?.question || activeStory.question,
      sourceMode: lastRequestParams?.sourceMode || activeStory.sourceMode,
      sourceTurnId: lastRequestParams?.sourceTurnId ?? activeStory.sourceTurnId,
      sourceAnswerContext: lastRequestParams?.sourceAnswerContext ?? null,
      regenerate: true,
    });
  };

  const handleClearStory = () => {
    if (isGenerating) return;
    setActiveStory(null);
    setGenerationError(null);
    setDrilldownSelection(null);
    setDrilldownData(null);
    setDrilldownError(null);
    setShowDetailedReport(false);
    setStudioMode('create');
  };

  const handleJumpToReferences = () => {
    setShowDetailedReport(true);
    window.setTimeout(() => {
      referencesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 90);
  };

  const handleJumpToObjects = () => {
    setShowDetailedReport(true);
    window.setTimeout(() => {
      objectsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 90);
  };

  const handleBackToPlayer = () => {
    playerTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-6">
      {/* Page Header + Clear Create Story / Watch Story Mode Switch */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-[#2E2A25]">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#D1B06B] uppercase tracking-wider">
            Module 4 · Playable Museum Documentary
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-[#FCFAF5]">
            Visual Story Studio
          </h2>
          <p className="text-sm text-[#B8B0A4] max-w-2xl leading-relaxed">
            Explore museum collection patterns through interactive data stories.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Two Clear Studio Modes: A. Create Story | B. Watch Story */}
          <div
            role="tablist"
            aria-label="Visual Story Studio modes"
            className="inline-flex items-center p-1 rounded-lg bg-[#161412] border border-[#2F2A24]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={studioMode === 'create'}
              onClick={() => setStudioMode('create')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                studioMode === 'create'
                  ? 'bg-[#FCFAF5] text-[#141311]'
                  : 'text-[#B8B0A4] hover:text-[#FCFAF5]'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Create Story
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={studioMode === 'watch'}
              disabled={!activeStory && !isGenerating}
              onClick={() => setStudioMode('watch')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                studioMode === 'watch'
                  ? 'bg-[#D1B06B] text-[#141311]'
                  : 'text-[#B8B0A4] hover:text-[#FCFAF5]'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              Watch Story
            </button>
          </div>

          <button
            type="button"
            onClick={onReturnToStoryteller}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#3B352D] bg-[#24201C] hover:bg-[#2F2A24] text-xs font-medium text-[#E8E0D4] transition-colors whitespace-nowrap cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#D1B06B]" />
            Return to AI Storyteller
          </button>

          {activeStory && (
            <button
              type="button"
              onClick={handleClearStory}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#3B352D] bg-[#24201C] hover:bg-[#2F2A24] text-xs font-medium text-[#E8E0D4] disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#D1B06B]" />
              Clear Current Story
            </button>
          )}
        </div>
      </div>

      {!isDatasetReady ? (
        <DatasetLoadingState
          status={datasetStatus}
          onRetry={onRetryDataset}
          isRetrying={isRetrying}
        />
      ) : studioMode === 'create' ? (
        /* ==================== MODE A: CREATE STORY ==================== */
        <div className="space-y-6">
          <section
            aria-label="Create a playable visual story"
            className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
          >
            {/* Create from a Question */}
            <div className="lg:col-span-7 bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-6 text-[#1C1917] flex flex-col justify-between gap-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="visual-story-question"
                    className="text-xs font-semibold uppercase tracking-wider text-[#6B6357]"
                  >
                    Create a Playable Story From a Question
                  </label>
                  <span className="text-[11px] font-mono text-[#857C70] tabular-nums">
                    {questionInput.length}/600
                  </span>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-3">
                  <textarea
                    id="visual-story-question"
                    rows={3}
                    maxLength={600}
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    disabled={isGenerating}
                    placeholder="Ask about historical centuries, recorded materials, documented geographical regions, or compare two historical periods..."
                    className="w-full resize-none rounded-lg border border-[#D4C9B8] bg-white px-4 py-3 text-sm text-[#1C1917] placeholder:text-[#8E8579] focus:outline-none focus:border-[#9E7B38] focus:ring-2 focus:ring-[#B89248]/20 disabled:opacity-60"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[11px] text-[#756D62]">
                      Generates a 5–7 scene documentary player grounded in the 5,000-record dataset
                    </span>
                    <button
                      type="submit"
                      disabled={isGenerating || questionInput.trim().length === 0}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#1B1917] hover:bg-[#2F2B26] text-[#FCFAF5] text-xs sm:text-sm font-semibold transition-colors disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                    >
                      <Play className="w-4 h-4 text-[#D1B06B] fill-current" />
                      Generate Visual Story
                    </button>
                  </div>
                </form>
              </div>

              <div className="pt-4 border-t border-[#EAE2D3] space-y-2.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#756D62]">
                  Suggested Collection Stories
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STORY_STARTERS.map((starter) => (
                    <button
                      key={starter.label}
                      type="button"
                      disabled={isGenerating}
                      onClick={() =>
                        generateStory({
                          question: starter.question,
                          sourceMode: 'question',
                        })
                      }
                      className="group text-left px-3.5 py-3 rounded-lg border border-[#E2D9C8] bg-[#F7F3EA] hover:bg-[#EFE7D7] hover:border-[#B89248] transition-colors flex items-start justify-between gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-mono text-[#755821]">
                          {starter.category}
                        </div>
                        <div className="text-xs font-semibold text-[#1C1917] truncate">
                          {starter.label}
                        </div>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#8A6728] shrink-0 mt-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Create from Existing AI Storyteller Response */}
            <div className="lg:col-span-5 bg-[#23201C] border border-[#322E29] rounded-xl p-6 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#E5DDD0]">
                    Transform an AI Storyteller Response
                  </span>
                  <span className="text-[11px] font-mono text-[#9E9589] tabular-nums">
                    {availableStorytellerResponses.length} available
                  </span>
                </div>

                {availableStorytellerResponses.length === 0 ? (
                  <div className="rounded-lg border border-[#342F29] bg-[#1B1916] p-4 space-y-3">
                    <p className="text-xs text-[#C7BFB3] leading-relaxed">
                      Ask a question in <strong className="text-[#FCFAF5]">AI Storyteller</strong>{' '}
                      and return here—or click <strong className="text-[#FCFAF5]">Create Visual Story</strong>{' '}
                      directly on any verified answer—to play it as an animated museum story.
                    </p>
                    <button
                      type="button"
                      onClick={onReturnToStoryteller}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#463F35] bg-[#26221D] hover:bg-[#312C25] text-xs font-medium text-[#FCFAF5] transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#D1B06B]" />
                      Open AI Storyteller
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                    {availableStorytellerResponses.map((resp) => (
                      <button
                        key={resp.id}
                        type="button"
                        disabled={isGenerating}
                        onClick={() =>
                          generateStory({
                            question: resp.question,
                            sourceMode: 'storyteller_response',
                            sourceTurnId: resp.id,
                            sourceAnswerContext: `${resp.directAnswer} ${resp.dataBasedExplanation}`.slice(
                              0,
                              900
                            ),
                          })
                        }
                        className="w-full text-left px-3.5 py-2.5 rounded-lg border border-[#38332C] bg-[#1A1815] hover:bg-[#2A2520] hover:border-[#8C6D34] transition-colors space-y-1 disabled:opacity-50 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#D1B06B]">
                          <span>{resp.analyticalCategoryLabel}</span>
                          <span>Play as Story →</span>
                        </div>
                        <div className="text-xs font-medium text-[#F5F0E6] line-clamp-2 leading-snug">
                          {resp.question}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {activeStory && !activeStory.outOfScope && (
                <div className="pt-3 border-t border-[#322E29] flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#D1B06B]">
                      Current Story Ready
                    </div>
                    <div className="text-xs font-serif text-[#FCFAF5] truncate">
                      {activeStory.storyTitle}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStudioMode('watch')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#D1B06B] hover:bg-[#DEC07E] text-[#141311] text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5" />
                    Watch
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        /* ==================== MODE B: WATCH STORY ==================== */
        <div ref={playerTopRef} className="space-y-6">
          {/* Loading State */}
          {isGenerating && (
            <section className="bg-[#141311] border border-[#322C24] rounded-xl p-10 text-[#FCFAF5] flex flex-col items-center justify-center text-center gap-4 lg:aspect-video">
              <Loader2 className="w-8 h-8 animate-spin text-[#D1B06B]" />
              <div className="space-y-1.5 max-w-lg">
                <h3 className="text-xl font-serif font-semibold text-[#FCFAF5]">
                  Composing Playable Documentary Scenes…
                </h3>
                <p className="text-xs sm:text-sm text-[#B8B0A4] leading-relaxed">
                  Computing backend analytics over the 5,000 Met records, sequencing scenes,
                  resolving public-domain photographs by Object ID, and validating every figure and
                  catalogue reference.
                </p>
              </div>
            </section>
          )}

          {/* Error State (never fabricates a story) */}
          {!isGenerating && generationError && (
            <section className="bg-[#FCFAF5] border border-[#D8B4A6] rounded-xl p-6 text-[#1C1917] space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#9E3C2B] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-[#7A291B]">
                    Unable to generate playable visual story
                  </h3>
                  <p className="text-sm text-[#4D453D] leading-relaxed">{generationError}</p>
                </div>
              </div>
              <div className="pl-8 flex flex-wrap items-center gap-2.5">
                {lastRequestParams && (
                  <button
                    type="button"
                    onClick={() => generateStory(lastRequestParams)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1B1917] hover:bg-[#2F2B26] text-[#FCFAF5] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#D1B06B]" />
                    Retry Story Generation
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setStudioMode('create')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#D4C9B6] bg-white hover:bg-[#F7F3EA] text-xs font-medium text-[#1C1917] cursor-pointer"
                >
                  Back to Create Story
                </button>
              </div>
            </section>
          )}

          {/* Out-of-Scope Polite Notice */}
          {!isGenerating && activeStory && activeStory.outOfScope && (
            <section className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-8 text-[#1C1917] space-y-4">
              <div className="text-xs font-mono uppercase tracking-wider text-[#755821]">
                {activeStory.analyticalCategoryLabel}
              </div>
              <h3 className="text-2xl font-serif font-semibold text-[#1C1917]">
                {activeStory.storyTitle}
              </h3>
              <p className="text-sm text-[#38332D] leading-relaxed max-w-2xl">
                {activeStory.patternExplanation}
              </p>
              <button
                type="button"
                onClick={() => setStudioMode('create')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1B1917] hover:bg-[#2F2B26] text-[#FCFAF5] text-xs font-semibold cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#D1B06B]" />
                Choose a Collection Question
              </button>
            </section>
          )}

          {/* PRIMARY EXPERIENCE: Playable Cinematic 16:9 Documentary Player */}
          {!isGenerating && activeStory && !activeStory.outOfScope && (
            <>
              {/* Validation Caution Banner if any backend check flagged an item */}
              {!activeStory.validation.passed && activeStory.validation.notes.length > 0 && (
                <div className="rounded-xl border border-[#6E5324] bg-[#241E15] px-5 py-3.5 text-xs text-[#EEDBB8] space-y-1">
                  <div className="inline-flex items-center gap-1.5 font-semibold text-[#F5E4C3]">
                    <AlertTriangle className="w-4 h-4 text-[#D1B06B]" />
                    Backend Verification Notice
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[#D6C7AC]">
                    {activeStory.validation.notes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              <VisualStoryPlayer
                story={activeStory}
                recordsById={recordsById}
                attachResolvedImage={attachResolvedImage}
                onInspectObjectById={handleInspectObjectById}
                onInspectSlice={handleInspectChartSlice}
                onJumpToReferences={handleJumpToReferences}
              />

              {/* Compact Secondary Story Actions Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#221F1B] border border-[#322D26]">
                <div className="text-xs text-[#B8B0A4]">
                  <span className="font-medium text-[#FCFAF5]">{activeStory.storyTitle}</span>
                  <span className="mx-2 text-[#5E564C]">·</span>
                  <span className="font-mono text-[#D1B06B] tabular-nums">
                    {activeStory.scenes.length} scenes · {activeStory.totalDurationSeconds}s
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#3D362D] bg-[#191714] hover:bg-[#2A251F] text-xs font-medium text-[#E8E0D4] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#D1B06B]" />
                    Regenerate Story
                  </button>

                  <button
                    type="button"
                    onClick={handleJumpToObjects}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#3D362D] bg-[#191714] hover:bg-[#2A251F] text-xs font-medium text-[#E8E0D4] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#D1B06B]" />
                    View Supporting Objects
                  </button>

                  <button
                    type="button"
                    onClick={handleJumpToReferences}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#3D362D] bg-[#191714] hover:bg-[#2A251F] text-xs font-medium text-[#E8E0D4] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#D1B06B]" />
                    Open Catalogue Reference
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDetailedReport((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2E2922] hover:bg-[#3A332A] text-xs font-semibold text-[#FCFAF5] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#D1B06B]" />
                    {showDetailedReport ? 'Hide Detailed Report' : 'Detailed Evidence & Report'}
                    {showDetailedReport ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Live Interactive Chart Click Drill-Down Panel (triggered directly from player or report charts) */}
              {drilldownSelection && (
                <div
                  ref={drilldownSectionRef}
                  className="rounded-xl border border-[#CFC3AE] bg-[#F4EFE4] p-5 sm:p-6 text-[#1C1917] space-y-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#DFD5C3]">
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-[#755821]">
                        Interactive Chart Selection
                      </div>
                      <h4 className="text-lg font-serif font-semibold text-[#1C1917]">
                        {drilldownSelection.label}
                        {drilldownData
                          ? ` (${drilldownData.totalMatching.toLocaleString()} matching records)`
                          : ''}
                      </h4>
                      <p className="text-xs text-[#5C5449]">
                        Filtered directly from the 5,000-record dataset using Module 1 & 2 catalogue
                        filtering rules.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleBackToPlayer}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#D4C9B6] bg-white hover:bg-[#FAF6EE] text-xs font-medium text-[#1C1917] cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5 text-[#755821]" />
                        Return to Player
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDrilldownSelection(null);
                          setDrilldownData(null);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#D4C9B6] bg-white hover:bg-[#FAF6EE] text-xs font-medium text-[#1C1917] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Close
                      </button>
                    </div>
                  </div>

                  {isDrilldownLoading ? (
                    <div className="py-10 flex items-center justify-center gap-2.5 text-sm text-[#5C5449]">
                      <Loader2 className="w-4 h-4 animate-spin text-[#8A6728]" />
                      Loading matching catalogue objects…
                    </div>
                  ) : drilldownError ? (
                    <div className="text-sm text-[#8F2D1E] py-4">{drilldownError}</div>
                  ) : drilldownResolvedRecords.length === 0 ? (
                    <div className="text-sm text-[#5C5449] py-6 text-center">
                      No catalogue records matched this combined filter.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {drilldownResolvedRecords.map((record) => (
                          <ObjectCard
                            key={`story-drilldown-${record.recordKey}`}
                            record={record}
                            onPreviewImage={onPreviewImage}
                            onSelectDetails={onSelectDetails}
                          />
                        ))}
                      </div>

                      {drilldownData && drilldownData.totalPages > 1 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#DFD5C3]">
                          <div className="text-xs font-mono text-[#5C5449] tabular-nums">
                            Page {drilldownData.page} of {drilldownData.totalPages} ·{' '}
                            {drilldownData.totalMatching.toLocaleString()} objects
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={drilldownData.page <= 1}
                              onClick={() =>
                                setDrilldownSelection((prev) =>
                                  prev ? { ...prev, page: Math.max(1, prev.page - 1) } : null
                                )
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#D4C9B6] bg-white text-xs font-medium text-[#1C1917] disabled:opacity-40 cursor-pointer"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                              Previous
                            </button>
                            <button
                              type="button"
                              disabled={drilldownData.page >= drilldownData.totalPages}
                              onClick={() =>
                                setDrilldownSelection((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        page: Math.min(drilldownData.totalPages, prev.page + 1),
                                      }
                                    : null
                                )
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#D4C9B6] bg-white text-xs font-medium text-[#1C1917] disabled:opacity-40 cursor-pointer"
                            >
                              Next
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* SUPPLEMENTARY INFORMATION: Detailed Report & Catalogue Evidence (secondary below player) */}
              {showDetailedReport && (
                <section
                  aria-label="Supplementary detailed report and catalogue evidence"
                  className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl text-[#1C1917] overflow-hidden"
                >
                  <div className="px-6 sm:px-8 py-4 bg-[#F4EFE4] border-b border-[#E3DAC9] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-wider text-[#755821]">
                        Supplementary Curatorial Notes & Evidence
                      </div>
                      <h3 className="text-lg font-serif font-semibold text-[#1C1917]">
                        Detailed Data Breakdown & Catalogue References
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={handleBackToPlayer}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1B1917] hover:bg-[#2F2B26] text-[#FCFAF5] text-xs font-medium cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5 text-[#D1B06B]" />
                      Return to Story Player
                    </button>
                  </div>

                  <div className="px-6 sm:px-8 py-7 space-y-10">
                    {/* Introduction & Pattern Explanation */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      <div className="lg:col-span-7 space-y-4">
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-mono uppercase tracking-wider text-[#7D6639] font-semibold">
                            Story Overview
                          </h4>
                          <p className="text-sm text-[#2F2A24] leading-relaxed">
                            {activeStory.introduction}
                          </p>
                        </div>
                        <div className="space-y-1.5 pt-3 border-t border-[#EAE2D3]">
                          <h4 className="text-xs font-mono uppercase tracking-wider text-[#7D6639] font-semibold">
                            Detailed Pattern Explanation
                          </h4>
                          <p className="text-sm text-[#2F2A24] leading-relaxed whitespace-pre-line">
                            {activeStory.patternExplanation}
                          </p>
                        </div>
                      </div>

                      <div className="lg:col-span-5 space-y-4">
                        <div className="rounded-xl border border-[#E2D9C8] bg-[#F7F3EA] p-4 space-y-1.5">
                          <h4 className="text-xs font-mono uppercase tracking-wider text-[#7D6639] font-semibold">
                            Conclusion
                          </h4>
                          <p className="text-sm text-[#2F2A24] leading-relaxed">
                            {activeStory.conclusion}
                          </p>
                        </div>

                        <div className="rounded-xl border border-[#E5DCCB] bg-[#F6F1E7] p-4 space-y-1.5">
                          <h4 className="text-xs font-mono uppercase tracking-wider text-[#7D6639] font-semibold">
                            Data Limitations & Unknown-Origin Safeguards
                          </h4>
                          <p className="text-xs text-[#575046] leading-relaxed">
                            {activeStory.dataLimitations}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Supplementary Interactive Recharts Figures */}
                    {activeStory.charts.length > 0 && (
                      <div className="space-y-5 pt-6 border-t border-[#E6DEC9]">
                        <h4 className="text-xs font-mono uppercase tracking-wider text-[#7D6639] font-semibold">
                          Full Interactive Charts
                        </h4>
                        <VisualStoryCharts
                          charts={activeStory.charts}
                          analyticsData={activeStory.analyticsData}
                          referencesById={referencesById}
                          activeSelectionLabel={drilldownSelection?.label ?? null}
                          onInspectSlice={handleInspectChartSlice}
                          onInspectObjectById={handleInspectObjectById}
                        />
                      </div>
                    )}

                    {/* Supporting Museum Objects Gallery */}
                    {featuredMuseumRecords.length > 0 && (
                      <section
                        ref={objectsSectionRef}
                        className="space-y-4 pt-6 border-t border-[#E6DEC9]"
                      >
                        <div className="flex flex-wrap items-end justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-mono uppercase tracking-wider text-[#7D6639] font-semibold">
                              Supporting Museum Objects
                            </h4>
                            <p className="text-xs text-[#6B6357] mt-1">
                              Public-domain official Met photographs mapped strictly by Object ID.
                            </p>
                          </div>
                          <span className="text-xs font-mono text-[#756D62] tabular-nums">
                            {featuredMuseumRecords.length} objects
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                          {featuredMuseumRecords.map((record) => (
                            <ObjectCard
                              key={`supp-gallery-${record.recordKey}`}
                              record={record}
                              onPreviewImage={onPreviewImage}
                              onSelectDetails={onSelectDetails}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Original Catalogue References */}
                    {activeStory.catalogueReferences.length > 0 && (
                      <section
                        ref={referencesSectionRef}
                        className="space-y-4 pt-6 border-t border-[#E6DEC9]"
                      >
                        <div className="flex flex-wrap items-end justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-mono uppercase tracking-wider text-[#7D6639] font-semibold">
                              Original Met Catalogue References
                            </h4>
                            <p className="text-xs text-[#6B6357] mt-1">
                              Direct catalogue records backing every scene and statistic in this
                              story.
                            </p>
                          </div>
                          <span className="text-xs font-mono text-[#756D62] tabular-nums">
                            {activeStory.catalogueReferences.length} verified records
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {activeStory.catalogueReferences.map((ref) => {
                            const hasRecord = recordsById.has(String(ref.objectID));
                            const validUrl = isSafeExternalUrl(ref.objectURL);

                            return (
                              <div
                                key={`supp-ref-card-${ref.objectID}`}
                                className="rounded-lg border border-[#DFD5C3] bg-white p-4 flex flex-col justify-between gap-3"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <h5 className="text-sm font-serif font-semibold text-[#1C1917] leading-snug">
                                      {ref.title || 'Untitled Object'}
                                    </h5>
                                    <span className="text-[11px] font-mono text-[#755821] tabular-nums shrink-0">
                                      ID {ref.objectID}
                                    </span>
                                  </div>

                                  <dl className="space-y-1 text-xs text-[#4A443C]">
                                    <div className="flex gap-1.5">
                                      <dt className="font-medium text-[#756D62] shrink-0">Date:</dt>
                                      <dd className="truncate">
                                        {ref.objectDate?.trim() || 'Not recorded in catalogue'}
                                      </dd>
                                    </div>
                                    <div className="flex gap-1.5">
                                      <dt className="font-medium text-[#756D62] shrink-0">
                                        Material:
                                      </dt>
                                      <dd className="line-clamp-2">
                                        {ref.medium?.trim() || 'Not recorded in catalogue'}
                                      </dd>
                                    </div>
                                    <div className="flex gap-1.5">
                                      <dt className="font-medium text-[#756D62] shrink-0">
                                        Geography:
                                      </dt>
                                      <dd
                                        className={
                                          ref.documentedGeography === 'Not recorded in catalogue'
                                            ? 'text-[#8A6326] italic'
                                            : ''
                                        }
                                      >
                                        {ref.documentedGeography}
                                      </dd>
                                    </div>
                                  </dl>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#EFE8DC]">
                                  <button
                                    type="button"
                                    disabled={!hasRecord}
                                    onClick={() => handleInspectObjectById(String(ref.objectID))}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1B1917] hover:bg-[#2F2B26] text-[#FCFAF5] text-xs font-medium transition-colors disabled:opacity-40 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-[#D1B06B]" />
                                    View Details
                                  </button>

                                  {validUrl ? (
                                    <a
                                      href={ref.objectURL}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs font-medium text-[#755821] hover:text-[#4F3B15] underline underline-offset-2"
                                    >
                                      Official Met Record
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : (
                                    <span className="text-[11px] text-[#8E8579]">
                                      No external Met link recorded
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
