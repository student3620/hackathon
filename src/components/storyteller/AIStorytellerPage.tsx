import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileSearch,
  Layers,
  Loader2,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { DatasetLoadStatus, MuseumRecord } from '../../types/museum';
import type {
  StoryConversationTurn,
  StoryEvidenceItem,
  StoryResponsePayload,
} from '../../types/storyteller';
import { DatasetLoadingState } from '../DatasetLoadingState';

interface AIStorytellerPageProps {
  datasetStatus: DatasetLoadStatus;
  allRecords: MuseumRecord[];
  turns: StoryConversationTurn[];
  setTurns: React.Dispatch<React.SetStateAction<StoryConversationTurn[]>>;
  onCreateVisualStory: (response: StoryResponsePayload) => void;
  onRetryDataset: () => void;
  isRetrying: boolean;
  onSelectDetails: (record: MuseumRecord) => void;
  onRequestImagesForRecords: (records: MuseumRecord[]) => void;
}

interface StorytellerServiceStatus {
  configured: boolean;
  model: string;
  datasetReady: boolean;
  recordCount: number;
}

const STARTER_QUESTIONS: string[] = [
  'Which materials are most frequently recorded in the collection?',
  'What materials appear in objects dated to the 17th century?',
  'How are objects distributed across documented countries?',
  'Which historical periods have the most catalogue records?',
  'How many objects have missing geographical information?',
  'Compare the recorded material distribution across two historical periods.',
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

export const AIStorytellerPage: React.FC<AIStorytellerPageProps> = ({
  datasetStatus,
  allRecords,
  turns,
  setTurns,
  onCreateVisualStory,
  onRetryDataset,
  isRetrying,
  onSelectDetails,
  onRequestImagesForRecords,
}) => {
  const [questionInput, setQuestionInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<StorytellerServiceStatus | null>(null);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const isDatasetReady = datasetStatus.stage === 'ready' && allRecords.length > 0;

  // Lookup map by objectID to open the full authoritative Module 1 ObjectDetailModal
  const recordsById = useMemo(() => {
    const map = new Map<string, MuseumRecord>();
    for (const r of allRecords) {
      map.set(String(r.objectID), r);
    }
    return map;
  }, [allRecords]);

  // Check backend Gemini configuration status (never exposes keys)
  useEffect(() => {
    let cancelled = false;
    fetch('/api/storyteller/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: StorytellerServiceStatus | null) => {
        if (!cancelled && data) {
          setServiceStatus(data);
        }
      })
      .catch(() => {
        // Non-fatal; errors surface cleanly when asking a question
      });
    return () => {
      cancelled = true;
    };
  }, [isDatasetReady]);

  // Pre-resolve official Met images for any catalogue evidence records displayed in conversation
  useEffect(() => {
    if (!isDatasetReady || turns.length === 0) return;
    const latestTurn = turns[turns.length - 1];
    if (latestTurn?.status !== 'success' || !latestTurn.response) return;

    const matched: MuseumRecord[] = [];
    for (const ev of latestTurn.response.catalogueEvidence) {
      const fullRec = recordsById.get(String(ev.objectID));
      if (fullRec) matched.push(fullRec);
    }
    if (matched.length > 0) {
      onRequestImagesForRecords(matched);
    }
  }, [turns, isDatasetReady, recordsById, onRequestImagesForRecords]);

  const submitQuestion = useCallback(
    async (rawText: string) => {
      const trimmed = rawText.trim();
      if (!trimmed || isSubmitting || !isDatasetReady) return;

      const localTurnId = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setIsSubmitting(true);
      setQuestionInput('');

      setTurns((prev) => [
        ...prev,
        {
          id: localTurnId,
          question: trimmed,
          status: 'loading',
        },
      ]);

      // Scroll smoothly to the new turn
      window.setTimeout(() => {
        conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 60);

      try {
        const res = await fetch('/api/storyteller/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: trimmed }),
        });

        const payload = (await res.json().catch(() => null)) as
          | StoryResponsePayload
          | { error?: string; code?: string }
          | null;

        if (!res.ok) {
          const errorMessage =
            payload && 'error' in payload && typeof payload.error === 'string'
              ? payload.error
              : `The AI Storyteller service returned HTTP ${res.status}. Please try again.`;

          setTurns((prev) =>
            prev.map((t) =>
              t.id === localTurnId
                ? { ...t, status: 'error', errorMessage }
                : t
            )
          );
          return;
        }

        if (!payload || !('directAnswer' in payload)) {
          setTurns((prev) =>
            prev.map((t) =>
              t.id === localTurnId
                ? {
                    ...t,
                    status: 'error',
                    errorMessage: 'The server returned an unexpected response structure.',
                  }
                : t
            )
          );
          return;
        }

        setTurns((prev) =>
          prev.map((t) =>
            t.id === localTurnId
              ? { ...t, status: 'success', response: payload }
              : t
          )
        );

        window.setTimeout(() => {
          conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 80);
      } catch {
        setTurns((prev) =>
          prev.map((t) =>
            t.id === localTurnId
              ? {
                  ...t,
                  status: 'error',
                  errorMessage:
                    'Unable to reach the MuseumLens server. Check your connection and try again.',
                }
              : t
          )
        );
      } finally {
        setIsSubmitting(false);
        inputRef.current?.focus();
      }
    },
    [isSubmitting, isDatasetReady]
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitQuestion(questionInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitQuestion(questionInput);
    }
  };

  const handleClearConversation = () => {
    if (isSubmitting) return;
    setTurns([]);
    setQuestionInput('');
    inputRef.current?.focus();
  };

  const handleOpenEvidenceDetails = (evidence: StoryEvidenceItem) => {
    const fullRecord = recordsById.get(String(evidence.objectID));
    if (fullRecord) {
      onRequestImagesForRecords([fullRecord]);
      onSelectDetails(fullRecord);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#2E2A25]">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#D1B06B] uppercase tracking-wider">
            Module 3 · Evidence-Grounded Museum Guide
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-[#FCFAF5]">
            AI Storyteller
          </h2>
          <p className="text-sm text-[#B8B0A4] max-w-2xl leading-relaxed">
            Ask questions about historical dates, materials, documented geographical origins, and
            catalogue completeness. Every explanation is computed from the 5,000-record Met Open
            Access dataset and paired with verifiable museum records.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isDatasetReady && (
            <div className="text-xs font-mono text-[#A69E92] tabular-nums hidden lg:block">
              {allRecords.length.toLocaleString()} Records Indexed
            </div>
          )}
          {turns.length > 0 && (
            <button
              type="button"
              onClick={handleClearConversation}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#3B352D] bg-[#24201C] hover:bg-[#2F2A24] text-xs font-medium text-[#E8E0D4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#D1B06B]" />
              Clear Conversation
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
      ) : (
        <div className="space-y-6">
          {/* Configuration notice when GEMINI_API_KEY is not present on server */}
          {serviceStatus && !serviceStatus.configured && (
            <div className="rounded-xl border border-[#5B4726] bg-[#241E16] px-4 py-3.5 flex items-start gap-3 text-sm text-[#E9DFC9]">
              <AlertTriangle className="w-4 h-4 text-[#D1B06B] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold text-[#FCFAF5]">
                  Gemini API credentials are not configured on the server
                </div>
                <p className="text-xs text-[#C7BCAA] leading-relaxed">
                  Set the server-side <code className="font-mono text-[#D1B06B]">GEMINI_API_KEY</code>{' '}
                  environment variable to enable live narrative generation. MuseumLens never
                  substitutes fabricated AI responses when credentials are unavailable.
                </p>
              </div>
            </div>
          )}

          {/* Question Input Area */}
          <section
            aria-label="Ask a collection question"
            className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-5 sm:p-6 text-[#1C1917] shadow-sm"
          >
            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="storyteller-question-input"
                  className="text-xs font-semibold uppercase tracking-wider text-[#6B6357]"
                >
                  Ask the Collection Catalogue
                </label>
                <span className="text-[11px] font-mono text-[#857C70] tabular-nums">
                  {questionInput.length}/600
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                <textarea
                  ref={inputRef}
                  id="storyteller-question-input"
                  rows={2}
                  maxLength={600}
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSubmitting}
                  placeholder="Ask about historical dates, materials, documented countries, data completeness, or a specific Met Object ID..."
                  className="flex-1 resize-none rounded-lg border border-[#D4C9B8] bg-white px-4 py-3 text-sm text-[#1C1917] placeholder:text-[#8E8579] focus:outline-none focus:border-[#9E7B38] focus:ring-2 focus:ring-[#B89248]/20 disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={isSubmitting || questionInput.trim().length === 0}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#1B1917] hover:bg-[#2F2B26] text-[#FCFAF5] text-sm font-semibold transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer shrink-0 sm:min-w-[132px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#D1B06B]" />
                      Analysing
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-[#D1B06B]" />
                      Ask
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#756D62]">
                <span>Press Enter to submit · Shift+Enter for a new line</span>
                <span>Missing origins are preserved as unrecorded · Never inferred from culture</span>
              </div>
            </form>
          </section>

          {/* Suggested Starter Questions (prominent before conversation starts, compact bar afterward) */}
          <section
            aria-label="Suggested catalogue questions"
            className="bg-[#23201C] border border-[#322E29] rounded-xl p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#D1B06B]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E5DDD0]">
                  Suggested Catalogue Questions
                </h3>
              </div>
              <span className="text-[11px] text-[#968D80]">
                Select any question to run a grounded analysis
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => submitQuestion(q)}
                  className="group text-left px-3.5 py-3 rounded-lg border border-[#36312B] bg-[#1B1916] hover:bg-[#2A2520] hover:border-[#6F5931] text-xs sm:text-[13px] text-[#E6DFD3] leading-snug transition-colors flex items-start justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>{q}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#8C8377] group-hover:text-[#D1B06B] shrink-0 mt-0.5 transition-colors" />
                </button>
              ))}
            </div>
          </section>

          {/* Conversation History */}
          {turns.length === 0 ? (
            <section className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-8 sm:p-10 text-[#1C1917]">
              <div className="max-w-2xl mx-auto text-center space-y-3">
                <div className="w-11 h-11 rounded-lg bg-[#F2EBE0] border border-[#DDD4C4] flex items-center justify-center mx-auto">
                  <FileSearch className="w-5 h-5 text-[#8A6728]" />
                </div>
                <h3 className="text-xl font-serif font-semibold text-[#1C1917]">
                  Evidence-Based Collection Storytelling
                </h3>
                <p className="text-sm text-[#5C554B] leading-relaxed">
                  Every answer combines real backend calculations from the 5,000 selected Met
                  records with Gemini-generated curatorial explanation, structured into a Direct
                  Answer, Data-Based Explanation, Key Findings, verifiable Catalogue Evidence, and
                  explicit Data Limitations.
                </p>
              </div>
            </section>
          ) : (
            <section aria-label="Conversation history" className="space-y-6">
              {turns.map((turn, idx) => (
                <article key={turn.id} className="space-y-3">
                  {/* User Question Banner */}
                  <div className="bg-[#25211D] border border-[#3A342C] rounded-xl px-5 py-4 flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-[#D1B06B]">
                        Question {idx + 1}
                      </div>
                      <p className="text-base font-serif font-medium text-[#FCFAF5] leading-snug">
                        {turn.question}
                      </p>
                    </div>
                  </div>

                  {/* Loading State */}
                  {turn.status === 'loading' && (
                    <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-6 text-[#1C1917] flex items-center gap-4">
                      <Loader2 className="w-5 h-5 text-[#9A742E] animate-spin shrink-0" />
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-[#1C1917]">
                          Computing catalogue analytics and verifying evidence…
                        </div>
                        <p className="text-xs text-[#6B6357]">
                          Querying the 5,000-record backend dataset and validating generated claims
                          against original Met catalogue fields.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Error State */}
                  {turn.status === 'error' && (
                    <div className="bg-[#FCFAF5] border border-[#D8B4A6] rounded-xl p-5 sm:p-6 text-[#1C1917] space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-[#9E3C2B] shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-[#7A291B]">
                            Unable to generate a grounded response
                          </h4>
                          <p className="text-sm text-[#4D453D] leading-relaxed">
                            {turn.errorMessage ||
                              'An error occurred while communicating with the AI Storyteller service.'}
                          </p>
                        </div>
                      </div>
                      <div className="pl-8">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => submitQuestion(turn.question)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1B1917] hover:bg-[#2F2B26] text-[#FCFAF5] text-xs font-medium transition-colors disabled:opacity-45 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[#D1B06B]" />
                          Retry Question
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Structured Story Response */}
                  {turn.status === 'success' && turn.response && (
                    <StoryResponseCard
                      response={turn.response}
                      recordsById={recordsById}
                      isSubmitting={isSubmitting}
                      onOpenDetails={handleOpenEvidenceDetails}
                      onAskFollowUp={submitQuestion}
                      onCreateVisualStory={onCreateVisualStory}
                    />
                  )}
                </article>
              ))}
              <div ref={conversationEndRef} />
            </section>
          )}
        </div>
      )}
    </div>
  );
};

interface StoryResponseCardProps {
  response: StoryResponsePayload;
  recordsById: Map<string, MuseumRecord>;
  isSubmitting: boolean;
  onOpenDetails: (item: StoryEvidenceItem) => void;
  onAskFollowUp: (question: string) => void;
  onCreateVisualStory: (response: StoryResponsePayload) => void;
}

const StoryResponseCard: React.FC<StoryResponseCardProps> = ({
  response,
  recordsById,
  isSubmitting,
  onOpenDetails,
  onAskFollowUp,
  onCreateVisualStory,
}) => {
  const { validation } = response;

  return (
    <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl text-[#1C1917] overflow-hidden shadow-sm">
      {/* Top Analytical Context & Honest Validation Bar */}
      <div className="px-5 sm:px-6 py-3.5 bg-[#F4EFE4] border-b border-[#E3DAC9] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="font-semibold text-[#755821] uppercase tracking-wider">
            {response.analyticalCategoryLabel}
          </span>
          <span className="text-[#B5AA99]">|</span>
          <span className="text-[#5A5247]">{response.appliedFiltersSummary}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {response.outOfScope ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B6357]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#8A6728]" />
              Collection Scope Policy
            </div>
          ) : validation.passed ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2D5A3D]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A3D]" />
              <span>
                Evidence-Verified · {response.datasetRecordCount.toLocaleString()} Records
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8C5319]">
              <AlertTriangle className="w-3.5 h-3.5 text-[#A8621B]" />
              <span>Partial Validation Notice</span>
            </div>
          )}

          {!response.outOfScope && (
            <button
              type="button"
              onClick={() => onCreateVisualStory(response)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1B1917] hover:bg-[#2F2B26] text-[#FCFAF5] text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-[#D1B06B]" />
              Create Visual Story
            </button>
          )}
        </div>
      </div>

      {/* Explicit validation caution panel whenever any backend check did not pass */}
      {!response.outOfScope && !validation.passed && validation.notes.length > 0 && (
        <div className="px-5 sm:px-6 py-3 bg-[#FBF3E4] border-b border-[#E7D2AE] text-xs text-[#6E4514] space-y-1">
          <div className="font-semibold">
            Backend Verification Notice (review supporting records directly):
          </div>
          <ul className="list-disc pl-4 space-y-0.5">
            {validation.notes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-5 sm:p-6 space-y-6">
        {/* A. Direct Answer */}
        <section className="space-y-1.5">
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#7D6639] font-semibold">
            A. Direct Answer
          </h4>
          <p className="text-[15px] sm:text-base font-medium text-[#1C1917] leading-relaxed">
            {response.directAnswer}
          </p>
        </section>

        {/* B. Data-Based Explanation */}
        <section className="space-y-1.5 pt-4 border-t border-[#EAE2D3]">
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#7D6639] font-semibold">
            B. Data-Based Explanation
          </h4>
          <p className="text-sm text-[#38332D] leading-relaxed whitespace-pre-line">
            {response.dataBasedExplanation}
          </p>
        </section>

        {/* C. Key Findings */}
        {response.keyFindings.length > 0 && (
          <section className="space-y-3 pt-4 border-t border-[#EAE2D3]">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#7D6639] font-semibold">
              C. Key Findings
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {response.keyFindings.map((finding, idx) => (
                <div
                  key={`${finding.label}-${idx}`}
                  className="rounded-lg border border-[#E2D9C8] bg-[#F7F3EA] p-3.5 space-y-1"
                >
                  <div className="text-xs font-medium text-[#6B6357]">{finding.label}</div>
                  <div className="text-lg font-serif font-semibold text-[#1C1917] tabular-nums">
                    {finding.value}
                  </div>
                  {finding.detail && (
                    <div className="text-xs text-[#595248] leading-snug">{finding.detail}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* D. Catalogue Evidence */}
        {!response.outOfScope && (
          <section className="space-y-3 pt-4 border-t border-[#EAE2D3]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#7D6639] font-semibold">
                D. Catalogue Evidence
              </h4>
              <span className="text-[11px] font-mono text-[#756D62] tabular-nums">
                {response.catalogueEvidence.length} supporting{' '}
                {response.catalogueEvidence.length === 1 ? 'record' : 'records'}
              </span>
            </div>

            {response.catalogueEvidence.length === 0 ? (
              <div className="rounded-lg border border-[#E2D9C8] bg-[#F7F3EA] px-4 py-3 text-xs text-[#5E574D]">
                No individual catalogue records matched the exact criteria for this query.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {response.catalogueEvidence.map((item) => {
                  const hasFullRecord = recordsById.has(String(item.objectID));
                  const validUrl = isSafeExternalUrl(item.objectURL);

                  return (
                    <div
                      key={String(item.objectID)}
                      className="rounded-lg border border-[#DFD5C3] bg-white p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="text-sm font-serif font-semibold text-[#1C1917] leading-snug">
                            {item.title || 'Untitled Object'}
                          </h5>
                          <span className="text-[11px] font-mono text-[#755821] bg-[#F4EFE4] border border-[#E5DAC6] rounded px-1.5 py-0.5 shrink-0 tabular-nums">
                            ID {item.objectID}
                          </span>
                        </div>

                        <dl className="grid grid-cols-1 gap-1 text-xs text-[#4A443C]">
                          <div className="flex gap-1.5">
                            <dt className="font-medium text-[#756D62] shrink-0">Date:</dt>
                            <dd className="truncate">
                              {item.objectDate?.trim() || 'Not recorded in catalogue'}
                            </dd>
                          </div>
                          <div className="flex gap-1.5">
                            <dt className="font-medium text-[#756D62] shrink-0">Medium:</dt>
                            <dd className="line-clamp-2">
                              {item.medium?.trim() || 'Not recorded in catalogue'}
                            </dd>
                          </div>
                          <div className="flex gap-1.5">
                            <dt className="font-medium text-[#756D62] shrink-0">Geography:</dt>
                            <dd
                              className={
                                item.documentedGeography === 'Not recorded in catalogue'
                                  ? 'text-[#8A6326] italic'
                                  : ''
                              }
                            >
                              {item.documentedGeography}
                            </dd>
                          </div>
                          {item.culture?.trim() && (
                            <div className="flex gap-1.5">
                              <dt className="font-medium text-[#756D62] shrink-0">Culture:</dt>
                              <dd className="truncate">{item.culture.trim()}</dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#EFE8DC]">
                        <button
                          type="button"
                          disabled={!hasFullRecord}
                          onClick={() => onOpenDetails(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1B1917] hover:bg-[#2F2B26] text-[#FCFAF5] text-xs font-medium transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#D1B06B]" />
                          View Details
                        </button>

                        {validUrl ? (
                          <a
                            href={item.objectURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#755821] hover:text-[#4F3B15] underline underline-offset-2"
                          >
                            Met Catalogue Record
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
            )}
          </section>
        )}

        {/* E. Data Limitation */}
        <section className="space-y-1.5 pt-4 border-t border-[#EAE2D3]">
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#7D6639] font-semibold">
            E. Data Limitation
          </h4>
          <p className="text-xs sm:text-[13px] text-[#575046] leading-relaxed bg-[#F6F1E7] border border-[#E5DCCB] rounded-lg px-4 py-3">
            {response.dataLimitation}
          </p>
        </section>

        {/* Suggested Follow-Up Questions */}
        {response.suggestedFollowUps.length > 0 && (
          <section className="space-y-2.5 pt-4 border-t border-[#EAE2D3]">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#6B6357] font-semibold">
              Suggested Follow-Up Questions
            </div>
            <div className="flex flex-wrap gap-2">
              {response.suggestedFollowUps.map((followUp, idx) => (
                <button
                  key={`${followUp}-${idx}`}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onAskFollowUp(followUp)}
                  className="inline-flex items-center gap-1.5 text-left px-3 py-2 rounded-lg border border-[#D8CEBC] bg-[#F7F3EA] hover:bg-[#EFE7D7] hover:border-[#B89248] text-xs font-medium text-[#2E2923] transition-colors disabled:opacity-45 cursor-pointer"
                >
                  <span>{followUp}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#8A6728] shrink-0" />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
