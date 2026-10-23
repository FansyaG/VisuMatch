import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { appRoutes } from './routes/index.js';
import { errorHandler } from './middlewares/error.js';
import { config } from './config/env.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      transport:
        config.nodeEnv === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // Global Error Handler
  app.setErrorHandler(errorHandler);

  // Rate Limiting
  await app.register(rateLimit, {
    global: false, // Per-route rate limiting
  });

  // CORS configuration
  const allowedOrigins = config.corsOrigin
    ? config.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  await app.register(cors, {
    origin: (origin, cb) => {
      // In development or if not configured, or if origin matches allowed origins
      if (config.nodeEnv !== 'production') {
        cb(null, true);
        return;
      }

      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }

      cb(new Error('CORS Not Allowed'), false);
    },
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Range'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type'],
  });

  await app.register(multipart, {
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB max file size
    },
  });

  // OpenAPI Swagger Documentation
  await app.register(swagger, {
    swagger: {
      info: {
        title: 'VisuMatch Core API',
        description: 'VisuMatch Core API Specification - AI Auto B-Roll Matcher',
        version: '1.0.0',
      },
      securityDefinitions: {
        Bearer: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // Health endpoint
  app.get('/health', async () => ({ status: 'ok', service: 'core-api' }));

  // API prefix /api/v1
  await app.register(appRoutes, { prefix: '/api/v1' });

  return app;
}
