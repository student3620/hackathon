import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { metDatasetService } from './server/metDatasetService.ts';
import {
  buildAnalyticsSummary,
  filterRecordsForAnalytics,
  sanitizeAnalyticsFilters,
} from './server/analyticsService.ts';
import {
  GEMINI_MODEL,
  GeminiServiceError,
  classifyGeminiError,
  isGeminiConfigured,
} from './server/geminiClient.ts';
import { generateGroundedStory } from './server/storytellerService.ts';
import { generateVisualStory } from './server/visualStoryService.ts';

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

async function startServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  // Trigger automatic dataset initialization immediately on server boot
  metDatasetService.ensureInitialized().catch((err) => {
    console.error('[MuseumLens] Initial Met dataset retrieval failed:', err instanceof Error ? err.message : err);
  });

  app.get('/api/dataset/status', (_req, res) => {
    const status = metDatasetService.getStatus();
    if (status.stage === 'idle') {
      metDatasetService.ensureInitialized().catch(() => {});
    }
    res.json(metDatasetService.getStatus());
  });

  app.get('/api/dataset/records', (_req, res) => {
    const status = metDatasetService.getStatus();
    if (status.stage !== 'ready') {
      if (status.stage === 'idle') {
        metDatasetService.ensureInitialized().catch(() => {});
      }
      res.status(202).json({
        ready: false,
        status: metDatasetService.getStatus(),
      });
      return;
    }

    const records = metDatasetService.getRecords();
    res.json({
      ready: true,
      status,
      recordCount: records.length,
      records,
    });
  });

  app.post('/api/dataset/retry', (_req, res) => {
    metDatasetService.retry().catch(() => {});
    res.status(202).json(metDatasetService.getStatus());
  });

  app.post('/api/dataset/images', async (req, res) => {
    const body = req.body as { objectIds?: unknown };
    if (!body || !Array.isArray(body.objectIds)) {
      res.status(400).json({ error: 'Expected objectIds array.' });
      return;
    }

    const validIds = body.objectIds
      .filter((id): id is string | number => typeof id === 'string' || typeof id === 'number')
      .slice(0, 36);

    try {
      const images = await metDatasetService.resolveImagesForObjectIds(validIds);
      res.json({ images });
    } catch {
      res.status(502).json({ error: 'Failed to resolve official Met catalogue images.' });
    }
  });

  // Module 2 – Server-side Historical Data Analytics endpoints (strictly over the 5,000 selected records)
  app.get('/api/analytics/summary', (req, res) => {
    const status = metDatasetService.getStatus();
    if (status.stage !== 'ready') {
      res.status(202).json({ ready: false, status });
      return;
    }

    const allRecords = metDatasetService.getRecords();
    const filters = sanitizeAnalyticsFilters(req.query as Record<string, unknown>);
    const summary = buildAnalyticsSummary(allRecords, filters);
    res.json({ ready: true, ...summary });
  });

  app.get('/api/analytics/objects', (req, res) => {
    const status = metDatasetService.getStatus();
    if (status.stage !== 'ready') {
      res.status(202).json({ ready: false, status });
      return;
    }

    const allRecords = metDatasetService.getRecords();
    const filters = sanitizeAnalyticsFilters(req.query as Record<string, unknown>);
    const matched = filterRecordsForAnalytics(allRecords, filters);

    const rawPage = Number(req.query.page);
    const rawPageSize = Number(req.query.pageSize);
    const pageSize = Number.isFinite(rawPageSize)
      ? Math.min(36, Math.max(6, Math.trunc(rawPageSize)))
      : 12;
    const totalPages = Math.max(1, Math.ceil(matched.length / pageSize));
    const page = Number.isFinite(rawPage)
      ? Math.min(totalPages, Math.max(1, Math.trunc(rawPage)))
      : 1;

    const start = (page - 1) * pageSize;
    const slice = matched.slice(start, start + pageSize);

    res.json({
      ready: true,
      totalMatching: matched.length,
      page,
      pageSize,
      totalPages,
      records: slice,
    });
  });

  // Module 3 – Server-side Generative AI Storyteller endpoints (Gemini API grounded in the 5,000-record dataset)
  app.get('/api/storyteller/status', (_req, res) => {
    const datasetStatus = metDatasetService.getStatus();
    res.json({
      configured: isGeminiConfigured(),
      model: GEMINI_MODEL,
      datasetReady: datasetStatus.stage === 'ready',
      recordCount: datasetStatus.stage === 'ready' ? metDatasetService.getRecords().length : 0,
    });
  });

  app.post('/api/storyteller/ask', async (req, res) => {
    const body = req.body as { question?: unknown };
    const rawQuestion = typeof body?.question === 'string' ? body.question.trim() : '';

    if (!rawQuestion) {
      res.status(400).json({
        error: 'Please enter a question about the MuseumLens catalogue dataset.',
        code: 'INVALID_QUESTION',
      });
      return;
    }

    if (rawQuestion.length > 600) {
      res.status(400).json({
        error: 'Questions must be 600 characters or fewer.',
        code: 'QUESTION_TOO_LONG',
      });
      return;
    }

    const datasetStatus = metDatasetService.getStatus();
    if (datasetStatus.stage !== 'ready') {
      res.status(503).json({
        error: 'The 5,000-record MuseumLens dataset is still loading. Please try again once dataset initialization completes.',
        code: 'DATASET_NOT_READY',
      });
      return;
    }

    try {
      const records = metDatasetService.getRecords();
      const story = await generateGroundedStory(rawQuestion, records);
      res.json(story);
    } catch (err: unknown) {
      const classified =
        err instanceof GeminiServiceError ? err : classifyGeminiError(err);
      console.error('[MuseumLens] AI Storyteller request failed:', {
        code: classified.code,
        status: classified.statusCode,
        message: classified.message,
      });
      res.status(classified.statusCode).json({
        error: classified.message,
        code: classified.code,
      });
    }
  });

  // Module 4 – Server-side Interactive Visual Storytelling endpoint
  app.post('/api/visual-story/generate', async (req, res) => {
    const body = req.body as {
      question?: unknown;
      sourceMode?: unknown;
      sourceTurnId?: unknown;
      sourceAnswerContext?: unknown;
      regenerate?: unknown;
    };

    const rawQuestion = typeof body?.question === 'string' ? body.question.trim() : '';
    if (!rawQuestion) {
      res.status(400).json({
        error: 'Please enter a museum collection question to create a visual story.',
        code: 'INVALID_QUESTION',
      });
      return;
    }

    if (rawQuestion.length > 600) {
      res.status(400).json({
        error: 'Questions must be 600 characters or fewer.',
        code: 'QUESTION_TOO_LONG',
      });
      return;
    }

    const datasetStatus = metDatasetService.getStatus();
    if (datasetStatus.stage !== 'ready') {
      res.status(503).json({
        error:
          'The 5,000-record MuseumLens dataset is still loading. Please try again once dataset initialization completes.',
        code: 'DATASET_NOT_READY',
      });
      return;
    }

    const sourceMode: 'question' | 'storyteller_response' =
      body?.sourceMode === 'storyteller_response' ? 'storyteller_response' : 'question';
    const sourceTurnId =
      typeof body?.sourceTurnId === 'string' ? body.sourceTurnId.slice(0, 120) : null;
    const sourceAnswerContext =
      typeof body?.sourceAnswerContext === 'string'
        ? body.sourceAnswerContext.slice(0, 1000)
        : null;
    const regenerate = Boolean(body?.regenerate);

    try {
      const records = metDatasetService.getRecords();
      const visualStory = await generateVisualStory(
        {
          question: rawQuestion,
          sourceMode,
          sourceTurnId,
          sourceAnswerContext,
          regenerate,
        },
        records
      );
      res.json(visualStory);
    } catch (err: unknown) {
      const classified =
        err instanceof GeminiServiceError ? err : classifyGeminiError(err);
      console.error('[MuseumLens] Visual Story generation failed:', {
        code: classified.code,
        status: classified.statusCode,
        message: classified.message,
      });
      res.status(classified.statusCode).json({
        error: classified.message,
        code: classified.code,
      });
    }
  });

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    const indexHtml = path.resolve(distDir, 'index.html');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Application build not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MuseumLens] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[MuseumLens] Fatal server startup error:', err);
  process.exit(1);
});
