import { FastifyInstance } from 'fastify';
import { loginHandler, meHandler } from '../controllers/authController.js';
import {
  createProjectHandler,
  getProjectsHandler,
  getProjectDetailHandler,
  deleteProjectHandler,
  updateAISettingsHandler,
} from '../controllers/projectController.js';
import { uploadARollHandler, streamARollHandler } from '../controllers/uploadController.js';
import {
  getPipelineStatusHandler,
  manualTranscribeHandler,
  manualExtractKeywordsHandler,
  manualFetchBrollHandler,
  manualSyncTimelineHandler,
} from '../controllers/pipelineController.js';
import { searchBrollHandler, addTimelineFromSearchHandler } from '../controllers/searchController.js';
import {
  getTimelineHandler,
  patchTimelineHandler,
  deleteTimelineHandler,
  regenerateTimelineHandler,
  addLocalAssetTimelineHandler,
} from '../controllers/timelineController.js';
import { exportVideoHandler, getExportJobHandler, exportTimelineHandler } from '../controllers/exportController.js';
import {
  getAssetsHandler,
  createAssetHandler,
  updateAssetHandler,
  deleteAssetHandler,
  getApiKeysHandler,
  createApiKeyHandler,
} from '../controllers/adminController.js';
import { authenticate, authorizeRole, checkProjectOwnership } from '../middlewares/auth.js';

export async function appRoutes(app: FastifyInstance) {
  // Auth
  app.post('/auth/login', loginHandler);
  app.get('/auth/me', { preHandler: [authenticate] }, meHandler);

  // Projects
  app.post('/projects', { preHandler: [authenticate] }, createProjectHandler);
  app.get('/projects', { preHandler: [authenticate] }, getProjectsHandler);
  app.get('/projects/:id', { preHandler: [authenticate, checkProjectOwnership] }, getProjectDetailHandler);
  app.delete('/projects/:id', { preHandler: [authenticate, checkProjectOwnership] }, deleteProjectHandler);
  app.put('/projects/:id/ai-settings', { preHandler: [authenticate, checkProjectOwnership] }, updateAISettingsHandler);

  // Upload & Stream A-Roll
  app.post('/projects/:id/aroll', { preHandler: [authenticate, checkProjectOwnership] }, uploadARollHandler);
  app.get(
    '/projects/:id/aroll/stream',
    {
      preHandler: [authenticate, checkProjectOwnership],
      schema: {
        description: 'Menyajikan streaming file A-Roll video/audio dengan dukungan HTTP Range dan auth query token',
        tags: ['Upload'],
        summary: 'Stream media A-Roll',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'ID Proyek' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'JWT token autentikasi alternatif untuk player video/audio' },
          },
        },
      },
    },
    streamARollHandler
  );

  // Pipeline Status & Manual stages
  app.get('/projects/:id/pipeline-status', { preHandler: [authenticate, checkProjectOwnership] }, getPipelineStatusHandler);
  app.post('/projects/:id/transcribe', { preHandler: [authenticate, checkProjectOwnership] }, manualTranscribeHandler);
  app.post('/projects/:id/keywords/extract', { preHandler: [authenticate, checkProjectOwnership] }, manualExtractKeywordsHandler);
  app.post('/projects/:id/broll/fetch', { preHandler: [authenticate, checkProjectOwnership] }, manualFetchBrollHandler);
  app.post('/projects/:id/timeline/sync', { preHandler: [authenticate, checkProjectOwnership] }, manualSyncTimelineHandler);

  // Search
  app.get('/search/broll', { preHandler: [authenticate] }, searchBrollHandler);
  app.post('/projects/:id/timeline/from-search', { preHandler: [authenticate, checkProjectOwnership] }, addTimelineFromSearchHandler);

  // Timeline
  app.get('/projects/:id/timeline', { preHandler: [authenticate, checkProjectOwnership] }, getTimelineHandler);
  app.patch('/projects/:id/timeline/:edlId', { preHandler: [authenticate, checkProjectOwnership] }, patchTimelineHandler);
  app.delete(
    '/timeline/:edlId',
    {
      preHandler: [authenticate, authorizeRole(['Creator', 'Admin'])],
      schema: {
        description: 'Menghapus satu klip dari timeline EDL berdasarkan edlId',
        tags: ['Timeline'],
        summary: 'Hapus klip timeline',
        params: {
          type: 'object',
          required: ['edlId'],
          properties: {
            edlId: { type: 'string', description: 'ID klip EDL yang ingin dihapus' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              edl_id: { type: 'number' },
              message: { type: 'string' },
            },
          },
          403: {
            type: 'object',
            properties: {
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    deleteTimelineHandler
  );
  app.post('/timeline/:edlId/regenerate', { preHandler: [authenticate] }, regenerateTimelineHandler);
  app.post('/timeline/local-asset', { preHandler: [authenticate] }, addLocalAssetTimelineHandler);

  // Export
  app.post('/projects/:id/export/video', { preHandler: [authenticate, checkProjectOwnership] }, exportVideoHandler);
  app.get('/exports/:jobId', { preHandler: [authenticate] }, getExportJobHandler);
  app.get('/projects/:id/export/timeline', { preHandler: [authenticate, checkProjectOwnership] }, exportTimelineHandler);

  // Admin & Creator Assets
  app.get('/assets', { preHandler: [authenticate] }, getAssetsHandler); // Creator / Local database tab
  app.post('/admin/assets', { preHandler: [authenticate, authorizeRole(['Admin'])] }, createAssetHandler);
  app.get('/admin/assets', { preHandler: [authenticate, authorizeRole(['Admin'])] }, getAssetsHandler);
  app.put('/admin/assets/:id', { preHandler: [authenticate, authorizeRole(['Admin'])] }, updateAssetHandler);
  app.delete('/admin/assets/:id', { preHandler: [authenticate, authorizeRole(['Admin'])] }, deleteAssetHandler);

  // Admin API Keys
  app.get('/admin/api-keys', { preHandler: [authenticate, authorizeRole(['Admin'])] }, getApiKeysHandler);
  app.post('/admin/api-keys', { preHandler: [authenticate, authorizeRole(['Admin'])] }, createApiKeyHandler);
}
