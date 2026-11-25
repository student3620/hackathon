export interface MuseumRecord {
  /** Stable unique React key per row; equals String(objectID) when unique. */
  recordKey: string;
  objectID: string | number;
  accessionNumber: string;
  title: string;
  objectName: string;
  objectDate: string;
  objectBeginDate: string | number;
  objectEndDate: string | number;
  medium: string;
  culture: string;
  period: string;
  dynasty: string;
  geographyType: string;
  city: string;
  country: string;
  region: string;
  department: string;
  classification: string;
  primaryImage: string;
  primaryImageSmall: string;
  isPublicDomain: boolean;
  objectURL: string;
  /** Indicates whether the official Met image lookup has completed for this objectID. */
  imageChecked?: boolean;
}

export interface DatasetStats {
  totalObjects: number;
  withDates: number;
  withMaterials: number;
  withGeography: number;
  missingGeography: number;
  publicDomainWithImages: number;
}

export type DatasetStage =
  | 'idle'
  | 'connecting'
  | 'downloading'
  | 'processing'
  | 'selecting'
  | 'ready'
  | 'error';

export interface DatasetLoadStatus {
  stage: DatasetStage;
  message: string;
  progressPercent: number;
  bytesDownloaded: number;
  totalBytes: number | null;
  rowsProcessed: number;
  uniqueRecordsScanned: number;
  selectedCount: number;
  seed: number;
  sourceUrl: string;
  cachedOnDisk: boolean;
  loadedAt: string | null;
  error: string | null;
}

export type ActiveTab = 'overview' | 'explorer' | 'analytics' | 'storyteller' | 'visual' | 'evidence';
