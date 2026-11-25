import type { MuseumRecord } from '../src/types/museum.ts';
import type {
  AnalyticsFilterOptions,
  AnalyticsFiltersState,
  AnalyticsSummaryResponse,
  CenturyBucket,
  DataCompletenessItem,
  DateAnalysisSummary,
  DateExtremeRecord,
  GeographyCountItem,
  GeographySummary,
  HistoricalPeriodItem,
  MaterialAnalysisSummary,
  MaterialCategoryItem,
  MaterialFrequencyItem,
  MaterialVsPeriodRow,
} from '../src/types/analytics.ts';
import { RESERVOIR_SEED } from './metDatasetService.ts';

export const MISSING_COUNTRY_VALUE = '__MISSING_COUNTRY__';

interface YearBucketDef {
  id: string;
  label: string;
  shortLabel: string;
  startYear: number;
  endYear: number;
}

interface PeriodDef extends YearBucketDef {
  spanLabel: string;
}

export const CENTURY_BUCKETS: YearBucketDef[] = [
  { id: 'before-3000-bce', label: 'Before 3000 BCE', shortLabel: '<3000 BCE', startYear: -1000000, endYear: -3001 },
  { id: '30c-21c-bce', label: '30th–21st c. BCE', shortLabel: '30–21c BCE', startYear: -3000, endYear: -2001 },
  { id: '20c-11c-bce', label: '20th–11th c. BCE', shortLabel: '20–11c BCE', startYear: -2000, endYear: -1001 },
  { id: '10c-6c-bce', label: '10th–6th c. BCE', shortLabel: '10–6c BCE', startYear: -1000, endYear: -501 },
  { id: '5c-1c-bce', label: '5th–1st c. BCE', shortLabel: '5–1c BCE', startYear: -500, endYear: -1 },
  { id: '1c-5c-ce', label: '1st–5th c. CE', shortLabel: '1–5c CE', startYear: 1, endYear: 500 },
  { id: '6c-10c-ce', label: '6th–10th c. CE', shortLabel: '6–10c CE', startYear: 501, endYear: 1000 },
  { id: '11c-14c-ce', label: '11th–14th c. CE', shortLabel: '11–14c CE', startYear: 1001, endYear: 1400 },
  { id: '15c-ce', label: '15th Century CE', shortLabel: '15th c.', startYear: 1401, endYear: 1500 },
  { id: '16c-ce', label: '16th Century CE', shortLabel: '16th c.', startYear: 1501, endYear: 1600 },
  { id: '17c-ce', label: '17th Century CE', shortLabel: '17th c.', startYear: 1601, endYear: 1700 },
  { id: '18c-ce', label: '18th Century CE', shortLabel: '18th c.', startYear: 1701, endYear: 1800 },
  { id: '19c-ce', label: '19th Century CE', shortLabel: '19th c.', startYear: 1801, endYear: 1900 },
  { id: '20c-ce', label: '20th Century CE', shortLabel: '20th c.', startYear: 1901, endYear: 2000 },
  { id: '21c-ce', label: '21st Century CE', shortLabel: '21st c.', startYear: 2001, endYear: 2100 },
];

export const HISTORICAL_PERIODS: PeriodDef[] = [
  {
    id: 'prehistoric',
    label: 'Prehistoric & Early Antiquity',
    shortLabel: 'Prehistoric',
    spanLabel: 'Before 3000 BCE',
    startYear: -1000000,
    endYear: -3001,
  },
  {
    id: 'bronze-age',
    label: 'Ancient Bronze Age',
    shortLabel: 'Bronze Age',
    spanLabel: '3000–1200 BCE',
    startYear: -3000,
    endYear: -1200,
  },
  {
    id: 'classical',
    label: 'Iron Age & Classical Antiquity',
    shortLabel: 'Classical',
    spanLabel: '1199 BCE–500 CE',
    startYear: -1199,
    endYear: 500,
  },
  {
    id: 'medieval',
    label: 'Medieval Period',
    shortLabel: 'Medieval',
    spanLabel: '501–1400 CE',
    startYear: 501,
    endYear: 1400,
  },
  {
    id: 'early-modern',
    label: 'Renaissance & Early Modern',
    shortLabel: 'Early Modern',
    spanLabel: '1401–1700 CE',
    startYear: 1401,
    endYear: 1700,
  },
  {
    id: '18th-century',
    label: '18th Century',
    shortLabel: '18th c.',
    spanLabel: '1701–1800 CE',
    startYear: 1701,
    endYear: 1800,
  },
  {
    id: '19th-century',
    label: '19th Century',
    shortLabel: '19th c.',
    spanLabel: '1801–1900 CE',
    startYear: 1801,
    endYear: 1900,
  },
  {
    id: '20th-century',
    label: '20th Century',
    shortLabel: '20th c.',
    spanLabel: '1901–2000 CE',
    startYear: 1901,
    endYear: 2000,
  },
  {
    id: '21st-century',
    label: '21st Century',
    shortLabel: '21st c.',
    spanLabel: '2001 CE–Present',
    startYear: 2001,
    endYear: 2100,
  },
];

interface MaterialCategoryRule {
  id: 'metal' | 'stone' | 'wood' | 'ceramics' | 'textiles' | 'paper' | 'glass' | 'paint' | 'other';
  label: string;
  keywordsDescription: string;
  pattern: RegExp | null;
}

export const MATERIAL_CATEGORY_RULES: MaterialCategoryRule[] = [
  {
    id: 'paper',
    label: 'Paper & Prints',
    keywordsDescription: 'paper, etching, engraving, lithograph, woodcut, photograph, gelatin silver, albumen, vellum, parchment, papyrus, film negative',
    pattern: /\b(paper|etching|engraving|lithograph|woodcut|woodblock|aquatint|mezzotint|drypoint|gelatin silver|albumen|photograph|photogravure|daguerreotype|cyanotype|collotype|heliogravure|cardboard|parchment|vellum|papyrus|film negative|chromogenic|salted paper|platinum print|screenprint|monotype|printed|linocut|halftone|chromolithograph)\b/i,
  },
  {
    id: 'metal',
    label: 'Metal',
    keywordsDescription: 'gold, silver, bronze, copper, iron, steel, brass, pewter, lead, tin, electrum, gilt, alloy, platinum, metal',
    pattern: /\b(gold|silver|bronze|copper|iron|steel|brass|pewter|lead|tin|electrum|gilt|gilded|metal|alloy|platinum|nickel|aluminum|aluminium|zinc|billon|ormolu|bimetallic)\b/i,
  },
  {
    id: 'ceramics',
    label: 'Ceramics',
    keywordsDescription: 'terracotta, ceramic, earthenware, porcelain, stoneware, faience, clay, pottery, maiolica, fritware, celadon',
    pattern: /\b(terracotta|ceramic|earthenware|porcelain|stoneware|faience|clay|pottery|majolica|maiolica|fritware|celadon|slipware|impasto|bucchero|biscuit|glazed ware|soft-paste|hard-paste)\b/i,
  },
  {
    id: 'textiles',
    label: 'Textiles',
    keywordsDescription: 'silk, cotton, wool, linen, velvet, lace, embroidery, tapestry, woven, cloth, hemp, fiber, brocade, satin',
    pattern: /\b(silk|cotton|wool|linen|velvet|lace|embroider\w*|tapestry|woven|textile|fabric|cloth|hemp|jute|felt|brocade|damask|satin|tulle|muslin|cashmere|mohair|fiber|fibre|thread|yarn|raffia|canvas|gabardine|twill|chenille|chiffon|crepe|taffeta|rayon|nylon|polyester|acrylic fabric|spandex)\b/i,
  },
  {
    id: 'paint',
    label: 'Paint & Pigments',
    keywordsDescription: 'oil, watercolor, tempera, gouache, pigment, paint, ink, pastel, chalk, graphite, charcoal, enamel, lacquer, gesso',
    pattern: /\b(oil|watercolor|watercolour|tempera|gouache|pigment|paint|painted|ink|pastel|chalk|graphite|charcoal|crayon|fresco|distemper|wash|gesso|lacquer|enamel|varnish|polychrome|acrylic)\b/i,
  },
  {
    id: 'stone',
    label: 'Stone',
    keywordsDescription: 'marble, limestone, sandstone, granite, alabaster, jade, steatite, basalt, quartz, carnelian, lapis, jasper, flint, obsidian',
    pattern: /\b(stone|marble|limestone|sandstone|granite|alabaster|jade|nephrite|steatite|basalt|quartz|carnelian|lapis|jasper|obsidian|flint|chert|onyx|agate|schist|porphyry|serpentine|travertine|slate|rock crystal|calcite|turquoise|amethyst|emerald|ruby|sapphire|diamond|chalcedony|diorite|granodiorite|greywacke|gypsum|siltstone|soapstone|hematite|garnet|beryl|topaz|malachite|alabastrite)\b/i,
  },
  {
    id: 'wood',
    label: 'Wood',
    keywordsDescription: 'wood, oak, walnut, mahogany, pine, cedar, ebony, boxwood, maple, bamboo, bark, panel',
    pattern: /\b(wood|oak|walnut|mahogany|pine|cedar|ebony|boxwood|maple|cherry|bamboo|bark|linden|limewood|poplar|beech|teak|rosewood|birch|cypress|sycamore|willow|yew|fruitwood|pearwood|chestnut|ash wood|elm|spruce|panel)\b/i,
  },
  {
    id: 'glass',
    label: 'Glass',
    keywordsDescription: 'glass, stained glass, blown glass, molded glass, vitreous, crystal glass',
    pattern: /\b(glass|vitreous|glassware|mirror|rhinestone|paste glass)\b/i,
  },
  {
    id: 'other',
    label: 'Other / Uncategorized',
    keywordsDescription: 'Recorded mediums outside the eight core groups (e.g., ivory, bone, leather, shell, horn, plaster, wax, amber, synthetic)',
    pattern: null,
  },
];

const APPROXIMATE_DATE_REGEX =
  /\b(ca\.?|circa|probably|possibly|about|century|dynasty|period|before|after|early|mid|late|first half|second half|or later|or earlier|approx\.?)\b|\?/i;

const RANGE_TEXT_REGEX = /[–—-]|\b(to|or)\b|\bcentury\b/i;

/**
 * Safely parses numeric begin/end years without using JavaScript Date objects.
 * MetOpenAccess uses (0, 0) as a sentinel when numeric dates are absent.
 */
export function extractNumericDateSpan(
  record: MuseumRecord
): { begin: number; end: number } | null {
  const parseYear = (val: string | number | undefined | null): number | null => {
    if (typeof val === 'number') {
      return Number.isFinite(val) && val >= -500000 && val <= 2100 ? Math.trunc(val) : null;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed || !/^-?\d+$/.test(trimmed)) return null;
      const num = Number(trimmed);
      return Number.isFinite(num) && num >= -500000 && num <= 2100 ? Math.trunc(num) : null;
    }
    return null;
  };

  let begin = parseYear(record.objectBeginDate);
  let end = parseYear(record.objectEndDate);

  // Met CSV encodes missing numeric begin/end as 0, 0 (year 0 does not exist historically)
  if (begin === 0 && end === 0) {
    return null;
  }
  if (begin === 0 && end !== null && end !== 0) {
    begin = end;
  }
  if (end === 0 && begin !== null && begin !== 0) {
    end = begin;
  }

  if (begin === null && end === null) return null;
  if (begin === null && end !== null) begin = end;
  if (end === null && begin !== null) end = begin;

  const low = Math.min(begin as number, end as number);
  const high = Math.max(begin as number, end as number);
  return { begin: low, end: high };
}

export function hasRecordedDate(record: MuseumRecord): boolean {
  if (record.objectDate && record.objectDate.trim() !== '') return true;
  return extractNumericDateSpan(record) !== null;
}

export function isDateRangeRecord(record: MuseumRecord): boolean {
  const span = extractNumericDateSpan(record);
  if (span && span.begin !== span.end) return true;
  if (record.objectDate && RANGE_TEXT_REGEX.test(record.objectDate)) return true;
  return false;
}

export function isApproximateDateRecord(record: MuseumRecord): boolean {
  if (!record.objectDate || !record.objectDate.trim()) return false;
  return APPROXIMATE_DATE_REGEX.test(record.objectDate);
}

/**
 * Classifies a record strictly using its original `medium` string.
 * Returns empty array if `medium` is blank (never invents material metadata).
 * Non-exclusive: multi-material descriptions may belong to multiple categories.
 */
export function classifyMediumCategories(
  medium: string | undefined
): Array<MaterialCategoryRule['id']> {
  const clean = (medium || '').trim();
  if (!clean) return [];

  const matched: Array<MaterialCategoryRule['id']> = [];
  for (const rule of MATERIAL_CATEGORY_RULES) {
    if (rule.pattern && rule.pattern.test(clean)) {
      matched.push(rule.id);
    }
  }
  if (matched.length === 0) {
    matched.push('other');
  }
  return matched;
}

function spansOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

function spanContainedIn(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart >= bStart && aEnd <= bEnd;
}

function toDateExtreme(record: MuseumRecord): DateExtremeRecord {
  return {
    objectID: record.objectID,
    title: record.title,
    objectName: record.objectName,
    objectDate: record.objectDate,
    objectBeginDate: record.objectBeginDate,
    objectEndDate: record.objectEndDate,
    department: record.department,
    objectURL: record.objectURL,
  };
}

export function computeDateSummary(records: MuseumRecord[]): DateAnalysisSummary {
  let withRecordedDates = 0;
  let withValidNumericDates = 0;
  let withDateRanges = 0;
  let withApproximateDates = 0;

  let earliestYear = Infinity;
  let earliestRec: MuseumRecord | null = null;
  let latestYear = -Infinity;
  let latestRec: MuseumRecord | null = null;

  for (const r of records) {
    if (hasRecordedDate(r)) withRecordedDates++;
    if (isDateRangeRecord(r)) withDateRanges++;
    if (isApproximateDateRecord(r)) withApproximateDates++;

    const span = extractNumericDateSpan(r);
    if (span) {
      withValidNumericDates++;
      if (span.begin < earliestYear) {
        earliestYear = span.begin;
        earliestRec = r;
      }
      if (span.end > latestYear) {
        latestYear = span.end;
        latestRec = r;
      }
    }
  }

  return {
    totalObjects: records.length,
    withRecordedDates,
    missingDates: records.length - withRecordedDates,
    withValidNumericDates,
    withDateRanges,
    withApproximateDates,
    earliestRecord: earliestRec ? toDateExtreme(earliestRec) : null,
    latestRecord: latestRec ? toDateExtreme(latestRec) : null,
  };
}

export function computeDateDistribution(records: MuseumRecord[]): CenturyBucket[] {
  const buckets: CenturyBucket[] = CENTURY_BUCKETS.map((b) => ({
    ...b,
    overlapCount: 0,
    exactSpanCount: 0,
  }));

  for (const r of records) {
    const span = extractNumericDateSpan(r);
    if (!span) continue;
    for (const bucket of buckets) {
      if (spansOverlap(span.begin, span.end, bucket.startYear, bucket.endYear)) {
        bucket.overlapCount++;
        if (spanContainedIn(span.begin, span.end, bucket.startYear, bucket.endYear)) {
          bucket.exactSpanCount++;
        }
      }
    }
  }

  return buckets;
}

export function computeHistoricalPeriodDistribution(records: MuseumRecord[]): HistoricalPeriodItem[] {
  const items: HistoricalPeriodItem[] = HISTORICAL_PERIODS.map((p) => ({
    ...p,
    count: 0,
    exactCount: 0,
  }));

  for (const r of records) {
    const span = extractNumericDateSpan(r);
    if (!span) continue;
    for (const period of items) {
      if (spansOverlap(span.begin, span.end, period.startYear, period.endYear)) {
        period.count++;
        if (spanContainedIn(span.begin, span.end, period.startYear, period.endYear)) {
          period.exactCount++;
        }
      }
    }
  }

  return items;
}

export function computeMaterialFrequency(
  records: MuseumRecord[],
  limit = 12
): MaterialFrequencyItem[] {
  const counts = new Map<string, number>();
  for (const r of records) {
    const med = r.medium.trim();
    if (!med) continue;
    counts.set(med, (counts.get(med) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([medium, count]) => ({ medium, count }));
}

export function computeMaterialCategoryDistribution(records: MuseumRecord[]): {
  summary: MaterialAnalysisSummary;
  categories: MaterialCategoryItem[];
} {
  let withMaterialInfo = 0;
  let missingMaterialInfo = 0;
  let multiMaterialObjects = 0;
  let totalCategoryAssignments = 0;

  const counts = new Map<string, number>();
  for (const rule of MATERIAL_CATEGORY_RULES) {
    counts.set(rule.id, 0);
  }

  for (const r of records) {
    const cats = classifyMediumCategories(r.medium);
    if (cats.length === 0) {
      missingMaterialInfo++;
      continue;
    }
    withMaterialInfo++;
    if (cats.length > 1) {
      multiMaterialObjects++;
    }
    totalCategoryAssignments += cats.length;
    for (const c of cats) {
      counts.set(c, (counts.get(c) || 0) + 1);
    }
  }

  const categories: MaterialCategoryItem[] = MATERIAL_CATEGORY_RULES.map((rule) => {
    const count = counts.get(rule.id) || 0;
    const shareOfRecordedPercent =
      withMaterialInfo > 0 ? Math.round((count / withMaterialInfo) * 1000) / 10 : 0;
    return {
      id: rule.id,
      label: rule.label,
      count,
      shareOfRecordedPercent,
      keywordsDescription: rule.keywordsDescription,
    };
  }).sort((a, b) => b.count - a.count);

  return {
    summary: {
      withMaterialInfo,
      missingMaterialInfo,
      multiMaterialObjects,
      totalCategoryAssignments,
    },
    categories,
  };
}

export function computeMaterialVsPeriod(records: MuseumRecord[]): MaterialVsPeriodRow[] {
  const rows: MaterialVsPeriodRow[] = HISTORICAL_PERIODS.map((p) => ({
    periodId: p.id,
    periodLabel: p.label,
    shortLabel: p.shortLabel,
    spanLabel: p.spanLabel,
    totalMatchingObjects: 0,
    metal: 0,
    stone: 0,
    wood: 0,
    ceramics: 0,
    textiles: 0,
    paper: 0,
    glass: 0,
    paint: 0,
    other: 0,
  }));

  for (const r of records) {
    const span = extractNumericDateSpan(r);
    if (!span) continue;
    const cats = classifyMediumCategories(r.medium);
    if (cats.length === 0) continue;

    for (let i = 0; i < HISTORICAL_PERIODS.length; i++) {
      const p = HISTORICAL_PERIODS[i];
      if (!spansOverlap(span.begin, span.end, p.startYear, p.endYear)) continue;
      const row = rows[i];
      row.totalMatchingObjects++;
      for (const c of cats) {
        row[c]++;
      }
    }
  }

  return rows;
}

export function computeCountryDistribution(
  records: MuseumRecord[],
  limit = 15
): GeographyCountItem[] {
  const counts = new Map<string, number>();
  for (const r of records) {
    const country = r.country.trim();
    if (!country) continue;
    counts.set(country, (counts.get(country) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export function computeRegionDistribution(
  records: MuseumRecord[],
  limit = 12
): GeographyCountItem[] {
  const counts = new Map<string, number>();
  for (const r of records) {
    const region = r.region.trim();
    if (!region) continue;
    counts.set(region, (counts.get(region) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export function computeGeographyTypeDistribution(
  records: MuseumRecord[],
  limit = 10
): GeographyCountItem[] {
  const counts = new Map<string, number>();
  for (const r of records) {
    const gType = r.geographyType.trim();
    if (!gType) continue;
    counts.set(gType, (counts.get(gType) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export function computeGeographySummary(records: MuseumRecord[]): GeographySummary {
  let withCountry = 0;
  let withRegion = 0;
  let withCity = 0;
  let missingGeography = 0;
  let withGeographyType = 0;

  for (const r of records) {
    const hasC = r.country.trim() !== '';
    const hasR = r.region.trim() !== '';
    const hasCity = r.city.trim() !== '';
    const hasGT = r.geographyType.trim() !== '';

    if (hasC) withCountry++;
    if (hasR) withRegion++;
    if (hasCity) withCity++;
    if (hasGT) withGeographyType++;
    if (!hasC && !hasR && !hasCity) missingGeography++;
  }

  return {
    withCountry,
    withRegion,
    withCity,
    missingCountry: records.length - withCountry,
    missingGeography,
    withGeographyType,
  };
}

export function computeDataCompleteness(records: MuseumRecord[]): DataCompletenessItem[] {
  const total = records.length;
  const makeItem = (fieldKey: string, label: string, availableCount: number): DataCompletenessItem => {
    const missingCount = total - availableCount;
    const completenessPercent = total > 0 ? Math.round((availableCount / total) * 1000) / 10 : 0;
    return { fieldKey, label, availableCount, missingCount, completenessPercent };
  };

  let dates = 0;
  let materials = 0;
  let countries = 0;
  let regions = 0;
  let cultures = 0;
  let geoTypes = 0;

  for (const r of records) {
    if (hasRecordedDate(r)) dates++;
    if (r.medium.trim() !== '') materials++;
    if (r.country.trim() !== '') countries++;
    if (r.region.trim() !== '') regions++;
    if (r.culture.trim() !== '') cultures++;
    if (r.geographyType.trim() !== '') geoTypes++;
  }

  return [
    makeItem('dates', 'Historical Dates', dates),
    makeItem('materials', 'Materials (Medium)', materials),
    makeItem('culture', 'Culture', cultures),
    makeItem('country', 'Country', countries),
    makeItem('geographyType', 'Geography Type', geoTypes),
    makeItem('region', 'Region', regions),
  ];
}

export function buildFilterOptions(allRecords: MuseumRecord[]): AnalyticsFilterOptions {
  const countryCounts = new Map<string, number>();
  for (const r of allRecords) {
    const c = r.country.trim();
    if (!c) continue;
    countryCounts.set(c, (countryCounts.get(c) || 0) + 1);
  }

  const countries = Array.from(countryCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count }));

  return {
    periods: HISTORICAL_PERIODS.map((p) => ({
      id: p.id,
      label: p.label,
      spanLabel: p.spanLabel,
    })),
    materialCategories: MATERIAL_CATEGORY_RULES.map((m) => ({
      id: m.id,
      label: m.label,
    })),
    countries,
  };
}

export function sanitizeAnalyticsFilters(
  query: Record<string, unknown>
): AnalyticsFiltersState {
  const readStr = (key: string): string => {
    const val = query[key];
    if (typeof val !== 'string') return 'all';
    const trimmed = val.trim();
    if (!trimmed || trimmed.length > 200) return 'all';
    return trimmed;
  };

  return {
    period: readStr('period'),
    century: readStr('century'),
    materialCategory: readStr('materialCategory'),
    medium: readStr('medium'),
    country: readStr('country'),
    region: readStr('region'),
    geographyType: readStr('geographyType'),
  };
}

export function filterRecordsForAnalytics(
  allRecords: MuseumRecord[],
  filters: AnalyticsFiltersState
): MuseumRecord[] {
  const periodDef =
    filters.period !== 'all'
      ? HISTORICAL_PERIODS.find((p) => p.id === filters.period) || null
      : null;

  const centuryDef =
    filters.century !== 'all'
      ? CENTURY_BUCKETS.find((b) => b.id === filters.century) || null
      : null;

  const validCategoryIds = new Set<string>(MATERIAL_CATEGORY_RULES.map((r) => r.id));
  const targetCategory =
    filters.materialCategory !== 'all' && validCategoryIds.has(filters.materialCategory)
      ? filters.materialCategory
      : null;

  const targetMedium = filters.medium !== 'all' ? filters.medium : null;
  const targetCountry = filters.country !== 'all' ? filters.country : null;
  const targetRegion = filters.region !== 'all' ? filters.region : null;
  const targetGeoType = filters.geographyType !== 'all' ? filters.geographyType : null;

  if (
    !periodDef &&
    !centuryDef &&
    !targetCategory &&
    !targetMedium &&
    !targetCountry &&
    !targetRegion &&
    !targetGeoType
  ) {
    return allRecords;
  }

  return allRecords.filter((r) => {
    if (periodDef || centuryDef) {
      const span = extractNumericDateSpan(r);
      if (!span) return false;
      if (periodDef && !spansOverlap(span.begin, span.end, periodDef.startYear, periodDef.endYear)) {
        return false;
      }
      if (
        centuryDef &&
        !spansOverlap(span.begin, span.end, centuryDef.startYear, centuryDef.endYear)
      ) {
        return false;
      }
    }

    if (targetCategory) {
      const cats = classifyMediumCategories(r.medium);
      if (!cats.includes(targetCategory as MaterialCategoryRule['id'])) {
        return false;
      }
    }

    if (targetMedium && r.medium.trim() !== targetMedium) {
      return false;
    }

    if (targetCountry) {
      if (targetCountry === MISSING_COUNTRY_VALUE) {
        if (r.country.trim() !== '') return false;
      } else if (r.country.trim() !== targetCountry) {
        return false;
      }
    }

    if (targetRegion && r.region.trim() !== targetRegion) {
      return false;
    }

    if (targetGeoType && r.geographyType.trim() !== targetGeoType) {
      return false;
    }

    return true;
  });
}

export function buildAnalyticsSummary(
  allRecords: MuseumRecord[],
  filters: AnalyticsFiltersState
): AnalyticsSummaryResponse {
  const filtered = filterRecordsForAnalytics(allRecords, filters);
  const materialCatData = computeMaterialCategoryDistribution(filtered);

  return {
    datasetTotal: allRecords.length,
    filteredTotal: filtered.length,
    seed: RESERVOIR_SEED,
    activeFilters: filters,
    filterOptions: buildFilterOptions(allRecords),
    dateAnalysis: {
      summary: computeDateSummary(filtered),
      centuries: computeDateDistribution(filtered),
      timeline: computeHistoricalPeriodDistribution(filtered),
    },
    materialAnalysis: {
      summary: materialCatData.summary,
      topMediums: computeMaterialFrequency(filtered, 12),
      categories: materialCatData.categories,
      materialVsPeriod: computeMaterialVsPeriod(filtered),
    },
    geographicalAnalysis: {
      summary: computeGeographySummary(filtered),
      countries: computeCountryDistribution(filtered, 14),
      regions: computeRegionDistribution(filtered, 12),
      geographyTypes: computeGeographyTypeDistribution(filtered, 10),
    },
    dataCompleteness: computeDataCompleteness(filtered),
  };
}
