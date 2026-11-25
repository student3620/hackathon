import { MuseumRecord } from '../types/museum';

/**
 * Strictly validates public-domain permission from either Boolean values
 * or CSV string representations ("true", "True", "TRUE", "false", "False", etc.).
 * Unrecognized or missing values return false so unverified images are never shown.
 */
export function isPublicDomainPermitted(value: boolean | string | number | null | undefined): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === 'yes' || normalized === '1') {
      return true;
    }
    if (normalized === 'false' || normalized === 'no' || normalized === '0' || normalized === '') {
      return false;
    }
  }
  return false;
}

/**
 * Validates that an image URL string is an absolute HTTP(S) URL.
 */
export function isValidImageUrl(url: string | null | undefined): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  return /^https?:\/\/.+/i.test(trimmed);
}

/**
 * Returns the ordered, deduplicated image URL candidates for a collection card,
 * strictly belonging to the given record:
 * 1. primaryImageSmall
 * 2. primaryImage (fallback if primaryImageSmall is missing or fails to load)
 * Returns an empty array if public-domain permission is not established.
 */
export function getCardImageCandidates(record: MuseumRecord): string[] {
  if (!isPublicDomainPermitted(record.isPublicDomain)) {
    return [];
  }
  const candidates: string[] = [];
  if (isValidImageUrl(record.primaryImageSmall)) {
    candidates.push(record.primaryImageSmall.trim());
  }
  if (isValidImageUrl(record.primaryImage)) {
    const primary = record.primaryImage.trim();
    if (!candidates.includes(primary)) {
      candidates.push(primary);
    }
  }
  return candidates;
}

/**
 * Returns the ordered, deduplicated image URL candidates for the detailed view
 * and enlarged image preview, strictly belonging to the given record:
 * 1. primaryImage
 * 2. primaryImageSmall (fallback if primaryImage is missing or fails to load)
 * Returns an empty array if public-domain permission is not established.
 */
export function getDetailImageCandidates(record: MuseumRecord): string[] {
  if (!isPublicDomainPermitted(record.isPublicDomain)) {
    return [];
  }
  const candidates: string[] = [];
  if (isValidImageUrl(record.primaryImage)) {
    candidates.push(record.primaryImage.trim());
  }
  if (isValidImageUrl(record.primaryImageSmall)) {
    const small = record.primaryImageSmall.trim();
    if (!candidates.includes(small)) {
      candidates.push(small);
    }
  }
  return candidates;
}

/**
 * Formats documented geographical metadata strictly from catalogue fields,
 * adhering to PS 223 unknown-origin protection (never deriving geography from culture/medium).
 */
export function getDocumentedGeography(record: MuseumRecord): {
  hasGeography: boolean;
  displayText: string;
  geographyType: string;
} {
  const parts: string[] = [];
  const city = record.city?.trim();
  const region = record.region?.trim();
  const country = record.country?.trim();
  const geographyType = record.geographyType?.trim() || '';

  if (city) parts.push(city);
  if (region && !parts.includes(region)) parts.push(region);
  if (country && !parts.includes(country)) parts.push(country);

  if (parts.length === 0) {
    return {
      hasGeography: false,
      displayText: 'Not recorded in catalogue',
      geographyType,
    };
  }

  return {
    hasGeography: true,
    displayText: parts.join(', '),
    geographyType,
  };
}
