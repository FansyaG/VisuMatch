import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username must be alphanumeric or underscore'),
  email: z.string().email('Invalid email address').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, 'Password must contain both letters and numbers'),
});

export const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().min(1, 'Verification code is required'),
});

export const resendCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const loginSchema = z.object({
  username: z.string().optional(),
  email: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
}).refine((data) => data.username || data.email, {
  message: 'Username or email is required',
  path: ['username'],
});

export const createProjectSchema = z.object({
  project_name: z.string().min(1, 'Project name is required').max(100),
  resolution: z.string().default('1080p'),
});

export const updateAISettingsSchema = z.object({
  language: z.string().min(2).max(10).default('id'),
  sensitivity_level: z.number().int().min(1).max(5).default(3),
});

export const searchBrollSchema = z.object({
  q: z.string().trim().min(2, 'Query must be at least 2 characters').max(100, 'Query must be under 100 characters'),
  source: z.enum(['all', 'external', 'internal']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(12),
  orientation: z.enum(['landscape', 'portrait', 'square']).default('landscape'),
});

export const timelineFromSearchSchema = z.object({
  source: z.enum(['external', 'internal']),
  provider: z.string().optional(),
  external_id: z.string().optional(),
  asset_id: z.number().int().optional(),
  preview_url: z.string().url().optional(),
  q: z.string().optional(),
  start_pos: z.number().min(0, 'Start position must be non-negative'),
  end_pos: z.number().positive().optional(),
  track_layer: z.string().default('V2'),
});

export const patchTimelineSchema = z.object({
  start_pos: z.number().min(0).optional(),
  end_pos: z.number().positive().optional(),
  track_layer: z.string().optional(),
});

export const regenerateTimelineSchema = z.object({
  keyword: z.string().optional(),
});

export const localAssetTimelineSchema = z.object({
  asset_id: z.number().int(),
  start_pos: z.number().min(0),
  end_pos: z.number().positive(),
  track_layer: z.string().default('V2'),
});

export const createAssetSchema = z.object({
  title: z.string({ required_error: 'title is required' }).min(1, 'title is required').max(100),
  description: z.string().optional().default(''),
  tags: z.string().optional().default(''),
});

export const updateAssetSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
});

export const createApiKeySchema = z.object({
  provider_name: z.string().min(1).max(50),
  api_key: z.string().min(1).max(255),
  is_active: z.boolean().default(true),
});

export const exportTimelineSchema = z.object({
  format: z.enum(['xml', 'edl']).default('xml'),
});
