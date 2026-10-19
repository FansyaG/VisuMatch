import { FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import axios from 'axios';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/errors.js';
import { encrypt, maskApiKey } from '../utils/crypto.js';
import { config } from '../config/env.js';
import { createAssetSchema, updateAssetSchema, createApiKeySchema } from '../schemas/index.js';

// ==========================================
// Internal Assets (Admin & Creator)
// ==========================================

export async function getAssetsHandler(request: FastifyRequest, reply: FastifyReply) {
  const assets = await prisma.internal_Assets.findMany({
    orderBy: { created_at: 'desc' },
  });

  return reply.send({ assets });
}

export async function createAssetHandler(request: FastifyRequest, reply: FastifyReply) {
  if (!request.isMultipart()) {
    throw new AppError(400, 'INVALID_MULTIPART', 'Request must be multipart/form-data');
  }

  const textFields: Record<string, string> = {};
  let uploadedFile: { filename: string; mimetype: string; tempPath: string } | null = null;

  const parts = request.parts();

  // Temporary storage directory during stream processing
  const assetsStorageDir = path.join(config.storageRoot, 'assets');
  await fsp.mkdir(assetsStorageDir, { recursive: true });

  try {
    for await (const part of parts) {
      if (part.type === 'file') {
        if (part.fieldname === 'file') {
          // Validate MIME / extension
          const allowedMime = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm', 'audio/mp3', 'audio/wav', 'audio/mpeg'];
          if (!allowedMime.includes(part.mimetype) && !part.filename.match(/\.(mp4|mov|mkv|webm|mp3|wav)$/i)) {
            // Drain stream before throwing
            part.file.resume();
            throw new AppError(422, 'UNSUPPORTED_MEDIA', 'Only video/audio media files are supported');
          }

          const sanitizedFilename = `${Date.now()}_${part.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const destinationPath = path.join(assetsStorageDir, sanitizedFilename);

          await pipeline(part.file, fs.createWriteStream(destinationPath));

          uploadedFile = {
            filename: sanitizedFilename,
            mimetype: part.mimetype,
            tempPath: destinationPath,
          };
        } else {
          // Drain stream for any other files that don't match 'file'
          part.file.resume();
        }
      } else {
        // Text field
        textFields[part.fieldname] = part.value as string;
      }
    }
  } catch (err) {
    if (uploadedFile?.tempPath) {
      await fsp.unlink(uploadedFile.tempPath).catch(() => {});
    }
    throw err;
  }

  // Check file presence
  if (!uploadedFile) {
    throw new AppError(400, 'FILE_NOT_FOUND', 'Field "file" is required');
  }

  // Validate text fields with Zod
  const parseResult = createAssetSchema.safeParse(textFields);
  if (!parseResult.success) {
    if (uploadedFile.tempPath) {
      await fsp.unlink(uploadedFile.tempPath).catch(() => {});
    }
    throw parseResult.error;
  }

  const { title, description, tags } = parseResult.data;
  const userId = request.user!.userId;
  const relativeFilePath = `assets/${uploadedFile.filename}`;

  const asset = await prisma.internal_Assets.create({
    data: {
      uploaded_by: userId,
      title,
      description,
      file_path: relativeFilePath,
      tags,
    },
  });

  return reply.status(201).send({ asset });
}

export async function updateAssetHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const assetId = parseInt(id, 10);

  const parseResult = updateAssetSchema.safeParse(request.body);
  if (!parseResult.success) {
    throw parseResult.error;
  }

  const asset = await prisma.internal_Assets.findUnique({
    where: { asset_id: assetId },
  });

  if (!asset) {
    throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found');
  }

  const updated = await prisma.internal_Assets.update({
    where: { asset_id: assetId },
    data: parseResult.data,
  });

  return reply.send({ asset: updated });
}

export async function deleteAssetHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const assetId = parseInt(id, 10);

  const asset = await prisma.internal_Assets.findUnique({
    where: { asset_id: assetId },
    include: { timelines: true },
  });

  if (!asset) {
    throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found');
  }

  // Reject delete 409 if asset is used in Timeline_EDL
  if (asset.timelines.length > 0) {
    return reply.status(409).send({
      error: {
        code: 'ASSET_IN_USE',
        message: 'Cannot delete asset because it is currently used in one or more project timelines',
        timelines_count: asset.timelines.length,
      },
    });
  }

  await prisma.internal_Assets.delete({
    where: { asset_id: assetId },
  });

  return reply.send({ success: true, message: 'Asset deleted successfully' });
}

// ==========================================
// API Configurations (Admin Only)
// ==========================================

export async function getApiKeysHandler(request: FastifyRequest, reply: FastifyReply) {
  const keys = await prisma.aPI_Configurations.findMany();

  const maskedKeys = keys.map((k) => ({
    config_id: k.config_id,
    provider_name: k.provider_name,
    api_key: maskApiKey(k.api_key),
    is_active: k.is_active,
  }));

  return reply.send({ api_keys: maskedKeys });
}

export async function createApiKeyHandler(request: FastifyRequest, reply: FastifyReply) {
  const parseResult = createApiKeySchema.safeParse(request.body);
  if (!parseResult.success) {
    throw parseResult.error;
  }

  const { provider_name, api_key, is_active } = parseResult.data;

  // Test ping key against provider before saving
  if (provider_name.toLowerCase() === 'pexels') {
    try {
      await axios.get('https://api.pexels.com/videos/popular?per_page=1', {
        headers: { Authorization: api_key },
        timeout: 5000,
      });
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        throw new AppError(401, 'INVALID_API_KEY', 'The provided Pexels API key is invalid or unauthorized');
      }
      // If network unreachable, allow saving in local/offline environment with warning
      request.log.warn('Could not reach Pexels to verify API key, saving anyway');
    }
  } else if (provider_name.toLowerCase() === 'pixabay') {
    try {
      await axios.get('https://pixabay.com/api/videos/', {
        params: {
          key: api_key,
          q: 'test',
          per_page: 3,
        },
        timeout: 5000,
      });
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 400 || status === 401 || status === 403) {
        throw new AppError(status, 'INVALID_API_KEY', 'The provided Pixabay API key is invalid or unauthorized');
      }
      // If network unreachable, allow saving in local/offline environment with warning
      request.log.warn('Could not reach Pixabay to verify API key, saving anyway');
    }
  }

  const encryptedKey = encrypt(api_key);

  // Upsert or insert configuration
  const config = await prisma.aPI_Configurations.create({
    data: {
      provider_name: provider_name.toLowerCase(),
      api_key: encryptedKey,
      is_active,
    },
  });

  return reply.status(201).send({
    config_id: config.config_id,
    provider_name: config.provider_name,
    api_key: maskApiKey(api_key),
    is_active: config.is_active,
  });
}
