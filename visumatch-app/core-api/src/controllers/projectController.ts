import { FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../utils/prisma.js';
import { config } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { createProjectSchema, updateAISettingsSchema } from '../schemas/index.js';

export async function createProjectHandler(request: FastifyRequest, reply: FastifyReply) {
  const parseResult = createProjectSchema.safeParse(request.body);
  if (!parseResult.success) {
    throw parseResult.error;
  }

  const { project_name, resolution } = parseResult.data;
  const userId = request.user!.userId;

  const project = await prisma.projects.create({
    data: {
      user_id: userId,
      project_name,
      resolution,
      ai_settings: {
        create: {
          language: 'id',
          sensitivity_level: 3,
        },
      },
      pipeline_status: {
        create: {
          stage: 'idle',
          status: 'idle',
        },
      },
    },
    include: {
      ai_settings: true,
      pipeline_status: true,
    },
  });

  return reply.status(201).send({ project });
}

export async function getProjectsHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user!.userId;
  const role = request.user!.role;

  const where = role === 'Admin' ? {} : { user_id: userId };

  const projects = await prisma.projects.findMany({
    where,
    include: {
      ai_settings: true,
      pipeline_status: true,
      media_aroll: {
        select: {
          media_id: true,
          file_name: true,
          duration: true,
          uploaded_at: true,
        },
      },
    },
    orderBy: { updated_at: 'desc' },
  });

  return reply.send({ projects });
}

export async function getProjectDetailHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const projectId = parseInt(id, 10);

  const project = await prisma.projects.findUnique({
    where: { project_id: projectId },
    include: {
      ai_settings: true,
      pipeline_status: true,
      media_aroll: {
        include: {
          transcripts: {
            include: {
              keywords: true,
            },
          },
        },
      },
      timeline_edl: {
        include: {
          b_roll: true,
          asset: true,
        },
        orderBy: [{ track_layer: 'asc' }, { start_pos: 'asc' }],
      },
    },
  });

  if (!project) {
    throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }

  const mediaWithStream = project.media_aroll.map((m) => ({
    ...m,
    stream_url: `/api/v1/projects/${projectId}/aroll/stream`,
  }));

  return reply.send({
    project: {
      ...project,
      media_aroll: mediaWithStream,
    },
  });
}

export async function deleteProjectHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const projectId = parseInt(id, 10);

  const project = await prisma.projects.findUnique({
    where: { project_id: projectId },
  });

  if (!project) {
    throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }

  // Delete physical files under storage /aroll/<projectId>/
  const projectStorageDir = path.join(config.storageRoot, 'aroll', String(projectId));
  try {
    await fs.rm(projectStorageDir, { recursive: true, force: true });
  } catch (err) {
    request.log.warn(`Could not delete physical directory: ${projectStorageDir}`);
  }

  // Cascade delete in Prisma DB
  await prisma.projects.delete({
    where: { project_id: projectId },
  });

  return reply.send({ success: true, message: 'Project deleted successfully' });
}

export async function updateAISettingsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const projectId = parseInt(id, 10);

  const parseResult = updateAISettingsSchema.safeParse(request.body);
  if (!parseResult.success) {
    throw parseResult.error;
  }

  const { language, sensitivity_level } = parseResult.data;

  const aiSettings = await prisma.aI_Settings.upsert({
    where: { project_id: projectId },
    update: { language, sensitivity_level },
    create: {
      project_id: projectId,
      language,
      sensitivity_level,
    },
  });

  return reply.send({ ai_settings: aiSettings });
}
