import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { aiClient } from '../integrations/aiClient.js';
import { dynamicExternalSearchProvider } from '../integrations/externalSearchProvider.js';
import { AppError } from '../utils/errors.js';
import { patchTimelineSchema, regenerateTimelineSchema, localAssetTimelineSchema } from '../schemas/index.js';
import { decrypt } from '../utils/crypto.js';

export async function getTimelineHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const projectId = parseInt(id, 10);

  const timeline = await prisma.timeline_EDL.findMany({
    where: { project_id: projectId },
    include: {
      b_roll: true,
      asset: true,
    },
    orderBy: [{ track_layer: 'asc' }, { start_pos: 'asc' }],
  });

  return reply.send({ timeline });
}

export async function patchTimelineHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id, edlId } = request.params as { id: string; edlId: string };
  const projectId = parseInt(id, 10);
  const edlItemId = parseInt(edlId, 10);

  const parseResult = patchTimelineSchema.safeParse(request.body);
  if (!parseResult.success) {
    throw parseResult.error;
  }

  const existing = await prisma.timeline_EDL.findUnique({
    where: { edl_id: edlItemId },
    include: { project: { include: { media_aroll: { orderBy: { uploaded_at: 'desc' }, take: 1 } } } },
  });

  if (!existing || existing.project_id !== projectId) {
    throw new AppError(404, 'EDL_NOT_FOUND', 'Timeline item not found');
  }

  const arollDuration = existing.project.media_aroll[0]?.duration || 3600;
  const newStart = parseResult.data.start_pos !== undefined ? parseResult.data.start_pos : existing.start_pos;
  const newEnd = parseResult.data.end_pos !== undefined ? parseResult.data.end_pos : existing.end_pos;
  const newTrack = parseResult.data.track_layer || existing.track_layer;

  if (newStart >= newEnd) {
    throw new AppError(422, 'INVALID_POSITION', 'End position must be strictly greater than start position');
  }

  if (newEnd > arollDuration) {
    throw new AppError(422, 'INVALID_POSITION', 'End position exceeds A-Roll duration');
  }

  // Check overlap excluding itself
  const overlappingClips = await prisma.timeline_EDL.findMany({
    where: {
      project_id: projectId,
      track_layer: newTrack,
      edl_id: { not: edlItemId },
      AND: [
        { start_pos: { lt: newEnd } },
        { end_pos: { gt: newStart } },
      ],
    },
  });

  if (overlappingClips.length > 0) {
    return reply.status(409).send({
      error: {
        code: 'TIMELINE_OVERLAP',
        message: 'Modified clip overlaps with existing clip on the same track',
        conflicts: overlappingClips,
      },
    });
  }

  const updated = await prisma.timeline_EDL.update({
    where: { edl_id: edlItemId },
    data: {
      start_pos: newStart,
      end_pos: newEnd,
      track_layer: newTrack,
    },
    include: {
      b_roll: true,
      asset: true,
    },
  });

  await prisma.projects.update({
    where: { project_id: projectId },
    data: { updated_at: new Date() },
  });

  return reply.send({ timeline_item: updated });
}

export async function regenerateTimelineHandler(request: FastifyRequest, reply: FastifyReply) {
  const { edlId } = request.params as { edlId: string };
  const edlItemId = parseInt(edlId, 10);

  const parseResult = regenerateTimelineSchema.safeParse(request.body);
  if (!parseResult.success) {
    throw parseResult.error;
  }

  const edlItem = await prisma.timeline_EDL.findUnique({
    where: { edl_id: edlItemId },
    include: {
      b_roll: true,
      project: {
        include: {
          ai_settings: true,
          media_aroll: {
            include: { transcripts: true },
          },
        },
      },
    },
  });

  if (!edlItem) {
    throw new AppError(404, 'EDL_NOT_FOUND', 'Timeline item not found');
  }

  let searchQuery = parseResult.data.keyword;

  if (!searchQuery) {
    // Find transcript segment matching start_pos
    const transcript = edlItem.project.media_aroll[0]?.transcripts?.find(
      (t) => t.start_time <= edlItem.start_pos && t.end_time >= edlItem.start_pos
    );
    const segmentText = transcript?.text_content || 'Pemandangan alam';
    const prevKeyword = edlItem.b_roll?.search_query || 'video';

    // Retrieve LLM api key
    let llmApiKey: string | undefined;
    const configRow = await prisma.aPI_Configurations.findFirst({
      where: { provider_name: { in: ['gemini', 'openai', 'llm'] }, is_active: true },
    });
    if (configRow) {
      try {
        llmApiKey = decrypt(configRow.api_key);
      } catch {
        llmApiKey = configRow.api_key;
      }
    }

    const alt = await aiClient.suggestAlternative(
      segmentText,
      prevKeyword,
      edlItem.project.ai_settings?.language || 'id',
      llmApiKey
    );
    searchQuery = alt.search_query_en || alt.keyword;
  }

  // Search active external provider with new keyword
  let results;
  try {
    results = await dynamicExternalSearchProvider.search(searchQuery, 1, 5, 'landscape');
  } catch (err) {
    throw new AppError(500, 'PROVIDER_ERROR', 'Failed to search video provider');
  }

  if (!results || results.length === 0) {
    throw new AppError(404, 'VIDEO_NOT_FOUND', 'Video kosong untuk kata kunci tersebut');
  }

  const chosen = results[0];
  const newBRoll = await prisma.external_BRoll.create({
    data: {
      source_url: chosen.preview_url,
      provider: chosen.provider || 'pexels',
      search_query: searchQuery.slice(0, 100),
    },
  });

  const updated = await prisma.timeline_EDL.update({
    where: { edl_id: edlItemId },
    data: {
      b_roll_id: newBRoll.b_roll_id,
      asset_id: null,
    },
    include: {
      b_roll: true,
      asset: true,
    },
  });

  return reply.send({
    message: 'Timeline clip regenerated successfully',
    keyword: searchQuery,
    timeline_item: updated,
  });
}

export async function deleteTimelineHandler(request: FastifyRequest, reply: FastifyReply) {
  const { edlId } = request.params as { edlId: string };
  const edlItemId = parseInt(edlId, 10);

  if (isNaN(edlItemId)) {
    throw new AppError(400, 'INVALID_PARAMETER', 'edlId must be a valid number');
  }

  const existing = await prisma.timeline_EDL.findUnique({
    where: { edl_id: edlItemId },
    include: { project: true },
  });

  if (!existing) {
    throw new AppError(404, 'EDL_NOT_FOUND', 'Timeline item not found');
  }

  // Check project ownership: Creator can only delete within their own project, Admin can delete any
  if (request.user?.role !== 'Admin' && existing.project.user_id !== request.user?.userId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this timeline item');
  }

  await prisma.timeline_EDL.delete({
    where: { edl_id: edlItemId },
  });

  await prisma.projects.update({
    where: { project_id: existing.project_id },
    data: { updated_at: new Date() },
  });

  return reply.status(200).send({
    success: true,
    edl_id: edlItemId,
    message: 'Timeline item deleted successfully',
  });
}

export async function addLocalAssetTimelineHandler(request: FastifyRequest, reply: FastifyReply) {
  const parseResult = localAssetTimelineSchema.safeParse(request.body);
  if (!parseResult.success) {
    throw parseResult.error;
  }

  const { asset_id, start_pos, end_pos, track_layer } = parseResult.data;

  const asset = await prisma.internal_Assets.findUnique({
    where: { asset_id },
  });

  if (!asset) {
    throw new AppError(404, 'ASSET_NOT_FOUND', 'Internal asset not found');
  }

  // Default project: find latest active project of the user
  const userProject = await prisma.projects.findFirst({
    where: { user_id: request.user!.userId },
    orderBy: { updated_at: 'desc' },
  });

  if (!userProject) {
    throw new AppError(404, 'PROJECT_NOT_FOUND', 'No active project found for current user');
  }

  if (end_pos <= start_pos) {
    throw new AppError(422, 'INVALID_POSITION', 'End position must be greater than start position');
  }

  const timelineItem = await prisma.timeline_EDL.create({
    data: {
      project_id: userProject.project_id,
      track_layer,
      start_pos,
      end_pos,
      asset_id,
      b_roll_id: null,
    },
    include: {
      asset: true,
    },
  });

  return reply.status(201).send({ timeline_item: timelineItem });
}
