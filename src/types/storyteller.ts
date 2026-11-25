export type StoryAnalyticalCategory =
  | 'date_analysis'
  | 'material_analysis'
  | 'geographical_analysis'
  | 'combined_date_material'
  | 'period_comparison'
  | 'data_completeness'
  | 'individual_object'
  | 'general_collection_overview'
  | 'out_of_scope';

export interface StoryKeyFinding {
  label: string;
  value: string;
  detail: string;
}

export interface StoryEvidenceItem {
  objectID: string | number;
  accessionNumber: string;
  title: string;
  objectName: string;
  objectDate: string;
  medium: string;
  culture: string;
  geographyType: string;
  city: string;
  country: string;
  region: string;
  department: string;
  objectURL: string;
  documentedGeography: string;
}

export interface StoryValidationResult {
  passed: boolean;
  checks: {
    structureValid: boolean;
    objectIdsVerified: boolean;
    linksVerified: boolean;
    numbersGrounded: boolean;
    geographyGrounded: boolean;
  };
  notes: string[];
}

export interface StoryResponsePayload {
  id: string;
  question: string;
  createdAt: string;
  outOfScope: boolean;
  analyticalCategory: StoryAnalyticalCategory;
  analyticalCategoryLabel: string;
  appliedFiltersSummary: string;
  directAnswer: string;
  dataBasedExplanation: string;
  keyFindings: StoryKeyFinding[];
  catalogueEvidence: StoryEvidenceItem[];
  dataLimitation: string;
  suggestedFollowUps: string[];
  validation: StoryValidationResult;
  datasetRecordCount: number;
  modelUsed: string | null;
}

export interface StoryConversationTurn {
  id: string;
  question: string;
  status: 'loading' | 'success' | 'error';
  response?: StoryResponsePayload;
  errorMessage?: string;
}
