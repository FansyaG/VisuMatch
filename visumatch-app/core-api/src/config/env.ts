import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key-replace-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  encryptionKey: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8001',
  internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN || 'dev-internal-token',
  mockAi: process.env.MOCK_AI === 'true',
  storageRoot: path.resolve(process.env.STORAGE_ROOT || '../storage'),
};
