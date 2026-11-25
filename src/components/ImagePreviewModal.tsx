import React, { useEffect } from 'react';
import { X, ExternalLink, FileText } from 'lucide-react';
import { MuseumRecord } from '../types/museum';
import { MuseumImage } from './MuseumImage';

interface ImagePreviewModalProps {
  record: MuseumRecord | null;
  onClose: () => void;
  onOpenDetails: (record: MuseumRecord) => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  record,
  onClose,
  onOpenDetails,
}) => {
  useEffect(() => {
    if (!record) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [record, onClose]);

  if (!record) return null;

  const displayTitle = record.title || record.objectName || 'Untitled Catalogue Record';

  return (
    <div
      className="fixed inset-0 z-50 bg-[#141311]/92 flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`Image preview for ${displayTitle}`}
      onClick={onClose}
    >
      <div
        className="bg-[#1B1917] border border-[#38342F] rounded-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#2E2A25] bg-[#171513]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-[#D1B06B] tabular-nums">
              <span>Object ID {record.objectID}</span>
              {record.accessionNumber && (
                <>
                  <span className="text-[#5C554C]" aria-hidden="true">/</span>
                  <span className="text-[#B8B0A4]">Acc. {record.accessionNumber}</span>
                </>
              )}
              {record.objectDate && (
                <>
                  <span className="text-[#5C554C]" aria-hidden="true">/</span>
                  <span className="text-[#B8B0A4] font-sans">{record.objectDate}</span>
                </>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-serif font-semibold text-[#FCFAF5] mt-1 leading-snug">
              {displayTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close image preview"
            className="shrink-0 p-2 rounded-lg text-[#B8B0A4] hover:text-[#FCFAF5] hover:bg-[#2A2622] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 bg-[#141311] p-4 sm:p-8 flex items-center justify-center overflow-hidden">
          <div className="w-full h-[60vh] sm:h-[66vh] flex items-center justify-center">
            <MuseumImage
              key={`lightbox-${record.recordKey}`}
              record={record}
              variant="lightbox"
              imageClassName="rounded"
            />
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-[#2E2A25] bg-[#171513] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#B8B0A4] truncate max-w-md">
            {record.medium || 'Medium not recorded in catalogue'}
            {record.department ? ` · ${record.department}` : ''}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const target = record;
                onClose();
                onOpenDetails(target);
              }}
              className="px-4 py-2 rounded-lg bg-[#262320] hover:bg-[#322E2A] border border-[#3E3933] text-[#F5F0E6] text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#D1B06B]" />
              View Full Record
            </button>

            {record.objectURL && (
              <a
                href={record.objectURL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-[#B89248] hover:bg-[#C9A358] text-[#141311] text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Met Catalogue
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#262320] hover:bg-[#322E2A] text-[#D8D1C5] text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
