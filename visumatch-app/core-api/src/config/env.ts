import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const jwtSecret = process.env.JWT_SECRET || (isProduction ? '' : 'fallback-secret-key-replace-in-prod');
if (isProduction && !jwtSecret) {
  throw new Error('JWT_SECRET must be defined when NODE_ENV=production');
}

const encryptionKey = process.env.ENCRYPTION_KEY || (isProduction ? '' : '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
if (isProduction && !encryptionKey) {
  throw new Error('ENCRYPTION_KEY must be defined when NODE_ENV=production');
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  encryptionKey,
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8001',
  internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN || 'dev-internal-token',
  mockAi: process.env.MOCK_AI === 'true',
  storageRoot: path.resolve(process.env.STORAGE_ROOT || '../storage'),
  corsOrigin: process.env.CORS_ORIGIN || '',

  // SMTP Settings
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  mailFrom: process.env.MAIL_FROM || 'no-reply@visumatch.local',

  // Production Admin Seeder
  adminUsername: process.env.ADMIN_USERNAME,
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
};

