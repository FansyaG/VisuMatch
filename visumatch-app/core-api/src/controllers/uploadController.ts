import { FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import { prisma } from '../utils/prisma.js';
import { config } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { pipelineService } from '../services/pipelineService.js';

export async function uploadARollHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const projectId = parseInt(id, 10);

  const data = await request.file();
  if (!data) {
    throw new AppError(400, 'FILE_NOT_FOUND', 'No file was uploaded');
  }

  // Validate MIME type
  const allowedMime = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm', 'audio/mp3', 'audio/wav', 'audio/mpeg'];
  if (!allowedMime.includes(data.mimetype) && !data.filename.match(/\.(mp4|mov|mkv|webm|mp3|wav)$/i)) {
    throw new AppError(422, 'UNSUPPORTED_MEDIA', 'Only video/audio media files are supported');
  }

  // Sanitize filename
  const sanitizedFilename = data.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const projectStorageDir = path.join(config.storageRoot, 'aroll', String(projectId));
  await fsp.mkdir(projectStorageDir, { recursive: true });

  const destinationPath = path.join(projectStorageDir, sanitizedFilename);
  await pipeline(data.file, fs.createWriteStream(destinationPath));

  // Relative path to storage root
  const relativeFilePath = `aroll/${projectId}/${sanitizedFilename}`;

  // Estimate duration or default to 60.0s for mock/metadata
  const media = await prisma.media_ARoll.create({
    data: {
      project_id: projectId,
      file_name: sanitizedFilename,
      file_path: relativeFilePath,
      duration: 60.0,
    },
  });

  // Automatically enqueue pipeline fire-and-forget in deadline mode
  setImmediate(() => {
    pipelineService.runPipeline(projectId);
  });

  return reply.status(201).send({
    message: 'A-Roll uploaded and pipeline started',
    media,
  });
}

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.mp3': 'audio/mp3',
  '.wav': 'audio/wav',
  '.mpeg': 'audio/mpeg',
  '.ogg': 'audio/ogg',
};

export async function streamARollHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const projectId = parseInt(id, 10);

  const media = await prisma.media_ARoll.findFirst({
    where: { project_id: projectId },
    orderBy: { uploaded_at: 'desc' },
  });

  if (!media) {
    throw new AppError(404, 'AROLL_NOT_FOUND', 'A-Roll media not found for this project');
  }

  // Prevent path traversal
  const resolvedBase = path.resolve(config.storageRoot);
  const targetFilePath = path.resolve(config.storageRoot, media.file_path);

  if (!targetFilePath.startsWith(resolvedBase)) {
    throw new AppError(403, 'FORBIDDEN', 'Invalid file path traversal detected');
  }

  let stats;
  try {
    stats = await fsp.stat(targetFilePath);
  } catch {
    throw new AppError(404, 'FILE_NOT_FOUND', 'Physical A-Roll file not found on disk');
  }

  const fileSize = stats.size;
  const ext = path.extname(targetFilePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const range = request.headers.range;

  if (range) {
    // Parse Range header e.g. "bytes=0-1024"
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (isNaN(start) || start >= fileSize || (parts[1] && (isNaN(end) || end < start || end >= fileSize))) {
      reply.header('Content-Range', `bytes */${fileSize}`);
      return reply.status(416).send('Requested Range Not Satisfiable');
    }

    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(targetFilePath, { start, end });

    reply.status(206);
    reply.headers({
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    });

    return reply.send(fileStream);
  } else {
    // Return full content
    const fileStream = fs.createReadStream(targetFilePath);

    reply.status(200);
    reply.headers({
      'Accept-Ranges': 'bytes',
      'Content-Length': fileSize,
      'Content-Type': contentType,
    });

    return reply.send(fileStream);
  }
}
