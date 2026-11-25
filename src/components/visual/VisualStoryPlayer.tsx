import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Eye,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { MuseumRecord } from '../../types/museum';
import type { VisualStoryPayload, VisualStoryScene } from '../../types/visualStory';
import { MuseumImage } from '../MuseumImage';
import { AnimatedSceneChart } from './AnimatedSceneChart';
import type { ChartDrilldownRequest } from './VisualStoryCharts';

interface VisualStoryPlayerProps {
  story: VisualStoryPayload;
  recordsById: Map<string, MuseumRecord>;
  attachResolvedImage: (record: MuseumRecord) => MuseumRecord;
  onInspectObjectById: (objectId: string) => void;
  onInspectSlice: (request: ChartDrilldownRequest) => void;
  onJumpToReferences: () => void;
}

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function isSafeExternalUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function formatGeography(record: MuseumRecord): string {
  const parts: string[] = [];
  if (record.city?.trim()) parts.push(record.city.trim());
  if (record.region?.trim() && !parts.includes(record.region.trim())) parts.push(record.region.trim());
  if (record.country?.trim() && !parts.includes(record.country.trim())) parts.push(record.country.trim());
  if (parts.length === 0) return 'Not recorded in catalogue';
  const loc = parts.join(', ');
  return record.geographyType?.trim() ? `${record.geographyType.trim()}: ${loc}` : loc;
}

export const VisualStoryPlayer: React.FC<VisualStoryPlayerProps> = ({
  story,
  recordsById,
  attachResolvedImage,
  onInspectObjectById,
  onInspectSlice,
  onJumpToReferences,
}) => {
  const scenes = story.scenes;
  const [sceneIndex, setSceneIndex] = useState(0);
  const [sceneElapsed, setSceneElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [narrationEnabled, setNarrationEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const speechSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined';

  const cancelSpeech = useCallback(() => {
    if (speechSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore browser TTS cancellation errors gracefully
      }
    }
  }, [speechSupported]);

  // Reset player cleanly whenever a new story is loaded
  useEffect(() => {
    cancelSpeech();
    setSceneIndex(0);
    setSceneElapsed(0);
    setIsPlaying(false);
    setIsFinished(false);
  }, [story.id, cancelSpeech]);

  // Sync fullscreen state with browser Escape / button exit
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(document.fullscreenElement === playerContainerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, [cancelSpeech]);

  const currentScene: VisualStoryScene | undefined = scenes[sceneIndex];

  // Deterministic playback timer (single interval, strictly cleaned up on pause/unmount/scene change)
  useEffect(() => {
    if (!isPlaying || !currentScene || scenes.length === 0) return;

    const tickMs = 100;
    const intervalId = window.setInterval(() => {
      setSceneElapsed((prev) => {
        const next = prev + tickMs / 1000;
        if (next >= currentScene.durationSeconds) {
          if (sceneIndex < scenes.length - 1) {
            setSceneIndex((idx) => Math.min(scenes.length - 1, idx + 1));
            return 0;
          } else {
            setIsPlaying(false);
            setIsFinished(true);
            return currentScene.durationSeconds;
          }
        }
        return next;
      });
    }, tickMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPlaying, sceneIndex, currentScene, scenes.length]);

  // Optional browser TTS narration strictly tied to active scene & playback state (zero overlap)
  useEffect(() => {
    cancelSpeech();
    if (!speechSupported || !narrationEnabled || !isPlaying || !currentScene) {
      return;
    }

    const spokenText = (currentScene.narration || currentScene.caption || '').trim();
    if (!spokenText) return;

    try {
      const utterance = new window.SpeechSynthesisUtterance(spokenText);
      utterance.rate = 0.98;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } catch {
      // Gracefully ignore unavailable voices
    }

    return () => {
      cancelSpeech();
    };
  }, [speechSupported, narrationEnabled, isPlaying, sceneIndex, currentScene?.id, cancelSpeech]);

  // Precompute cumulative offsets for accurate total elapsed time and progress bar
  const sceneOffsets = useMemo(() => {
    const offsets: number[] = [];
    let running = 0;
    for (const s of scenes) {
      offsets.push(running);
      running += s.durationSeconds;
    }
    return offsets;
  }, [scenes]);

  const totalDuration = useMemo(
    () => scenes.reduce((sum, s) => sum + s.durationSeconds, 0),
    [scenes]
  );

  const totalElapsed = useMemo(() => {
    if (!currentScene) return 0;
    const base = sceneOffsets[sceneIndex] ?? 0;
    return Math.min(totalDuration, base + sceneElapsed);
  }, [sceneOffsets, sceneIndex, sceneElapsed, totalDuration, currentScene]);

  const overallProgressPercent =
    totalDuration > 0 ? Math.min(100, (totalElapsed / totalDuration) * 100) : 0;

  const sceneProgress =
    currentScene && currentScene.durationSeconds > 0
      ? Math.min(1, sceneElapsed / currentScene.durationSeconds)
      : 0;

  // Resolve real MuseumRecords strictly by objectID for current scene
  const currentSceneRecords = useMemo(() => {
    if (!currentScene) return [];
    const list: MuseumRecord[] = [];
    for (const id of currentScene.objectIds) {
      const rec = recordsById.get(String(id));
      if (rec) list.push(attachResolvedImage(rec));
    }
    if (list.length === 0) {
      for (const fallback of story.featuredObjects.slice(0, 2)) {
        const rec = recordsById.get(String(fallback.objectID));
        if (rec) list.push(attachResolvedImage(rec));
      }
    }
    return list;
  }, [currentScene, recordsById, attachResolvedImage, story.featuredObjects]);

  const handlePlayPause = () => {
    if (scenes.length === 0) return;
    if (isPlaying) {
      cancelSpeech();
      setIsPlaying(false);
      return;
    }
    if (isFinished || (sceneIndex === scenes.length - 1 && sceneElapsed >= (currentScene?.durationSeconds ?? 0))) {
      setSceneIndex(0);
      setSceneElapsed(0);
      setIsFinished(false);
    }
    setIsPlaying(true);
  };

  const handleRestart = () => {
    cancelSpeech();
    setSceneIndex(0);
    setSceneElapsed(0);
    setIsFinished(false);
    setIsPlaying(true);
  };

  const handleJumpToScene = (targetIdx: number) => {
    if (targetIdx < 0 || targetIdx >= scenes.length) return;
    cancelSpeech();
    setSceneIndex(targetIdx);
    setSceneElapsed(0);
    setIsFinished(false);
  };

  const handlePrevious = () => {
    if (sceneIndex > 0) {
      handleJumpToScene(sceneIndex - 1);
    } else {
      cancelSpeech();
      setSceneElapsed(0);
      setIsFinished(false);
    }
  };

  const handleNext = () => {
    if (sceneIndex < scenes.length - 1) {
      handleJumpToScene(sceneIndex + 1);
    }
  };

  const handleToggleFullscreen = async () => {
    const container = playerContainerRef.current;
    if (!container) return;
    try {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen();
      } else if (container.requestFullscreen) {
        await container.requestFullscreen();
      }
    } catch {
      // Fullscreen may be restricted inside some embedded iframes; fail gracefully
    }
  };

  const handleToggleNarration = () => {
    if (!speechSupported) return;
    if (narrationEnabled) {
      cancelSpeech();
      setNarrationEnabled(false);
    } else {
      setNarrationEnabled(true);
    }
  };

  const handleInspectChartFromPlayer = (req: ChartDrilldownRequest) => {
    // Pause playback so the visitor can inspect matching records without losing their scene
    cancelSpeech();
    setIsPlaying(false);
    onInspectSlice(req);
  };

  const handleInspectObjectFromPlayer = (objectId: string) => {
    cancelSpeech();
    setIsPlaying(false);
    onInspectObjectById(objectId);
  };

  if (!currentScene) return null;

  return (
    <div
      ref={playerContainerRef}
      className={`bg-[#11100E] border border-[#302B24] rounded-xl overflow-hidden shadow-lg flex flex-col ${
        isFullscreen ? 'w-screen h-screen rounded-none border-0' : 'w-full'
      }`}
    >
      {/* Top Cinema Header Strip */}
      <div className="px-4 sm:px-6 py-3 bg-[#171513] border-b border-[#2A251F] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="font-mono text-[#D1B06B] uppercase tracking-wider shrink-0">
            Scene {currentScene.sceneNumber} of {scenes.length}
          </span>
          <span className="text-[#595147]">·</span>
          <span className="text-[#E6DFD2] font-medium truncate">{currentScene.label}</span>
          <span className="text-[#595147] hidden sm:inline">·</span>
          <span className="text-[#9E9589] hidden sm:inline truncate">
            {story.appliedFiltersSummary}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {story.validation.passed ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8EC29D]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified · {story.datasetRecordCount.toLocaleString()} Records
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#E0B167]">
              <AlertTriangle className="w-3.5 h-3.5" />
              Partial Verification Notice
            </span>
          )}
        </div>
      </div>

      {/* Main 16:9 Cinematic Presentation Stage */}
      <div
        className={`relative bg-[#141311] w-full overflow-hidden flex flex-col justify-between ${
          isFullscreen ? 'flex-1 min-h-0' : 'lg:aspect-video min-h-[500px] lg:min-h-0'
        }`}
      >
        {/* Animated Scene Canvas */}
        <div className="flex-1 min-h-0 relative px-5 sm:px-8 lg:px-10 pt-5 sm:pt-6 pb-3 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${story.id}-${currentScene.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 min-h-0 flex flex-col"
            >
              {renderSceneBody({
                scene: currentScene,
                story,
                sceneRecords: currentSceneRecords,
                sceneProgress,
                isPlaying,
                onInspectObject: handleInspectObjectFromPlayer,
                onInspectSlice: handleInspectChartFromPlayer,
                onJumpToReferences,
                onRestart: handleRestart,
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Always-Readable Documentary Subtitle & Caption Bar */}
        <div className="px-5 sm:px-8 lg:px-10 py-3.5 bg-[#0E0D0B]/95 border-t border-[#26221D] shrink-0">
          <div className="max-w-4xl mx-auto text-center space-y-1">
            <p className="text-sm sm:text-[15px] text-[#FCFAF5] leading-relaxed font-sans">
              {currentScene.narration || currentScene.caption}
            </p>
            {currentScene.caption &&
              currentScene.caption !== currentScene.narration && (
                <p className="text-xs text-[#A89F91] leading-snug">
                  {currentScene.caption}
                </p>
              )}
          </div>
        </div>
      </div>

      {/* Story Timeline Progress Bar + Transport Controls */}
      <div className="px-4 sm:px-6 py-3.5 bg-[#171513] border-t border-[#2A251F] space-y-3">
        {/* Segmented Clickable Scene Progress Bar */}
        <div className="space-y-1.5">
          <div
            className="flex items-center gap-1.5 w-full"
            role="tablist"
            aria-label="Story scenes timeline"
          >
            {scenes.map((sc, idx) => {
              const weight = totalDuration > 0 ? (sc.durationSeconds / totalDuration) * 100 : 100 / scenes.length;
              let fillPercent = 0;
              if (idx < sceneIndex) fillPercent = 100;
              else if (idx === sceneIndex) fillPercent = sceneProgress * 100;

              return (
                <button
                  key={sc.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === sceneIndex}
                  title={`Scene ${sc.sceneNumber}: ${sc.label} (${sc.durationSeconds}s)`}
                  onClick={() => handleJumpToScene(idx)}
                  style={{ width: `${weight}%` }}
                  className="group py-1.5 cursor-pointer focus:outline-none"
                >
                  <div className="h-1.5 w-full rounded-full bg-[#2E2923] overflow-hidden">
                    <div
                      className={`h-full transition-all duration-100 ${
                        idx === sceneIndex ? 'bg-[#D1B06B]' : 'bg-[#8F7137]'
                      }`}
                      style={{ width: `${fillPercent}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#A89F91] tabular-nums">
            <span>
              {formatTime(totalElapsed)} / {formatTime(totalDuration)}
            </span>
            <span className="truncate text-[#C7BFB2]">
              {scenes.map((sc, idx) => (
                <button
                  key={`nav-${sc.id}`}
                  type="button"
                  onClick={() => handleJumpToScene(idx)}
                  className={`mx-1.5 transition-colors cursor-pointer ${
                    idx === sceneIndex
                      ? 'text-[#D1B06B] font-semibold'
                      : 'text-[#847C70] hover:text-[#DFD7CA]'
                  }`}
                >
                  {sc.sceneNumber}. {sc.label}
                </button>
              ))}
            </span>
            <span className="shrink-0">{Math.round(overallProgressPercent)}%</span>
          </div>
        </div>

        {/* Transport Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePlayPause}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D1B06B] hover:bg-[#DEC07E] text-[#141311] text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  Pause
                </>
              ) : isFinished ? (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Replay Story
                </>
              ) : totalElapsed > 0 ? (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Resume
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Play Story
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrevious}
              aria-label="Previous scene"
              title="Previous scene"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-[#38322A] bg-[#211E1A] hover:bg-[#2C2722] text-xs font-medium text-[#E8E0D4] transition-colors cursor-pointer"
            >
              <SkipBack className="w-3.5 h-3.5 text-[#D1B06B]" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={sceneIndex >= scenes.length - 1}
              aria-label="Next scene"
              title="Next scene"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-[#38322A] bg-[#211E1A] hover:bg-[#2C2722] text-xs font-medium text-[#E8E0D4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <span className="hidden sm:inline">Next</span>
              <SkipForward className="w-3.5 h-3.5 text-[#D1B06B]" />
            </button>

            <button
              type="button"
              onClick={handleRestart}
              title="Restart story from Scene 1"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#38322A] bg-[#211E1A] hover:bg-[#2C2722] text-xs font-medium text-[#E8E0D4] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#D1B06B]" />
              <span className="hidden md:inline">Restart</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Optional Voice Narration Control (Browser TTS) */}
            <button
              type="button"
              onClick={handleToggleNarration}
              disabled={!speechSupported}
              title={
                speechSupported
                  ? narrationEnabled
                    ? 'Mute voice narration'
                    : 'Enable browser voice narration'
                  : 'Browser speech narration is unavailable in this environment'
              }
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                !speechSupported
                  ? 'border-[#2D2924] bg-[#1A1815] text-[#6E675D] cursor-not-allowed'
                  : narrationEnabled
                    ? 'border-[#8C6D34] bg-[#2B2419] text-[#F5E7C6] cursor-pointer'
                    : 'border-[#38322A] bg-[#211E1A] hover:bg-[#2C2722] text-[#CFC7BA] cursor-pointer'
              }`}
            >
              {narrationEnabled && speechSupported ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#D1B06B]" />
                  <span>Narration On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-[#9E9589]" />
                  <span>{speechSupported ? 'Narration Off' : 'Voice Unavailable'}</span>
                </>
              )}
            </button>

            {/* Fullscreen Playback Toggle */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
              title={isFullscreen ? 'Exit full screen' : 'Full-screen playback'}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#38322A] bg-[#211E1A] hover:bg-[#2C2722] text-xs font-medium text-[#E8E0D4] transition-colors whitespace-nowrap cursor-pointer"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-[#D1B06B]" />
                  <span className="hidden sm:inline">Exit Full Screen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-[#D1B06B]" />
                  <span className="hidden sm:inline">Full Screen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface RenderSceneArgs {
  scene: VisualStoryScene;
  story: VisualStoryPayload;
  sceneRecords: MuseumRecord[];
  sceneProgress: number;
  isPlaying: boolean;
  onInspectObject: (objectId: string) => void;
  onInspectSlice: (request: ChartDrilldownRequest) => void;
  onJumpToReferences: () => void;
  onRestart: () => void;
}

function renderSceneBody({
  scene,
  story,
  sceneRecords,
  sceneProgress,
  isPlaying,
  onInspectObject,
  onInspectSlice,
  onJumpToReferences,
  onRestart,
}: RenderSceneArgs): React.ReactNode {
  switch (scene.sceneType) {
    case 'introduction': {
      const heroRecord = sceneRecords[0];
      return (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="text-xs font-mono text-[#D1B06B] uppercase tracking-widest">
              Scene 01 · {story.analyticalCategoryLabel}
            </div>
            <h2 className="text-2xl sm:text-3xl xl:text-4xl font-serif font-semibold text-[#FCFAF5] leading-tight text-balance">
              {story.storyTitle}
            </h2>
            {story.subtitle && (
              <p className="text-sm sm:text-base font-serif text-[#C7BFB2] leading-relaxed">
                {story.subtitle}
              </p>
            )}
            {scene.highlightMetric && (
              <div className="pt-3 border-t border-[#2E2922] flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-serif font-semibold text-[#D1B06B] tabular-nums">
                  {scene.highlightMetric.value}
                </span>
                <span className="text-xs text-[#B8B0A4]">
                  {scene.highlightMetric.label} — {scene.highlightMetric.detail}
                </span>
              </div>
            )}
          </div>

          <div className="lg:col-span-6 h-full min-h-[240px] max-h-[380px] flex flex-col">
            {heroRecord ? (
              <div className="flex-1 min-h-0 rounded-xl bg-[#1B1917] border border-[#2F2A24] overflow-hidden flex flex-col">
                <div className="flex-1 min-h-0 overflow-hidden p-3 flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 1 }}
                    animate={{ scale: isPlaying ? 1.04 : 1 }}
                    transition={{ duration: scene.durationSeconds, ease: 'linear' }}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <MuseumImage record={heroRecord} variant="lightbox" />
                  </motion.div>
                </div>
                <div className="px-4 py-2.5 bg-[#151311] border-t border-[#2B2620] flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-serif text-[#FCFAF5] truncate">
                      {heroRecord.title || 'Untitled Object'}
                    </div>
                    <div className="text-[11px] text-[#9E9589] font-mono tabular-nums truncate">
                      ID {heroRecord.objectID} · {heroRecord.objectDate || 'Date unrecorded'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onInspectObject(String(heroRecord.objectID))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#3F372C] bg-[#221F1B] hover:bg-[#2F2A23] text-[11px] text-[#E6DFD2] shrink-0 cursor-pointer"
                  >
                    <Eye className="w-3 h-3 text-[#D1B06B]" />
                    Inspect
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 rounded-xl bg-[#1B1917] border border-[#2F2A24] flex items-center justify-center text-xs text-[#9E9589]">
                Met Open Access 5,000-Record Collection
              </div>
            )}
          </div>
        </div>
      );
    }

    case 'historical_context': {
      const timeline = story.analyticsData.dateAnalysis.timeline;
      const activeEraIdx =
        timeline.length > 0
          ? Math.min(timeline.length - 1, Math.floor(sceneProgress * timeline.length))
          : 0;
      const dateSummary = story.analyticsData.dateAnalysis.summary;

      return (
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-[11px] font-mono text-[#D1B06B] uppercase tracking-widest">
                Scene 0{scene.sceneNumber} · {scene.label}
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-semibold text-[#FCFAF5]">
                {scene.title}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#B8B0A4] tabular-nums">
              {dateSummary.earliestRecord && (
                <span>Earliest: {dateSummary.earliestRecord.objectDate}</span>
              )}
              {dateSummary.latestRecord && (
                <span>Latest: {dateSummary.latestRecord.objectDate}</span>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-[210px] rounded-xl bg-[#191715] border border-[#2D2822] p-3 sm:p-4">
            <AnimatedSceneChart
              sceneId={scene.id}
              chartType={scene.chartType || 'historical_timeline'}
              analyticsData={story.analyticsData}
              sceneProgress={sceneProgress}
              onInspectSlice={onInspectSlice}
            />
          </div>

          {/* Animated Historical Timeline Progression Strip */}
          {timeline.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 shrink-0">
              {timeline.slice(0, 6).map((era, idx) => {
                const isActive = idx === activeEraIdx;
                return (
                  <button
                    key={era.id}
                    type="button"
                    onClick={() =>
                      onInspectSlice({
                        chartId: scene.id,
                        filterPatch: { period: era.id },
                        selectionLabel: `Historical Period: ${era.label}`,
                      })
                    }
                    className={`text-left px-2.5 py-2 rounded-lg border transition-colors cursor-pointer ${
                      isActive
                        ? 'border-[#D1B06B] bg-[#262018] text-[#FCFAF5]'
                        : 'border-[#2D2822] bg-[#191715] text-[#9E9589] hover:border-[#4A4032]'
                    }`}
                  >
                    <div className="text-[10px] font-mono truncate">{era.shortLabel}</div>
                    <div className="text-xs font-serif font-semibold tabular-nums mt-0.5 text-[#E6DFD2]">
                      {era.count.toLocaleString()}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    case 'object_exploration': {
      const showcaseRecords = sceneRecords.slice(0, 3);
      const focusedIdx =
        showcaseRecords.length > 0
          ? Math.min(showcaseRecords.length - 1, Math.floor(sceneProgress * showcaseRecords.length))
          : 0;

      return (
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-[11px] font-mono text-[#D1B06B] uppercase tracking-widest">
                Scene 0{scene.sceneNumber} · {scene.label}
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-semibold text-[#FCFAF5]">
                {scene.title}
              </h3>
            </div>
            <span className="text-xs text-[#A89F91]">
              Real Met catalogue objects matched strictly by Object ID
            </span>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4">
            {showcaseRecords.map((rec, idx) => {
              const isSpotlight = idx === focusedIdx;
              const geo = formatGeography(rec);
              return (
                <motion.div
                  key={`stage-obj-${rec.recordKey}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.14 }}
                  className={`rounded-xl border overflow-hidden flex flex-col bg-[#191715] transition-colors ${
                    isSpotlight ? 'border-[#C6A259]' : 'border-[#2D2822]'
                  }`}
                >
                  <div className="flex-1 min-h-[140px] bg-[#1D1B18] p-2.5 flex items-center justify-center overflow-hidden">
                    <MuseumImage record={rec} variant="lightbox" />
                  </div>
                  <div className="p-3 space-y-1.5 bg-[#151311] border-t border-[#2A251F]">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-serif font-semibold text-[#FCFAF5] line-clamp-1">
                        {rec.title || 'Untitled Object'}
                      </h4>
                      <span className="text-[10px] font-mono text-[#D1B06B] shrink-0 tabular-nums">
                        ID {rec.objectID}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#C7BFB2] line-clamp-1">
                      <span className="text-[#8E8579]">Medium:</span>{' '}
                      {rec.medium?.trim() || 'Not recorded in catalogue'}
                    </div>
                    <div className="text-[11px] text-[#A89F91] line-clamp-1">
                      <span className="text-[#8E8579]">Date:</span>{' '}
                      {rec.objectDate?.trim() || 'Not recorded'} ·{' '}
                      <span className={geo === 'Not recorded in catalogue' ? 'text-[#D1B06B]' : ''}>
                        {geo}
                      </span>
                    </div>
                    <div className="pt-1 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onInspectObject(String(rec.objectID))}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#D1B06B] hover:text-[#E8CC8C] cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        View Details
                      </button>
                      {isSafeExternalUrl(rec.objectURL) && (
                        <a
                          href={rec.objectURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[11px] text-[#A89F91] hover:text-[#FCFAF5]"
                        >
                          Met
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      );
    }

    case 'data_visualisation': {
      const topFindings = story.keyFindings.slice(0, 3);
      return (
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-[11px] font-mono text-[#D1B06B] uppercase tracking-widest">
                Scene 0{scene.sceneNumber} · {scene.label}
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-semibold text-[#FCFAF5]">
                {scene.title}
              </h3>
            </div>
            <span className="text-[11px] text-[#A89F91]">
              Click any chart bar or slice to explore matching objects below
            </span>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 min-h-[220px] rounded-xl bg-[#191715] border border-[#2D2822] p-3 sm:p-4">
              <AnimatedSceneChart
                sceneId={scene.id}
                chartType={scene.chartType || 'material_categories'}
                analyticsData={story.analyticsData}
                sceneProgress={sceneProgress}
                onInspectSlice={onInspectSlice}
              />
            </div>

            <div className="lg:col-span-4 flex flex-col justify-between gap-2.5 overflow-y-auto">
              {topFindings.map((finding, idx) => (
                <motion.div
                  key={`${finding.label}-${idx}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.16 }}
                  className="rounded-lg border border-[#2F2A24] bg-[#1B1917] p-3 space-y-1"
                >
                  <div className="text-[11px] text-[#A89F91]">{finding.label}</div>
                  <div className="text-base sm:text-lg font-serif font-semibold text-[#D1B06B] tabular-nums">
                    {finding.value}
                  </div>
                  <div className="text-[11px] text-[#C7BFB2] leading-snug line-clamp-2">
                    {finding.detail}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case 'geographical_exploration': {
      const geoSummary = story.analyticsData.geographicalAnalysis.summary;
      return (
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-[11px] font-mono text-[#D1B06B] uppercase tracking-widest">
                Scene 0{scene.sceneNumber} · {scene.label}
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-semibold text-[#FCFAF5]">
                {scene.title}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#D1B06B] tabular-nums">
              Documented Countries: {geoSummary.withCountry.toLocaleString()} · Unrecorded Geography:{' '}
              {geoSummary.missingGeography.toLocaleString()}
            </span>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 min-h-[210px] rounded-xl bg-[#191715] border border-[#2D2822] p-3 sm:p-4">
              <AnimatedSceneChart
                sceneId={scene.id}
                chartType={scene.chartType || 'documented_countries'}
                analyticsData={story.analyticsData}
                sceneProgress={sceneProgress}
                onInspectSlice={onInspectSlice}
              />
            </div>

            <div className="lg:col-span-4 flex flex-col justify-between gap-3">
              <div className="rounded-xl border border-[#4D3F28] bg-[#211C15] p-4 space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#D1B06B]">
                  Unknown-Origin Safeguard
                </div>
                <div className="text-2xl font-serif font-semibold text-[#FCFAF5] tabular-nums">
                  {geoSummary.missingGeography.toLocaleString()} records
                </div>
                <p className="text-xs text-[#C7BFB2] leading-relaxed">
                  Have no recorded country, region, or city and remain labeled{' '}
                  <span className="italic text-[#E8D5AE]">Not recorded in catalogue</span>. Origins
                  are never inferred from culture, artist nationality, or medium.
                </p>
              </div>

              <div className="rounded-xl border border-[#2F2A24] bg-[#1B1917] p-3.5 space-y-1.5 text-xs">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#A89F91]">
                  Recorded Qualifiers
                </div>
                <div className="flex justify-between text-[#E6DFD2] tabular-nums">
                  <span>With Geography Type</span>
                  <span className="font-mono text-[#D1B06B]">
                    {geoSummary.withGeographyType.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[#E6DFD2] tabular-nums">
                  <span>With Documented Region</span>
                  <span className="font-mono text-[#D1B06B]">
                    {geoSummary.withRegion.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[#E6DFD2] tabular-nums">
                  <span>Missing Country Field</span>
                  <span className="font-mono text-[#D1B06B]">
                    {geoSummary.missingCountry.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    case 'key_findings': {
      const thumbRecords = sceneRecords.slice(0, 2);
      return (
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          <div>
            <div className="text-[11px] font-mono text-[#D1B06B] uppercase tracking-widest">
              Scene 0{scene.sceneNumber} · {scene.label}
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-semibold text-[#FCFAF5]">
              {scene.title}
            </h3>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3 content-center">
              {story.keyFindings.slice(0, 4).map((finding, idx) => (
                <motion.div
                  key={`kf-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.18 }}
                  className="rounded-xl border border-[#322D26] bg-[#1B1917] p-4 space-y-1.5"
                >
                  <div className="text-xs text-[#A89F91]">{finding.label}</div>
                  <div className="text-xl font-serif font-semibold text-[#D1B06B] tabular-nums">
                    {finding.value}
                  </div>
                  <p className="text-xs text-[#CFC7BA] leading-snug">{finding.detail}</p>
                </motion.div>
              ))}
            </div>

            <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-3">
              {thumbRecords.map((rec) => (
                <button
                  key={`kf-thumb-${rec.recordKey}`}
                  type="button"
                  onClick={() => onInspectObject(String(rec.objectID))}
                  className="rounded-xl border border-[#2F2A24] bg-[#191715] hover:border-[#B89248] overflow-hidden flex items-center gap-3 p-2.5 text-left transition-colors cursor-pointer"
                >
                  <div className="w-20 h-20 rounded-lg bg-[#211E1A] overflow-hidden shrink-0">
                    <MuseumImage record={rec} variant="card" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-[10px] font-mono text-[#D1B06B] tabular-nums">
                      ID {rec.objectID}
                    </div>
                    <div className="text-xs font-serif font-semibold text-[#FCFAF5] line-clamp-2">
                      {rec.title || 'Untitled Object'}
                    </div>
                    <div className="text-[11px] text-[#9E9589] truncate">
                      {rec.objectDate || 'Date unrecorded'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case 'conclusion': {
      const refs = story.catalogueReferences.slice(0, 4);
      return (
        <div className="flex-1 min-h-0 flex flex-col justify-between gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 space-y-2.5">
              <div className="text-[11px] font-mono text-[#D1B06B] uppercase tracking-widest">
                Scene 0{scene.sceneNumber} · {scene.label}
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-semibold text-[#FCFAF5]">
                {scene.title}
              </h3>
              <p className="text-sm text-[#DFD7CA] leading-relaxed">{story.conclusion}</p>
            </div>

            <div className="lg:col-span-5 rounded-xl border border-[#3B3328] bg-[#1B1814] p-4 space-y-1.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#D1B06B]">
                Data Limitation Note
              </div>
              <p className="text-xs text-[#BEB6A9] leading-relaxed line-clamp-5">
                {story.dataLimitations}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#A89F91]">
                Original Met Catalogue References
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onJumpToReferences}
                  className="text-xs font-medium text-[#D1B06B] hover:underline cursor-pointer"
                >
                  Inspect All References ↓
                </button>
                <span className="text-[#4F473D]">·</span>
                <button
                  type="button"
                  onClick={onRestart}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#FCFAF5] hover:text-[#D1B06B] cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Watch Again
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {refs.map((ref) => (
                <div
                  key={`end-ref-${ref.objectID}`}
                  className="rounded-lg border border-[#2F2A24] bg-[#191715] p-3 flex flex-col justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-mono text-[#D1B06B] tabular-nums">
                      ID {ref.objectID}
                    </div>
                    <div className="text-xs font-serif font-semibold text-[#FCFAF5] line-clamp-1">
                      {ref.title || 'Untitled Object'}
                    </div>
                    <div className="text-[11px] text-[#9E9589] truncate">
                      {ref.objectDate || 'Date unrecorded'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#2A251F]">
                    <button
                      type="button"
                      onClick={() => onInspectObject(String(ref.objectID))}
                      className="inline-flex items-center gap-1 text-[11px] text-[#E6DFD2] hover:text-[#D1B06B] cursor-pointer"
                    >
                      <Eye className="w-3 h-3 text-[#D1B06B]" />
                      Details
                    </button>
                    {isSafeExternalUrl(ref.objectURL) && (
                      <a
                        href={ref.objectURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[11px] text-[#D1B06B] hover:underline"
                      >
                        Met
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
  }
}
