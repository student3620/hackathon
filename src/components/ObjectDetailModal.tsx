import React, { useEffect } from 'react';
import { X, ExternalLink, Maximize2, ShieldAlert } from 'lucide-react';
import { MuseumRecord } from '../types/museum';
import { MuseumImage } from './MuseumImage';
import {
  getDetailImageCandidates,
  getDocumentedGeography,
  isPublicDomainPermitted,
} from '../utils/imagePolicy';

interface ObjectDetailModalProps {
  record: MuseumRecord | null;
  onClose: () => void;
  onOpenImagePreview: (record: MuseumRecord) => void;
}

export const ObjectDetailModal: React.FC<ObjectDetailModalProps> = ({
  record,
  onClose,
  onOpenImagePreview,
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

  const permitted = isPublicDomainPermitted(record.isPublicDomain);
  const hasDetailImage = getDetailImageCandidates(record).length > 0;
  const geography = getDocumentedGeography(record);
  const displayTitle = record.title || record.objectName || 'Untitled Catalogue Record';

  const metadataRows: { label: string; value: string | number; isGeography?: boolean }[] = [
    { label: 'Object ID', value: record.objectID },
    { label: 'Accession Number', value: record.accessionNumber },
    { label: 'Title', value: record.title },
    { label: 'Object Name', value: record.objectName },
    { label: 'Object Date', value: record.objectDate },
    { label: 'Begin Date', value: record.objectBeginDate },
    { label: 'End Date', value: record.objectEndDate },
    { label: 'Medium', value: record.medium },
    { label: 'Culture', value: record.culture },
    { label: 'Period', value: record.period },
    { label: 'Dynasty', value: record.dynasty },
    { label: 'Geography Type', value: record.geographyType, isGeography: true },
    { label: 'City', value: record.city, isGeography: true },
    { label: 'Country', value: record.country, isGeography: true },
    { label: 'Region', value: record.region, isGeography: true },
    { label: 'Department', value: record.department },
    { label: 'Classification', value: record.classification },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#141311]/85 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`Catalogue details for ${displayTitle}`}
      onClick={onClose}
    >
      <div
        className="bg-[#FCFAF5] border border-[#D4C9B6] rounded-xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl text-[#1C1917] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Charcoal header bar */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 bg-[#1B1917] border-b border-[#2E2A25] text-[#FCFAF5] shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono text-[#D1B06B] tabular-nums">
              <span>Object ID {record.objectID}</span>
              {record.accessionNumber && (
                <>
                  <span className="text-[#5C554C]" aria-hidden="true">/</span>
                  <span className="text-[#C8C0B4]">Acc. {record.accessionNumber}</span>
                </>
              )}
              {record.department && (
                <>
                  <span className="text-[#5C554C]" aria-hidden="true">/</span>
                  <span className="text-[#C8C0B4] font-sans">{record.department}</span>
                </>
              )}
            </div>
            <h2 className="text-xl font-serif font-semibold text-[#FCFAF5] mt-1 leading-snug">
              {displayTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close object details"
            className="shrink-0 p-2 rounded-lg text-[#B8B0A4] hover:text-[#FCFAF5] hover:bg-[#2A2622] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable archival body */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
            {/* Artwork column */}
            <div className="lg:col-span-5 space-y-4">
              <button
                type="button"
                onClick={() => onOpenImagePreview(record)}
                disabled={!hasDetailImage}
                aria-label={
                  hasDetailImage
                    ? `Open full-size image preview for ${record.title}`
                    : `No public-domain photograph available for ${record.title}`
                }
                className={`group relative w-full aspect-[4/3] rounded-lg bg-[#ECE6DA] border border-[#DDD4C4] p-4 flex items-center justify-center overflow-hidden ${
                  hasDetailImage ? 'cursor-pointer hover:border-[#B89248]' : 'cursor-default'
                }`}
              >
                <MuseumImage
                  key={`detail-img-${record.recordKey}`}
                  record={record}
                  variant="detail"
                />
                {hasDetailImage && (
                  <span className="absolute bottom-3 right-3 bg-[#1B1917]/85 text-[#FCFAF5] px-2.5 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3.5 h-3.5 text-[#D1B06B]" />
                    Enlarge
                  </span>
                )}
              </button>

              <div className="space-y-2.5">
                {record.objectURL ? (
                  <a
                    href={record.objectURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-lg bg-[#B89248] hover:bg-[#A6813B] text-[#141311] font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Original Met Catalogue Page
                  </a>
                ) : (
                  <div className="w-full py-2.5 px-4 rounded-lg bg-[#F0EAE0] text-[#72695D] text-xs text-center border border-[#DDD4C4]">
                    Original catalogue URL not recorded
                  </div>
                )}

                <div className="rounded-lg bg-[#F4EFE4] border border-[#E2DACB] p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#755821]">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Geographical Verification (PS 223)</span>
                  </div>
                  <p className="text-xs text-[#4A443C] leading-relaxed">
                    {geography.hasGeography ? (
                      <>
                        Documented catalogue geography:{' '}
                        <strong className="font-semibold text-[#1C1917]">
                          {geography.geographyType ? `${geography.geographyType} ` : ''}
                          {geography.displayText}
                        </strong>
                        . Cultural attribution is displayed separately.
                      </>
                    ) : (
                      <>
                        Geographical origin is{' '}
                        <strong className="font-semibold text-[#755821]">
                          Not recorded in catalogue
                        </strong>
                        . MuseumLens preserves missing origin values and never infers location from
                        culture, medium, or imagery.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Catalogue fields column */}
            <div className="lg:col-span-7">
              <div className="flex items-baseline justify-between border-b border-[#DDD4C4] pb-2.5 mb-4">
                <h3 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wider">
                  Original Catalogue Record
                </h3>
                <span className="text-xs text-[#6B6357]">
                  Public Domain:{' '}
                  <strong className="font-semibold text-[#1C1917]">
                    {permitted ? 'Permitted (Open Access)' : 'Not Confirmed'}
                  </strong>
                </span>
              </div>

              <dl className="divide-y divide-[#E8E0D2] border-y border-[#E8E0D2]">
                {metadataRows.map((row) => {
                  const isEmpty =
                    row.value === undefined ||
                    row.value === null ||
                    String(row.value).trim() === '';
                  const isMissingGeo = Boolean(row.isGeography && isEmpty);

                  return (
                    <div
                      key={row.label}
                      className="py-2.5 grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-1 sm:gap-4 items-baseline"
                    >
                      <dt className="text-xs font-medium text-[#6B6357]">{row.label}</dt>
                      <dd
                        className={`text-sm ${
                          isMissingGeo
                            ? 'text-[#8A6326] italic'
                            : isEmpty
                            ? 'text-[#8C8377] italic'
                            : 'text-[#1C1917] font-medium'
                        }`}
                      >
                        {isMissingGeo
                          ? 'Not recorded in catalogue'
                          : isEmpty
                          ? 'Not recorded'
                          : String(row.value)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E2DACB] bg-[#F4EFE4] flex items-center justify-between gap-4 shrink-0">
          <span className="text-xs font-mono text-[#6B6357] tabular-nums">
            Catalogue Record · Object ID {record.objectID}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1B1917] hover:bg-[#2F2B26] text-[#FCFAF5] text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
