import type { MuseumRecord } from './museum.ts';

export interface DateExtremeRecord {
  objectID: string | number;
  title: string;
  objectName: string;
  objectDate: string;
  objectBeginDate: string | number;
  objectEndDate: string | number;
  department: string;
  objectURL: string;
}

export interface CenturyBucket {
  id: string;
  label: string;
  shortLabel: string;
  startYear: number;
  endYear: number;
  overlapCount: number;
  exactSpanCount: number;
}

export interface HistoricalPeriodItem {
  id: string;
  label: string;
  shortLabel: string;
  spanLabel: string;
  startYear: number;
  endYear: number;
  count: number;
  exactCount: number;
}

export interface DateAnalysisSummary {
  totalObjects: number;
  withRecordedDates: number;
  missingDates: number;
  withValidNumericDates: number;
  withDateRanges: number;
  withApproximateDates: number;
  earliestRecord: DateExtremeRecord | null;
  latestRecord: DateExtremeRecord | null;
}

export interface MaterialFrequencyItem {
  medium: string;
  count: number;
}

export interface MaterialCategoryItem {
  id: string;
  label: string;
  count: number;
  shareOfRecordedPercent: number;
  keywordsDescription: string;
}

export interface MaterialVsPeriodRow {
  periodId: string;
  periodLabel: string;
  shortLabel: string;
  spanLabel: string;
  totalMatchingObjects: number;
  metal: number;
  stone: number;
  wood: number;
  ceramics: number;
  textiles: number;
  paper: number;
  glass: number;
  paint: number;
  other: number;
}

export interface MaterialAnalysisSummary {
  withMaterialInfo: number;
  missingMaterialInfo: number;
  multiMaterialObjects: number;
  totalCategoryAssignments: number;
}

export interface GeographyCountItem {
  label: string;
  count: number;
}

export interface GeographySummary {
  withCountry: number;
  withRegion: number;
  withCity: number;
  missingCountry: number;
  missingGeography: number;
  withGeographyType: number;
}

export interface DataCompletenessItem {
  fieldKey: string;
  label: string;
  availableCount: number;
  missingCount: number;
  completenessPercent: number;
}

export interface AnalyticsFilterOptions {
  periods: { id: string; label: string; spanLabel: string }[];
  materialCategories: { id: string; label: string }[];
  countries: { label: string; count: number }[];
}

export interface AnalyticsFiltersState {
  period: string;
  century: string;
  materialCategory: string;
  medium: string;
  country: string;
  region: string;
  geographyType: string;
}

export interface AnalyticsSummaryResponse {
  datasetTotal: number;
  filteredTotal: number;
  seed: number;
  activeFilters: AnalyticsFiltersState;
  filterOptions: AnalyticsFilterOptions;
  dateAnalysis: {
    summary: DateAnalysisSummary;
    centuries: CenturyBucket[];
    timeline: HistoricalPeriodItem[];
  };
  materialAnalysis: {
    summary: MaterialAnalysisSummary;
    topMediums: MaterialFrequencyItem[];
    categories: MaterialCategoryItem[];
    materialVsPeriod: MaterialVsPeriodRow[];
  };
  geographicalAnalysis: {
    summary: GeographySummary;
    countries: GeographyCountItem[];
    regions: GeographyCountItem[];
    geographyTypes: GeographyCountItem[];
  };
  dataCompleteness: DataCompletenessItem[];
}

export interface AnalyticsObjectsResponse {
  totalMatching: number;
  page: number;
  pageSize: number;
  totalPages: number;
  records: MuseumRecord[];
}
