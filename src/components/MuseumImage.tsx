import React, { useState, useEffect, useMemo } from 'react';
import { ImageOff, ShieldOff, Loader2 } from 'lucide-react';
import { MuseumRecord } from '../types/museum';
import {
  getCardImageCandidates,
  getDetailImageCandidates,
  isPublicDomainPermitted,
} from '../utils/imagePolicy';

interface MuseumImageProps {
  record: MuseumRecord;
  variant: 'card' | 'detail' | 'lightbox';
  className?: string;
  imageClassName?: string;
}

export const MuseumImage: React.FC<MuseumImageProps> = ({
  record,
  variant,
  className = '',
  imageClassName = '',
}) => {
  const permitted = isPublicDomainPermitted(record.isPublicDomain);

  const candidates = useMemo(() => {
    return variant === 'card'
      ? getCardImageCandidates(record)
      : getDetailImageCandidates(record);
  }, [
    variant,
    record.objectID,
    record.isPublicDomain,
    record.primaryImage,
    record.primaryImageSmall,
  ]);

  const [candidateIndex, setCandidateIndex] = useState(0);

  // Reset fallback index whenever the record identity or image URLs change
  useEffect(() => {
    setCandidateIndex(0);
  }, [
    record.recordKey,
    record.objectID,
    record.primaryImage,
    record.primaryImageSmall,
    record.isPublicDomain,
    variant,
  ]);

  const activeSrc = candidateIndex < candidates.length ? candidates[candidateIndex] : null;
  const isDarkSurface = variant === 'lightbox';
  const isResolvingOfficialImage = permitted && candidates.length === 0 && !record.imageChecked;
  const displayTitle = record.title || record.objectName || `Museum Object ${record.objectID}`;

  if (!activeSrc) {
    return (
      <div
        className={`flex flex-col items-center justify-center text-center px-6 py-8 select-none ${
          isDarkSurface ? 'text-[#A89F91]' : 'text-[#6E665B]'
        } ${className}`}
      >
        {!permitted ? (
          <>
            <ShieldOff className="w-8 h-8 stroke-[1.5] mb-2.5 opacity-70" />
            <span className="text-sm font-medium tracking-tight">
              Public-Domain Image Restricted
            </span>
            <span className="text-xs mt-1 opacity-80 max-w-[220px] leading-relaxed">
              Catalogue does not confirm open-access image usage for Object {record.objectID}.
            </span>
          </>
        ) : isResolvingOfficialImage ? (
          <>
            <Loader2 className="w-6 h-6 stroke-[1.75] mb-2.5 opacity-70 animate-spin text-[#96722D]" />
            <span className="text-xs font-medium tracking-tight">
              Loading Met photograph...
            </span>
          </>
        ) : (
          <>
            <ImageOff className="w-8 h-8 stroke-[1.5] mb-2.5 opacity-70" />
            <span className="text-sm font-medium tracking-tight">
              Image Unavailable
            </span>
            <span className="text-xs mt-1 opacity-80 max-w-[220px] leading-relaxed">
              No accessible photograph recorded for Object {record.objectID}.
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex items-center justify-center ${className}`}>
      <img
        key={`${record.recordKey}-${activeSrc}`}
        src={activeSrc}
        alt={`${displayTitle} (Object ID ${record.objectID})`}
        referrerPolicy="no-referrer"
        loading={variant === 'card' ? 'lazy' : 'eager'}
        onError={() => {
          setCandidateIndex((prev) => prev + 1);
        }}
        className={`max-w-full max-h-full w-full h-full object-contain ${imageClassName}`}
      />
    </div>
  );
};
