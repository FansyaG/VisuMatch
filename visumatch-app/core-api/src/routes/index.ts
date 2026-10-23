import { FastifyInstance } from 'fastify';
import {
  registerHandler,
  verifyEmailHandler,
  resendCodeHandler,
  loginHandler,
  meHandler,
} from '../controllers/authController.js';
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
  // Auth Routes
  app.post(
    '/auth/register',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 hour',
        },
      },
      schema: {
        description: 'Registrasi akun baru (Role selalu Creator). Mengirimkan OTP 6 digit ke email.',
        tags: ['Auth'],
        summary: 'Register akun Creator',
        body: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: { type: 'string', minLength: 3, maxLength: 50 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              email: { type: 'string' },
            },
          },
        },
      },
    },
    registerHandler
  );

  app.post(
    '/auth/verify-email',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '10 minutes',
        },
      },
      schema: {
        description: 'Verifikasi alamat email dengan 6 digit OTP. Langsung mengembalikan token JWT dan user data.',
        tags: ['Auth'],
        summary: 'Verifikasi OTP Email',
        body: {
          type: 'object',
          required: ['email', 'code'],
          properties: {
            email: { type: 'string', format: 'email' },
            code: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  user_id: { type: 'number' },
                  username: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    verifyEmailHandler
  );

  app.post(
    '/auth/resend-code',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 hour',
        },
      },
      schema: {
        description: 'Kirim ulang kode OTP verifikasi email (jeda minimal 60 detik, maks 5 per jam).',
        tags: ['Auth'],
        summary: 'Kirim ulang OTP',
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    resendCodeHandler
  );

  app.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '10 minutes',
        },
      },
      schema: {
        description: 'Login pengguna dengan username atau email. Menolak akun yang belum verifikasi email.',
        tags: ['Auth'],
        summary: 'Login',
        body: {
          type: 'object',
          required: ['password'],
          properties: {
            username: { type: 'string' },
            email: { type: 'string' },
            password: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  user_id: { type: 'number' },
                  username: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    loginHandler
  );

  app.get(
    '/auth/me',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Mendapatkan data pengguna yang sedang login',
        tags: ['Auth'],
        summary: 'Profil User',
        security: [{ Bearer: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  user_id: { type: 'number' },
                  username: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                  created_at: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    meHandler
  );

  // Projects (Creator Only)
  app.post('/projects', { preHandler: [authenticate, authorizeRole(['Creator'])] }, createProjectHandler);
  app.get('/projects', { preHandler: [authenticate, authorizeRole(['Creator'])] }, getProjectsHandler);
  app.get('/projects/:id', { preHandler: [authenticate, authorizeRole(['Creator']), checkProjectOwnership] }, getProjectDetailHandler);
  app.delete('/projects/:id', { preHandler: [authenticate, authorizeRole(['Creator']), checkProjectOwnership] }, deleteProjectHandler);
  app.put('/projects/:id/ai-settings', { preHandler: [authenticate, authorizeRole(['Creator']), checkProjectOwnership] }, updateAISettingsHandler);

  // Upload & Stream A-Roll (Creator Only)
  app.post('/projects/:id/aroll', { preHandler: [authenticate, authorizeRole(['Creator']), checkProjectOwnership] }, uploadARollHandler);
  app.get(
    '/projects/:id/aroll/stream',
    {
      preHandler: [authenticate, authorizeRole(['Creator']), checkProjectOwnership],
      schema: {
        description: 'Menyajikan streaming file A-Roll video/audio dengan dukungan HTTP Range dan auth query token',
        tags: ['Upload'],
        summary: 'Stream media A-Roll',
        security: [{ Bearer: [] }],
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

  // Pipeline Status & Manual stages (Creator Only)
  app.get('/projects/:id/pipeline-status', { preHandler: [authenticate, authorizeRole(['Creator']), checkProjectOwnership] }, getPipelineStatusHandler);
  app.post('/projects/:id/transcribe', { preHandler: [authenticate, authorizeRole(['Creator']), checkProjectOwnership] }, manualTranscribeHandler);
  app.post('/projects/:id/keywords/extract', { preHandler: [authenticate, authorizeRole(['Creator']), checkProjectOwnership] }, manualExtractKeywordsHandler);
  app.post('/projects/:id/broll/fetch', { preHandler: [authenticate, authorizeRole(['Creator']), checkProjectOwnership] }, manualFetchBrollHandler);
  app.post('/projects/:id/timeline/sync', { preHandler: [authenticate, authorizeRole(['Creator']), checkProjectOwnership] }, manualSyncTimelineHandler);

  // Search (Creator Only)
  app.get('/search/broll', { preHandler: [authenticate, authorizeRole(['Creator'])] }, searchBrollHandler);
  app.post('/projects/:id/timeline/from-search', { preHandler: [authenticate, authorizeRole(['Creator']), checkProjectOwnership] }, addTimelineFromSearchHandler);

  // Timeline (Creator Only)
  app.get('/projects/:id/timeline', { preHandler: [authenticate, authorizeRole(['Creator']), checkProjectOwnership] }, getTimelineHandler);
  app.patch('/projects/:id/timeline/:edlId', { preHandler: [authenticate, authorizeRole(['Creator']), checkProjectOwnership] }, patchTimelineHandler);
  app.delete(
    '/timeline/:edlId',
    {
      preHandler: [authenticate, authorizeRole(['Creator'])],
      schema: {
        description: 'Menghapus satu klip dari timeline EDL berdasarkan edlId',
        tags: ['Timeline'],
        summary: 'Hapus klip timeline',
        security: [{ Bearer: [] }],
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
  app.post('/timeline/:edlId/regenerate', { preHandler: [authenticate, authorizeRole(['Creator'])] }, regenerateTimelineHandler);
  app.post('/timeline/local-asset', { preHandler: [authenticate, authorizeRole(['Creator'])] }, addLocalAssetTimelineHandler);

  // Export (Creator Only)
  app.post('/projects/:id/export/video', { preHandler: [authenticate, authorizeRole(['Creator']), checkProjectOwnership] }, exportVideoHandler);
  app.get('/exports/:jobId', { preHandler: [authenticate, authorizeRole(['Creator'])] }, getExportJobHandler);
  app.get('/projects/:id/export/timeline', { preHandler: [authenticate, authorizeRole(['Creator']), checkProjectOwnership] }, exportTimelineHandler);

  // Creator Assets Tab (Creator Only)
  app.get('/assets', { preHandler: [authenticate, authorizeRole(['Creator'])] }, getAssetsHandler);

  // Admin Assets (Admin Only)
  app.post('/admin/assets', { preHandler: [authenticate, authorizeRole(['Admin'])] }, createAssetHandler);
  app.get('/admin/assets', { preHandler: [authenticate, authorizeRole(['Admin'])] }, getAssetsHandler);
  app.put('/admin/assets/:id', { preHandler: [authenticate, authorizeRole(['Admin'])] }, updateAssetHandler);
  app.delete('/admin/assets/:id', { preHandler: [authenticate, authorizeRole(['Admin'])] }, deleteAssetHandler);

  // Admin API Keys (Admin Only)
  app.get('/admin/api-keys', { preHandler: [authenticate, authorizeRole(['Admin'])] }, getApiKeysHandler);
  app.post('/admin/api-keys', { preHandler: [authenticate, authorizeRole(['Admin'])] }, createApiKeyHandler);
}

