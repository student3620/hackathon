import React from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Database } from 'lucide-react';
import { DatasetLoadStatus, DatasetStage } from '../types/museum';

interface DatasetLoadingStateProps {
  status: DatasetLoadStatus;
  onRetry: () => void;
  isRetrying: boolean;
}

const PIPELINE_STEPS: { stage: DatasetStage; label: string }[] = [
  { stage: 'connecting', label: 'Connecting to The Met dataset.' },
  { stage: 'downloading', label: 'Downloading catalogue data.' },
  { stage: 'processing', label: 'Processing catalogue records.' },
  { stage: 'selecting', label: 'Selecting 5,000 records.' },
  { stage: 'ready', label: 'Dataset ready.' },
];

const STAGE_ORDER: Record<DatasetStage, number> = {
  idle: 0,
  connecting: 1,
  downloading: 2,
  processing: 3,
  selecting: 4,
  ready: 5,
  error: -1,
};

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const DatasetLoadingState: React.FC<DatasetLoadingStateProps> = ({
  status,
  onRetry,
  isRetrying,
}) => {
  const isError = status.stage === 'error';
  const currentRank = STAGE_ORDER[status.stage] ?? 0;

  return (
    <section
      aria-label="Automatic Met dataset loading status"
      className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-6 sm:p-10 max-w-2xl mx-auto my-8 text-[#1C1917] shadow-sm"
    >
      <div className="flex items-start gap-4 pb-6 border-b border-[#E5DDD0]">
        <div
          className={`w-11 h-11 rounded-lg border flex items-center justify-center shrink-0 ${
            isError
              ? 'bg-[#FDF2F2] border-[#E5B4B4] text-[#8C2D2D]'
              : 'bg-[#F4EFE4] border-[#DDD4C4] text-[#96722D]'
          }`}
        >
          {isError ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <Database className="w-5 h-5 stroke-[1.75]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-xs font-mono uppercase tracking-wider text-[#755821]">
            Automatic GitHub Dataset Integration · Seed {status.seed}
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-semibold text-[#1C1917] mt-1">
            {isError ? 'Unable to Retrieve Met Open Access Dataset' : status.message}
          </h2>
          <p className="text-sm text-[#5C554C] mt-1.5 leading-relaxed">
            Source: The Metropolitan Museum of Art Open Access Catalogue (
            <span className="font-mono text-xs text-[#4A443C]">MetObjects.csv</span>). Processed
            on the server with deterministic reservoir sampling (seed {status.seed}) and cached
            locally for reuse.
          </p>
        </div>
      </div>

      {isError ? (
        <div className="pt-6 space-y-5">
          <div
            role="alert"
            className="rounded-lg bg-[#FDF2F2] border border-[#E5B4B4] p-4 text-sm text-[#8C2D2D] leading-relaxed"
          >
            <strong className="font-semibold block mb-1">Retrieval Error</strong>
            {status.error || 'Failed to download or parse the official MetObjects.csv file.'}
          </div>

          <p className="text-xs text-[#6B6357] leading-relaxed">
            MuseumLens does not substitute sample or fabricated museum objects when the official
            catalogue cannot be retrieved.
          </p>

          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="px-5 py-2.5 rounded-lg bg-[#1B1917] hover:bg-[#2F2B26] disabled:opacity-60 text-[#FCFAF5] text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-[#D1B06B] ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying Retrieval...' : 'Retry Dataset Download'}
          </button>
        </div>
      ) : (
        <div className="pt-6 space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#5C554C] tabular-nums">
              <span>{status.message}</span>
              <span>{status.progressPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#EAE3D5] overflow-hidden">
              <div
                className="h-full bg-[#B89248] transition-all duration-300"
                style={{ width: `${Math.max(4, Math.min(100, status.progressPercent))}%` }}
              />
            </div>
          </div>

          {/* Live stream metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-[#F4EFE4] border border-[#E5DDD0] px-4 py-3">
              <div className="text-[11px] font-medium text-[#6B6357]">Downloaded</div>
              <div className="text-sm font-mono font-semibold text-[#1C1917] tabular-nums mt-0.5">
                {status.bytesDownloaded > 0
                  ? status.totalBytes
                    ? `${formatMegabytes(status.bytesDownloaded)} / ${formatMegabytes(status.totalBytes)}`
                    : formatMegabytes(status.bytesDownloaded)
                  : 'Initializing...'}
              </div>
            </div>

            <div className="rounded-lg bg-[#F4EFE4] border border-[#E5DDD0] px-4 py-3">
              <div className="text-[11px] font-medium text-[#6B6357]">Unique Records Scanned</div>
              <div className="text-sm font-mono font-semibold text-[#1C1917] tabular-nums mt-0.5">
                {status.uniqueRecordsScanned.toLocaleString()}
              </div>
            </div>

            <div className="rounded-lg bg-[#F4EFE4] border border-[#E5DDD0] px-4 py-3">
              <div className="text-[11px] font-medium text-[#6B6357]">Reservoir Target</div>
              <div className="text-sm font-mono font-semibold text-[#755821] tabular-nums mt-0.5">
                {status.selectedCount.toLocaleString()} / 5,000
              </div>
            </div>
          </div>

          {/* Explicit status progression checklist */}
          <ol className="space-y-2.5 pt-1">
            {PIPELINE_STEPS.map((step) => {
              const stepRank = STAGE_ORDER[step.stage];
              const isCompleted = currentRank > stepRank;
              const isActive = currentRank === stepRank;

              return (
                <li
                  key={step.stage}
                  className={`flex items-center gap-3 text-sm ${
                    isActive
                      ? 'text-[#1C1917] font-semibold'
                      : isCompleted
                      ? 'text-[#4A443C]'
                      : 'text-[#8C8377]'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-[#2F6B45] shrink-0" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 text-[#96722D] animate-spin shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-[#CBBFA8] shrink-0" />
                  )}
                  <span>{step.label}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
};
