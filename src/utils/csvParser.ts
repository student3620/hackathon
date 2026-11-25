import Papa from 'papaparse';
import { MuseumRecord, DatasetStats } from '../types/museum';
import { isPublicDomainPermitted, getCardImageCandidates } from './imagePolicy';

export interface ParseResult {
  records: MuseumRecord[];
  duplicateIdCount: number;
  error?: string;
}

export const MAX_CURATED_RECORDS = 5000;

export function parseMuseumCSV(fileText: string): ParseResult {
  try {
    const parsed = Papa.parse<Record<string, unknown>>(fileText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
      return {
        records: [],
        duplicateIdCount: 0,
        error: `CSV Parsing Error: ${parsed.errors[0].message} at row ${parsed.errors[0].row ?? 'unknown'}`,
      };
    }

    const rawRows = parsed.data;

    if (!rawRows || rawRows.length === 0) {
      return {
        records: [],
        duplicateIdCount: 0,
        error: 'The uploaded CSV file contains no catalogue records.',
      };
    }

    // PS 223 requirement: reject files over 5,000 records instead of silently truncating
    if (rawRows.length > MAX_CURATED_RECORDS) {
      return {
        records: [],
        duplicateIdCount: 0,
        error: `This file contains ${rawRows.length.toLocaleString()} records. MuseumLens requires a curated Met Open Access CSV with at most ${MAX_CURATED_RECORDS.toLocaleString()} records.`,
      };
    }

    // Build a normalized column lookup map from the header row once for performance
    const headers = Object.keys(rawRows[0] || {});
    const normalizedHeaderMap = new Map<string, string>();
    for (const header of headers) {
      const norm = header.replace(/[\s_-]/g, '').toLowerCase();
      if (!normalizedHeaderMap.has(norm)) {
        normalizedHeaderMap.set(norm, header);
      }
    }

    const resolveColumnKey = (candidates: string[]): string | undefined => {
      for (const candidate of candidates) {
        if (headers.includes(candidate)) return candidate;
      }
      for (const candidate of candidates) {
        const norm = candidate.replace(/[\s_-]/g, '').toLowerCase();
        const mapped = normalizedHeaderMap.get(norm);
        if (mapped) return mapped;
      }
      return undefined;
    };

    const col = {
      objectID: resolveColumnKey(['Object ID', 'ObjectID', 'object_id', 'id']),
      accessionNumber: resolveColumnKey(['Accession Number', 'AccessionNumber', 'accession_number', 'AccessionNumber']),
      title: resolveColumnKey(['Title', 'title']),
      objectName: resolveColumnKey(['Object Name', 'ObjectName', 'object_name']),
      objectDate: resolveColumnKey(['Object Date', 'ObjectDate', 'object_date']),
      objectBeginDate: resolveColumnKey(['Object Begin Date', 'ObjectBeginDate', 'begin_date', 'Begin Date']),
      objectEndDate: resolveColumnKey(['Object End Date', 'ObjectEndDate', 'end_date', 'End Date']),
      medium: resolveColumnKey(['Medium', 'medium']),
      culture: resolveColumnKey(['Culture', 'culture']),
      period: resolveColumnKey(['Period', 'period']),
      dynasty: resolveColumnKey(['Dynasty', 'dynasty']),
      geographyType: resolveColumnKey(['Geography Type', 'GeographyType', 'geography_type']),
      city: resolveColumnKey(['City', 'city']),
      country: resolveColumnKey(['Country', 'country']),
      region: resolveColumnKey(['Region', 'region']),
      department: resolveColumnKey(['Department', 'department']),
      classification: resolveColumnKey(['Classification', 'classification']),
      primaryImage: resolveColumnKey(['Primary Image', 'PrimaryImage', 'primary_image', 'primaryImage']),
      primaryImageSmall: resolveColumnKey(['Primary Image Small', 'PrimaryImageSmall', 'primary_image_small', 'primaryImageSmall', 'image_url']),
      isPublicDomain: resolveColumnKey(['Is Public Domain', 'IsPublicDomain', 'is_public_domain', 'isPublicDomain']),
      objectURL: resolveColumnKey(['Object URL', 'ObjectURL', 'object_url', 'Link Resource', 'link_resource', 'link']),
    };

    if (!col.objectID && !col.title && !col.objectName) {
      return {
        records: [],
        duplicateIdCount: 0,
        error: 'Invalid CSV format: expected Met Open Access catalogue columns such as Object ID, Title, or Object Name.',
      };
    }

    const readField = (row: Record<string, unknown>, key?: string): string => {
      if (!key) return '';
      const val = row[key];
      if (val === undefined || val === null) return '';
      return String(val).trim();
    };

    const seenIds = new Map<string, number>();
    let duplicateIdCount = 0;
    const records: MuseumRecord[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];

      const rawObjectID = readField(row, col.objectID);
      const displayObjectID = rawObjectID || `row-${i + 1}`;

      const prevCount = seenIds.get(displayObjectID) || 0;
      seenIds.set(displayObjectID, prevCount + 1);
      if (prevCount > 0) {
        duplicateIdCount++;
      }
      const recordKey = prevCount === 0 ? displayObjectID : `${displayObjectID}__dup${prevCount}`;

      const accessionNumber = readField(row, col.accessionNumber);
      const title = readField(row, col.title);
      const objectName = readField(row, col.objectName);
      const objectDate = readField(row, col.objectDate);
      const objectBeginDate = readField(row, col.objectBeginDate);
      const objectEndDate = readField(row, col.objectEndDate);
      const medium = readField(row, col.medium);
      const culture = readField(row, col.culture);
      const period = readField(row, col.period);
      const dynasty = readField(row, col.dynasty);
      const geographyType = readField(row, col.geographyType);
      const city = readField(row, col.city);
      const country = readField(row, col.country);
      const region = readField(row, col.region);
      const department = readField(row, col.department);
      const classification = readField(row, col.classification);

      // Preserve exact catalogue image URLs without fabricating missing links
      const primaryImage = readField(row, col.primaryImage);
      const primaryImageSmall = readField(row, col.primaryImageSmall);

      const isPubRaw = col.isPublicDomain ? (row[col.isPublicDomain] as boolean | string | undefined) : undefined;
      const isPublicDomain = isPublicDomainPermitted(isPubRaw);

      const rawUrl = readField(row, col.objectURL);
      const objectURL =
        rawUrl ||
        (/^\d+$/.test(rawObjectID) ? `https://www.metmuseum.org/art/collection/search/${rawObjectID}` : '');

      records.push({
        recordKey,
        objectID: displayObjectID,
        accessionNumber,
        title: title || objectName || 'Untitled Catalogue Record',
        objectName,
        objectDate,
        objectBeginDate,
        objectEndDate,
        medium,
        culture,
        period,
        dynasty,
        geographyType,
        city,
        country,
        region,
        department,
        classification,
        primaryImage,
        primaryImageSmall,
        isPublicDomain,
        objectURL,
      });
    }

    return { records, duplicateIdCount };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      records: [],
      duplicateIdCount: 0,
      error: `Failed to parse CSV: ${message}`,
    };
  }
}

export function calculateDatasetStats(records: MuseumRecord[]): DatasetStats {
  const totalObjects = records.length;
  let withDates = 0;
  let withMaterials = 0;
  let withGeography = 0;
  let missingGeography = 0;
  let publicDomainWithImages = 0;

  for (const r of records) {
    const hasDate = Boolean(
      (r.objectDate && r.objectDate.trim() !== '') ||
        (r.objectBeginDate !== '' && r.objectBeginDate !== null && r.objectBeginDate !== undefined) ||
        (r.objectEndDate !== '' && r.objectEndDate !== null && r.objectEndDate !== undefined)
    );
    const hasMaterial = Boolean(r.medium && r.medium.trim() !== '');
    const hasGeo = Boolean(
      (r.country && r.country.trim() !== '') ||
        (r.region && r.region.trim() !== '') ||
        (r.city && r.city.trim() !== '')
    );

    if (hasDate) withDates++;
    if (hasMaterial) withMaterials++;
    if (hasGeo) {
      withGeography++;
    } else {
      missingGeography++;
    }
    if (getCardImageCandidates(r).length > 0) {
      publicDomainWithImages++;
    }
  }

  return {
    totalObjects,
    withDates,
    withMaterials,
    withGeography,
    missingGeography,
    publicDomainWithImages,
  };
}
