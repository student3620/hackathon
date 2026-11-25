import type {
  AnalyticsFiltersState,
  CenturyBucket,
  DataCompletenessItem,
  DateAnalysisSummary,
  GeographyCountItem,
  GeographySummary,
  HistoricalPeriodItem,
  MaterialAnalysisSummary,
  MaterialCategoryItem,
  MaterialFrequencyItem,
  MaterialVsPeriodRow,
} from './analytics.ts';
import type {
  StoryAnalyticalCategory,
  StoryEvidenceItem,
  StoryKeyFinding,
  StoryValidationResult,
} from './storyteller.ts';

export type VisualChartType =
  | 'century_distribution'
  | 'historical_timeline'
  | 'period_comparison'
  | 'material_frequency'
  | 'material_categories'
  | 'material_vs_period'
  | 'documented_countries'
  | 'documented_regions'
  | 'geography_types'
  | 'data_completeness';

export type VisualSceneType =
  | 'introduction'
  | 'historical_context'
  | 'object_exploration'
  | 'data_visualisation'
  | 'geographical_exploration'
  | 'key_findings'
  | 'conclusion';

export interface VisualStoryScene {
  id: string;
  sceneNumber: number;
  sceneType: VisualSceneType;
  label: string;
  title: string;
  caption: string;
  narration: string;
  summary: string;
  durationSeconds: number;
  chartType?: VisualChartType;
  highlightMetric?: {
    label: string;
    value: string;
    detail: string;
  };
  objectIds: string[];
}

export interface VisualStoryChartSection {
  id: string;
  chartType: VisualChartType;
  figureNumber: number;
  title: string;
  caption: string;
  explanation: string;
  interactionHint: string;
  supportingObjectIds: string[];
}

export interface VisualStoryPeriodComparisonRow {
  categoryId: string;
  categoryLabel: string;
  periodACount: number;
  periodAPercent: number;
  periodBCount: number;
  periodBPercent: number;
}

export interface VisualStoryPeriodComparisonData {
  periodAId: string;
  periodALabel: string;
  periodASpan: string;
  periodATotal: number;
  periodBId: string;
  periodBLabel: string;
  periodBSpan: string;
  periodBTotal: number;
  rows: VisualStoryPeriodComparisonRow[];
}

export interface VisualStoryAnalyticsData {
  datasetTotal: number;
  filteredTotal: number;
  seed: number;
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
  periodComparison?: VisualStoryPeriodComparisonData;
}

export interface VisualStoryPayload {
  id: string;
  question: string;
  sourceMode: 'question' | 'storyteller_response';
  sourceTurnId: string | null;
  createdAt: string;
  outOfScope: boolean;
  analyticalCategory: StoryAnalyticalCategory;
  analyticalCategoryLabel: string;
  appliedFilters: AnalyticsFiltersState;
  appliedFiltersSummary: string;
  storyTitle: string;
  subtitle: string;
  introduction: string;
  keyFindings: StoryKeyFinding[];
  scenes: VisualStoryScene[];
  totalDurationSeconds: number;
  charts: VisualStoryChartSection[];
  analyticsData: VisualStoryAnalyticsData;
  featuredObjects: StoryEvidenceItem[];
  patternExplanation: string;
  conclusion: string;
  dataLimitations: string;
  catalogueReferences: StoryEvidenceItem[];
  validation: StoryValidationResult;
  datasetRecordCount: number;
  modelUsed: string | null;
}
