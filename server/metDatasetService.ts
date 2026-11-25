import fs from 'node:fs';
import path from 'node:path';
import type { MuseumRecord } from '../src/types/museum.ts';

export const MET_REPO_URL = 'https://github.com/metmuseum/openaccess';
export const MET_CSV_DIRECT_URL =
  'https://media.githubusercontent.com/media/metmuseum/openaccess/master/MetObjects.csv';
export const MET_OBJECT_API_BASE =
  'https://collectionapi.metmuseum.org/public/collection/v1/objects';
export const TARGET_SAMPLE_SIZE = 5000;
export const RESERVOIR_SEED = 223;
export const DATASET_SCHEMA_VERSION = 1;

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATASET_CACHE_PATH = path.resolve(DATA_DIR, 'museumlens-met-5000-seed223.json');
const IMAGE_CACHE_PATH = path.resolve(DATA_DIR, 'met-image-cache.json');

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

interface PersistedDatasetFile {
  version: number;
  seed: number;
  targetSize: number;
  sourceUrl: string;
  loadedAt: string;
  totalUniqueScanned: number;
  records: MuseumRecord[];
}

export interface CachedImageEntry {
  primaryImage: string;
  primaryImageSmall: string;
  checked: boolean;
}

/**
 * Deterministic PRNG (Mulberry32) seeded with fixed seed 223
 * for reproducible Algorithm R reservoir sampling.
 */
function createSeededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return function nextRandom(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isPathInsideDataDir(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  return resolved.startsWith(DATA_DIR + path.sep);
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function atomicWriteJson(filePath: string, payload: unknown): void {
  if (!isPathInsideDataDir(filePath)) {
    throw new Error('Refused write outside data directory.');
  }
  ensureDataDir();
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(payload), 'utf-8');
  fs.renameSync(tempPath, filePath);
}

function parsePublicDomain(raw: string | boolean | undefined): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw !== 'string') return false;
  const norm = raw.trim().toLowerCase();
  return norm === 'true' || norm === '1' || norm === 'yes';
}

function sanitizeHttpUrl(raw: string | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    // Upgrade Met museum links to https
    if (parsed.protocol === 'http:' && parsed.hostname.endsWith('metmuseum.org')) {
      parsed.protocol = 'https:';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Low-memory streaming RFC-4180 CSV parser that handles UTF-8 BOM,
 * quoted fields, escaped quotes (""), embedded newlines, and arbitrary chunk splits.
 */
class StreamingCsvParser {
  private readonly onRow: (fields: string[]) => void;
  private state: 'start' | 'unquoted' | 'quoted' | 'quoteInQuoted' = 'start';
  private currentField = '';
  private currentRow: string[] = [];
  private skipNextLF = false;
  private isFirstChunk = true;

  constructor(onRow: (fields: string[]) => void) {
    this.onRow = onRow;
  }

  write(chunk: string): void {
    let text = chunk;
    if (this.isFirstChunk) {
      this.isFirstChunk = false;
      if (text.charCodeAt(0) === 0xfeff) {
        text = text.slice(1);
      }
    }

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      if (this.skipNextLF) {
        this.skipNextLF = false;
        if (ch === '\n') continue;
      }

      if (this.state === 'start') {
        if (ch === '"') {
          this.state = 'quoted';
        } else if (ch === ',') {
          this.currentRow.push('');
        } else if (ch === '\r') {
          this.currentRow.push('');
          this.emitRow();
          this.skipNextLF = true;
        } else if (ch === '\n') {
          this.currentRow.push('');
          this.emitRow();
        } else {
          this.currentField = ch;
          this.state = 'unquoted';
        }
      } else if (this.state === 'unquoted') {
        if (ch === ',') {
          this.currentRow.push(this.currentField);
          this.currentField = '';
          this.state = 'start';
        } else if (ch === '\r') {
          this.currentRow.push(this.currentField);
          this.currentField = '';
          this.emitRow();
          this.state = 'start';
          this.skipNextLF = true;
        } else if (ch === '\n') {
          this.currentRow.push(this.currentField);
          this.currentField = '';
          this.emitRow();
          this.state = 'start';
        } else {
          this.currentField += ch;
        }
      } else if (this.state === 'quoted') {
        if (ch === '"') {
          this.state = 'quoteInQuoted';
        } else {
          this.currentField += ch;
        }
      } else if (this.state === 'quoteInQuoted') {
        if (ch === '"') {
          this.currentField += '"';
          this.state = 'quoted';
        } else if (ch === ',') {
          this.currentRow.push(this.currentField);
          this.currentField = '';
          this.state = 'start';
        } else if (ch === '\r') {
          this.currentRow.push(this.currentField);
          this.currentField = '';
          this.emitRow();
          this.state = 'start';
          this.skipNextLF = true;
        } else if (ch === '\n') {
          this.currentRow.push(this.currentField);
          this.currentField = '';
          this.emitRow();
          this.state = 'start';
        } else {
          this.currentField += ch;
          this.state = 'unquoted';
        }
      }
    }
  }

  flush(): void {
    if (this.currentField.length > 0 || this.currentRow.length > 0) {
      this.currentRow.push(this.currentField);
      this.currentField = '';
      this.emitRow();
    }
  }

  private emitRow(): void {
    const row = this.currentRow;
    this.currentRow = [];
    if (row.length === 1 && row[0] === '') {
      return;
    }
    this.onRow(row);
  }
}

interface ColumnIndices {
  objectID: number;
  accessionNumber: number;
  title: number;
  objectName: number;
  objectDate: number;
  objectBeginDate: number;
  objectEndDate: number;
  medium: number;
  culture: number;
  period: number;
  dynasty: number;
  geographyType: number;
  city: number;
  country: number;
  region: number;
  department: number;
  classification: number;
  primaryImage: number;
  primaryImageSmall: number;
  isPublicDomain: number;
  objectURL: number;
}

function buildColumnIndices(headers: string[]): ColumnIndices {
  const normalizedMap = new Map<string, number>();
  headers.forEach((header, idx) => {
    const clean = header.replace(/^\uFEFF/, '').trim();
    const norm = clean.replace(/[\s_-]/g, '').toLowerCase();
    if (!normalizedMap.has(norm)) {
      normalizedMap.set(norm, idx);
    }
  });

  const findCol = (candidates: string[]): number => {
    for (const c of candidates) {
      const exactIdx = headers.findIndex((h) => h.replace(/^\uFEFF/, '').trim() === c);
      if (exactIdx !== -1) return exactIdx;
    }
    for (const c of candidates) {
      const norm = c.replace(/[\s_-]/g, '').toLowerCase();
      const mapped = normalizedMap.get(norm);
      if (mapped !== undefined) return mapped;
    }
    return -1;
  };

  return {
    objectID: findCol(['Object ID', 'ObjectID', 'object_id']),
    accessionNumber: findCol(['Accession Number', 'Object Number', 'AccessionNumber', 'object_number']),
    title: findCol(['Title', 'title']),
    objectName: findCol(['Object Name', 'ObjectName', 'object_name']),
    objectDate: findCol(['Object Date', 'ObjectDate', 'object_date']),
    objectBeginDate: findCol(['Object Begin Date', 'ObjectBeginDate', 'begin_date']),
    objectEndDate: findCol(['Object End Date', 'ObjectEndDate', 'end_date']),
    medium: findCol(['Medium', 'medium']),
    culture: findCol(['Culture', 'culture']),
    period: findCol(['Period', 'period']),
    dynasty: findCol(['Dynasty', 'dynasty']),
    geographyType: findCol(['Geography Type', 'GeographyType', 'geography_type']),
    city: findCol(['City', 'city']),
    country: findCol(['Country', 'country']),
    region: findCol(['Region', 'region']),
    department: findCol(['Department', 'department']),
    classification: findCol(['Classification', 'classification']),
    primaryImage: findCol(['Primary Image', 'PrimaryImage', 'primary_image']),
    primaryImageSmall: findCol(['Primary Image Small', 'PrimaryImageSmall', 'primary_image_small']),
    isPublicDomain: findCol(['Is Public Domain', 'IsPublicDomain', 'is_public_domain']),
    objectURL: findCol(['Object URL', 'Link Resource', 'ObjectURL', 'object_url', 'link_resource']),
  };
}

function rowToMuseumRecord(row: string[], cols: ColumnIndices, rawObjectID: string): MuseumRecord {
  const read = (idx: number): string => (idx >= 0 && idx < row.length ? row[idx].trim() : '');

  const numericId = /^\d+$/.test(rawObjectID) ? Number(rawObjectID) : rawObjectID;
  const rawUrl = read(cols.objectURL);
  const objectURL =
    sanitizeHttpUrl(rawUrl) ||
    (/^\d+$/.test(rawObjectID) ? `https://www.metmuseum.org/art/collection/search/${rawObjectID}` : '');

  const primaryImage = sanitizeHttpUrl(read(cols.primaryImage));
  const primaryImageSmall = sanitizeHttpUrl(read(cols.primaryImageSmall));
  const isPublicDomain = parsePublicDomain(read(cols.isPublicDomain));

  const beginRaw = read(cols.objectBeginDate);
  const endRaw = read(cols.objectEndDate);

  return {
    recordKey: rawObjectID,
    objectID: numericId,
    accessionNumber: read(cols.accessionNumber),
    title: read(cols.title),
    objectName: read(cols.objectName),
    objectDate: read(cols.objectDate),
    objectBeginDate: /^-?\d+$/.test(beginRaw) ? Number(beginRaw) : beginRaw,
    objectEndDate: /^-?\d+$/.test(endRaw) ? Number(endRaw) : endRaw,
    medium: read(cols.medium),
    culture: read(cols.culture),
    period: read(cols.period),
    dynasty: read(cols.dynasty),
    geographyType: read(cols.geographyType),
    city: read(cols.city),
    country: read(cols.country),
    region: read(cols.region),
    department: read(cols.department),
    classification: read(cols.classification),
    primaryImage,
    primaryImageSmall,
    isPublicDomain,
    objectURL,
  };
}

class MetDatasetService {
  private records: MuseumRecord[] = [];
  private recordsById = new Map<string, MuseumRecord>();
  private imageCache = new Map<string, CachedImageEntry>();
  private inflightImageFetches = new Map<string, Promise<CachedImageEntry>>();
  private initPromise: Promise<void> | null = null;
  private imageCacheFlushTimer: ReturnType<typeof setTimeout> | null = null;

  private status: DatasetLoadStatus = {
    stage: 'idle',
    message: 'Connecting to The Met dataset.',
    progressPercent: 0,
    bytesDownloaded: 0,
    totalBytes: null,
    rowsProcessed: 0,
    uniqueRecordsScanned: 0,
    selectedCount: 0,
    seed: RESERVOIR_SEED,
    sourceUrl: MET_CSV_DIRECT_URL,
    cachedOnDisk: false,
    loadedAt: null,
    error: null,
  };

  constructor() {
    this.loadImageCacheFromDisk();
    this.tryLoadDatasetFromDisk();
  }

  getStatus(): DatasetLoadStatus {
    return { ...this.status };
  }

  getRecords(): MuseumRecord[] {
    return this.records.map((rec) => {
      const cachedImg = this.imageCache.get(String(rec.objectID));
      if (!cachedImg) return rec;
      return {
        ...rec,
        primaryImage: rec.primaryImage || cachedImg.primaryImage,
        primaryImageSmall: rec.primaryImageSmall || cachedImg.primaryImageSmall,
        imageChecked: cachedImg.checked,
      };
    });
  }

  ensureInitialized(): Promise<void> {
    if (this.status.stage === 'ready' && this.records.length > 0) {
      return Promise.resolve();
    }
    if (this.initPromise) {
      return this.initPromise;
    }
    if (this.tryLoadDatasetFromDisk()) {
      return Promise.resolve();
    }
    this.initPromise = this.downloadAndBuildDataset().finally(() => {
      this.initPromise = null;
    });
    return this.initPromise;
  }

  retry(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }
    if (this.status.stage === 'ready' && this.records.length > 0) {
      return Promise.resolve();
    }
    this.initPromise = this.downloadAndBuildDataset().finally(() => {
      this.initPromise = null;
    });
    return this.initPromise;
  }

  private loadImageCacheFromDisk(): void {
    try {
      if (!fs.existsSync(IMAGE_CACHE_PATH)) return;
      const raw = fs.readFileSync(IMAGE_CACHE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, CachedImageEntry>;
      for (const [id, entry] of Object.entries(parsed)) {
        if (entry && typeof entry.checked === 'boolean') {
          this.imageCache.set(id, {
            primaryImage: sanitizeHttpUrl(entry.primaryImage),
            primaryImageSmall: sanitizeHttpUrl(entry.primaryImageSmall),
            checked: entry.checked,
          });
        }
      }
    } catch {
      // Non-fatal: image cache will rebuild automatically
    }
  }

  private scheduleImageCacheFlush(): void {
    if (this.imageCacheFlushTimer) return;
    this.imageCacheFlushTimer = setTimeout(() => {
      this.imageCacheFlushTimer = null;
      try {
        const obj: Record<string, CachedImageEntry> = {};
        for (const [id, entry] of this.imageCache.entries()) {
          obj[id] = entry;
        }
        atomicWriteJson(IMAGE_CACHE_PATH, obj);
      } catch {
        // Ignore non-fatal background cache flush errors
      }
    }, 1000);
  }

  private tryLoadDatasetFromDisk(): boolean {
    try {
      if (!fs.existsSync(DATASET_CACHE_PATH)) return false;
      const raw = fs.readFileSync(DATASET_CACHE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as PersistedDatasetFile;
      if (
        !parsed ||
        parsed.version !== DATASET_SCHEMA_VERSION ||
        parsed.seed !== RESERVOIR_SEED ||
        !Array.isArray(parsed.records) ||
        parsed.records.length !== TARGET_SAMPLE_SIZE
      ) {
        return false;
      }

      this.records = parsed.records;
      this.recordsById = new Map(this.records.map((r) => [String(r.objectID), r]));
      this.status = {
        stage: 'ready',
        message: 'Dataset ready.',
        progressPercent: 100,
        bytesDownloaded: 0,
        totalBytes: null,
        rowsProcessed: parsed.totalUniqueScanned || parsed.records.length,
        uniqueRecordsScanned: parsed.totalUniqueScanned || parsed.records.length,
        selectedCount: parsed.records.length,
        seed: parsed.seed,
        sourceUrl: parsed.sourceUrl || MET_CSV_DIRECT_URL,
        cachedOnDisk: true,
        loadedAt: parsed.loadedAt || new Date().toISOString(),
        error: null,
      };
      return true;
    } catch {
      return false;
    }
  }

  private async downloadAndBuildDataset(): Promise<void> {
    this.status = {
      stage: 'connecting',
      message: 'Connecting to The Met dataset.',
      progressPercent: 2,
      bytesDownloaded: 0,
      totalBytes: null,
      rowsProcessed: 0,
      uniqueRecordsScanned: 0,
      selectedCount: 0,
      seed: RESERVOIR_SEED,
      sourceUrl: MET_CSV_DIRECT_URL,
      cachedOnDisk: false,
      loadedAt: null,
      error: null,
    };

    try {
      const response = await fetch(MET_CSV_DIRECT_URL, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'MuseumLens-PS223/1.0',
          Accept: 'text/csv,text/plain,*/*',
        },
      });

      if (!response.ok) {
        throw new Error(
          `GitHub returned HTTP ${response.status} ${response.statusText} while fetching MetObjects.csv.`
        );
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('text/html')) {
        throw new Error(
          'Received an HTML page instead of the raw MetObjects.csv file from GitHub.'
        );
      }

      const contentLengthHeader = response.headers.get('content-length');
      const totalBytes =
        contentLengthHeader && /^\d+$/.test(contentLengthHeader)
          ? Number(contentLengthHeader)
          : null;

      if (!response.body) {
        throw new Error('Response stream from GitHub was empty.');
      }

      this.status = {
        ...this.status,
        stage: 'downloading',
        message: 'Downloading catalogue data.',
        totalBytes,
        progressPercent: 5,
      };

      const rng = createSeededRandom(RESERVOIR_SEED);
      const seenObjectIds = new Set<string>();
      const reservoir: MuseumRecord[] = [];
      let cols: ColumnIndices | null = null;
      let rowsProcessed = 0;
      let uniqueRecordsScanned = 0;
      let headerValidated = false;

      const parser = new StreamingCsvParser((row) => {
        if (!cols) {
          cols = buildColumnIndices(row);
          if (cols.objectID === -1) {
            throw new Error(
              'Downloaded CSV is missing the required Object ID column from MetObjects.csv.'
            );
          }
          headerValidated = true;
          return;
        }

        rowsProcessed++;
        const rawObjectID =
          cols.objectID >= 0 && cols.objectID < row.length ? row[cols.objectID].trim() : '';
        if (!rawObjectID) return;

        if (seenObjectIds.has(rawObjectID)) return;
        seenObjectIds.add(rawObjectID);

        if (uniqueRecordsScanned < TARGET_SAMPLE_SIZE) {
          reservoir.push(rowToMuseumRecord(row, cols, rawObjectID));
        } else {
          const replaceIdx = Math.floor(rng() * (uniqueRecordsScanned + 1));
          if (replaceIdx < TARGET_SAMPLE_SIZE) {
            reservoir[replaceIdx] = rowToMuseumRecord(row, cols, rawObjectID);
          }
        }
        uniqueRecordsScanned++;
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let bytesDownloaded = 0;
      let checkedFirstChunk = false;
      let lastStatusUpdate = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value || value.byteLength === 0) continue;

        bytesDownloaded += value.byteLength;
        const text = decoder.decode(value, { stream: true });

        if (!checkedFirstChunk) {
          checkedFirstChunk = true;
          const leading = text.replace(/^\uFEFF/, '').trimStart();
          if (
            leading.startsWith('version https://git-lfs.github.com/spec/') ||
            leading.toLowerCase().startsWith('<!doctype') ||
            leading.toLowerCase().startsWith('<html')
          ) {
            reader.cancel().catch(() => {});
            throw new Error(
              'Downloaded content is a Git LFS pointer or HTML preview page instead of the actual MetObjects.csv dataset.'
            );
          }
        }

        parser.write(text);

        const now = Date.now();
        if (now - lastStatusUpdate >= 250) {
          lastStatusUpdate = now;
          const downloadRatio =
            totalBytes && totalBytes > 0 ? Math.min(1, bytesDownloaded / totalBytes) : 0.5;
          const stage: DatasetStage =
            downloadRatio < 0.72 ? 'downloading' : 'processing';
          const message =
            stage === 'downloading'
              ? 'Downloading catalogue data.'
              : 'Processing catalogue records.';

          this.status = {
            ...this.status,
            stage,
            message,
            bytesDownloaded,
            totalBytes,
            rowsProcessed,
            uniqueRecordsScanned,
            selectedCount: reservoir.length,
            progressPercent: Math.min(88, Math.round(5 + downloadRatio * 83)),
          };
        }
      }

      const trailing = decoder.decode();
      if (trailing) {
        parser.write(trailing);
      }
      parser.flush();

      if (!headerValidated || reservoir.length === 0) {
        throw new Error('No valid museum catalogue records were found in MetObjects.csv.');
      }

      this.status = {
        ...this.status,
        stage: 'selecting',
        message: `Selecting ${TARGET_SAMPLE_SIZE.toLocaleString()} records.`,
        bytesDownloaded,
        totalBytes,
        rowsProcessed,
        uniqueRecordsScanned,
        selectedCount: reservoir.length,
        progressPercent: 92,
      };

      const loadedAt = new Date().toISOString();
      const persisted: PersistedDatasetFile = {
        version: DATASET_SCHEMA_VERSION,
        seed: RESERVOIR_SEED,
        targetSize: TARGET_SAMPLE_SIZE,
        sourceUrl: MET_CSV_DIRECT_URL,
        loadedAt,
        totalUniqueScanned: uniqueRecordsScanned,
        records: reservoir,
      };

      atomicWriteJson(DATASET_CACHE_PATH, persisted);

      this.records = reservoir;
      this.recordsById = new Map(reservoir.map((r) => [String(r.objectID), r]));

      // Pre-warm official Met images for the first page of public-domain objects (fast, non-fatal)
      const firstPagePublicIds = reservoir
        .slice(0, 24)
        .filter((r) => r.isPublicDomain)
        .map((r) => String(r.objectID));
      if (firstPagePublicIds.length > 0) {
        await this.resolveImagesForObjectIds(firstPagePublicIds).catch(() => {});
      }

      this.status = {
        stage: 'ready',
        message: 'Dataset ready.',
        progressPercent: 100,
        bytesDownloaded,
        totalBytes,
        rowsProcessed,
        uniqueRecordsScanned,
        selectedCount: reservoir.length,
        seed: RESERVOIR_SEED,
        sourceUrl: MET_CSV_DIRECT_URL,
        cachedOnDisk: true,
        loadedAt,
        error: null,
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unexpected error while downloading or processing MetObjects.csv.';
      this.status = {
        ...this.status,
        stage: 'error',
        message: 'Dataset retrieval failed.',
        error: message,
      };
      throw err;
    }
  }

  /**
   * Resolves official Met Open Access primaryImage and primaryImageSmall URLs
   * strictly matched by exact objectID for public-domain objects in the 5,000-record dataset.
   */
  async resolveImagesForObjectIds(
    rawIds: Array<string | number>
  ): Promise<Record<string, CachedImageEntry>> {
    const result: Record<string, CachedImageEntry> = {};
    const toFetch: string[] = [];

    for (const rawId of rawIds.slice(0, 36)) {
      const idStr = String(rawId).trim();
      if (!/^\d+$/.test(idStr)) continue;

      const record = this.recordsById.get(idStr);
      if (!record) continue;

      if (!record.isPublicDomain) {
        result[idStr] = { primaryImage: '', primaryImageSmall: '', checked: true };
        continue;
      }

      if (record.primaryImage || record.primaryImageSmall) {
        result[idStr] = {
          primaryImage: record.primaryImage,
          primaryImageSmall: record.primaryImageSmall,
          checked: true,
        };
        continue;
      }

      const cached = this.imageCache.get(idStr);
      if (cached) {
        result[idStr] = cached;
        continue;
      }

      toFetch.push(idStr);
    }

    if (toFetch.length > 0) {
      const concurrency = 6;
      let cursor = 0;

      const worker = async () => {
        while (cursor < toFetch.length) {
          const idStr = toFetch[cursor++];
          const entry = await this.fetchSingleObjectImage(idStr);
          result[idStr] = entry;
        }
      };

      await Promise.all(Array.from({ length: Math.min(concurrency, toFetch.length) }, worker));
    }

    return result;
  }

  private fetchSingleObjectImage(idStr: string): Promise<CachedImageEntry> {
    const existing = this.inflightImageFetches.get(idStr);
    if (existing) return existing;

    const promise = (async (): Promise<CachedImageEntry> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`${MET_OBJECT_API_BASE}/${encodeURIComponent(idStr)}`, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'MuseumLens-PS223/1.0',
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          // Do not cache transient rate-limit/5xx failures permanently
          if (response.status === 404) {
            const notFound: CachedImageEntry = {
              primaryImage: '',
              primaryImageSmall: '',
              checked: true,
            };
            this.imageCache.set(idStr, notFound);
            this.scheduleImageCacheFlush();
            return notFound;
          }
          return { primaryImage: '', primaryImageSmall: '', checked: true };
        }

        const data = (await response.json()) as {
          objectID?: number;
          isPublicDomain?: boolean;
          primaryImage?: string;
          primaryImageSmall?: string;
        };

        // Strict objectID and public-domain verification: never accept mismatched object responses
        if (String(data.objectID) !== idStr || !parsePublicDomain(data.isPublicDomain)) {
          const restricted: CachedImageEntry = {
            primaryImage: '',
            primaryImageSmall: '',
            checked: true,
          };
          this.imageCache.set(idStr, restricted);
          this.scheduleImageCacheFlush();
          return restricted;
        }

        const entry: CachedImageEntry = {
          primaryImage: sanitizeHttpUrl(data.primaryImage),
          primaryImageSmall: sanitizeHttpUrl(data.primaryImageSmall),
          checked: true,
        };
        this.imageCache.set(idStr, entry);
        this.scheduleImageCacheFlush();
        return entry;
      } catch {
        return { primaryImage: '', primaryImageSmall: '', checked: true };
      } finally {
        clearTimeout(timeout);
        this.inflightImageFetches.delete(idStr);
      }
    })();

    this.inflightImageFetches.set(idStr, promise);
    return promise;
  }
}

export const metDatasetService = new MetDatasetService();
