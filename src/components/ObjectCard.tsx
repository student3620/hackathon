import React from 'react';
import { Maximize2, ArrowUpRight } from 'lucide-react';
import { MuseumRecord } from '../types/museum';
import { MuseumImage } from './MuseumImage';
import {
  getCardImageCandidates,
  getDocumentedGeography,
  isPublicDomainPermitted,
} from '../utils/imagePolicy';

interface ObjectCardProps {
  record: MuseumRecord;
  onPreviewImage: (record: MuseumRecord) => void;
  onSelectDetails: (record: MuseumRecord) => void;
}

export const ObjectCard: React.FC<ObjectCardProps> = ({
  record,
  onPreviewImage,
  onSelectDetails,
}) => {
  const permitted = isPublicDomainPermitted(record.isPublicDomain);
  const hasImageCandidate = getCardImageCandidates(record).length > 0;
  const geography = getDocumentedGeography(record);
  const hasCulture = Boolean(record.culture && record.culture.trim() !== '');
  const displayTitle = record.title || record.objectName || 'Untitled Catalogue Record';

  return (
    <article
      className="bg-[#FCFAF5] border border-[#DDD4C4] hover:border-[#B89248] rounded-xl overflow-hidden flex flex-col transition-colors duration-150 shadow-sm"
      data-object-id={String(record.objectID)}
    >
      {/* Dedicated clickable image area using object-fit: contain */}
      <button
        type="button"
        onClick={() => onPreviewImage(record)}
        aria-label={`Enlarge photograph of ${displayTitle} (Object ID ${record.objectID})`}
        className="group relative w-full aspect-[4/3] bg-[#ECE6DA] border-b border-[#E2DACB] p-4 flex items-center justify-center overflow-hidden cursor-pointer text-left"
      >
        <MuseumImage
          key={`card-img-${record.recordKey}`}
          record={record}
          variant="card"
          imageClassName="transition-transform duration-200 group-hover:scale-[1.02]"
        />

        {hasImageCandidate && (
          <span
            className="absolute bottom-3 right-3 bg-[#1B1917]/80 text-[#FCFAF5] px-2.5 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150"
            aria-hidden="true"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#D1B06B]" />
            Preview
          </span>
        )}
      </button>

      {/* Archival card body */}
      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-3">
          {/* Unboxed archival identifier line */}
          <div className="flex items-center justify-between gap-2 text-xs text-[#6B6357]">
            <span className="font-mono font-medium text-[#755821] tabular-nums shrink-0">
              ID {record.objectID}
            </span>
            {record.department && (
              <span className="truncate text-right">{record.department}</span>
            )}
          </div>

          {/* Primary object title */}
          <div>
            <h3 className="text-lg font-serif font-semibold text-[#1C1917] leading-snug line-clamp-2">
              <button
                type="button"
                onClick={() => onSelectDetails(record)}
                className="text-left hover:text-[#755821] transition-colors cursor-pointer"
              >
                {displayTitle}
              </button>
            </h3>
            {record.objectName &&
              record.title &&
              record.objectName.toLowerCase() !== record.title.toLowerCase() && (
                <p className="text-xs text-[#6B6357] mt-1 truncate">{record.objectName}</p>
              )}
          </div>

          {/* Structured catalogue metadata */}
          <dl className="pt-3 border-t border-[#E8E0D2] space-y-2 text-sm">
            <div className="grid grid-cols-[88px_1fr] gap-2 items-baseline">
              <dt className="text-xs font-medium text-[#72695D]">Date</dt>
              <dd className="text-[#292524] truncate">
                {record.objectDate || <span className="text-[#877E72] italic">Not recorded</span>}
              </dd>
            </div>

            <div className="grid grid-cols-[88px_1fr] gap-2 items-baseline">
              <dt className="text-xs font-medium text-[#72695D]">Medium</dt>
              <dd className="text-[#292524] line-clamp-1" title={record.medium || undefined}>
                {record.medium || <span className="text-[#877E72] italic">Not recorded</span>}
              </dd>
            </div>

            {hasCulture && (
              <div className="grid grid-cols-[88px_1fr] gap-2 items-baseline">
                <dt className="text-xs font-medium text-[#72695D]">Culture</dt>
                <dd className="text-[#292524] truncate">{record.culture}</dd>
              </div>
            )}

            <div className="grid grid-cols-[88px_1fr] gap-2 items-baseline">
              <dt className="text-xs font-medium text-[#72695D]">Geography</dt>
              <dd className="min-w-0">
                {geography.hasGeography ? (
                  <span className="text-[#292524] block truncate" title={geography.displayText}>
                    {geography.geographyType ? `${geography.geographyType}: ` : ''}
                    {geography.displayText}
                  </span>
                ) : (
                  <span className="text-[#8A6326] italic block truncate">
                    Not recorded in catalogue
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Card footer */}
        <div className="pt-3.5 border-t border-[#E8E0D2] flex items-center justify-between gap-3">
          <span className="text-xs text-[#6B6357]">
            {permitted ? 'Open Access' : 'Image Restricted'}
          </span>

          <button
            type="button"
            onClick={() => onSelectDetails(record)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1B1917] hover:bg-[#2F2B26] text-[#FCFAF5] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            View Details
            <ArrowUpRight className="w-3.5 h-3.5 text-[#D1B06B]" />
          </button>
        </div>
      </div>
    </article>
  );
};
