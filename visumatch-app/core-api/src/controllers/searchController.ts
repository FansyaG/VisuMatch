import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { searchService } from '../services/searchService.js';
import { searchBrollSchema, timelineFromSearchSchema } from '../schemas/index.js';
import { AppError } from '../utils/errors.js';
import { decrypt } from '../utils/crypto.js';

export async function searchBrollHandler(request: FastifyRequest, reply: FastifyReply) {
  const parseResult = searchBrollSchema.safeParse(request.query);
  if (!parseResult.success) {
    throw parseResult.error;
  }

  const { q, source, page, per_page, orientation } = parseResult.data;

  // Retrieve LLM api key if available for query normalization
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

  const result = await searchService.searchBroll({
    query: q,
    source,
    page,
    perPage: per_page,
    orientation,
    language: 'id',
    llmApiKey,
  });

  return reply.send(result);
}

export async function addTimelineFromSearchHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const projectId = parseInt(id, 10);

  const parseResult = timelineFromSearchSchema.safeParse(request.body);
  if (!parseResult.success) {
    throw parseResult.error;
  }

  const data = parseResult.data;
  const trackLayer = data.track_layer || 'V2';
  const startPos = data.start_pos;
  let endPos = data.end_pos;

  // Get project & A-Roll duration to validate boundaries
  const project = await prisma.projects.findUnique({
    where: { project_id: projectId },
    include: { media_aroll: { orderBy: { uploaded_at: 'desc' }, take: 1 } },
  });

  if (!project) {
    throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }

  const arollDuration = project.media_aroll[0]?.duration || 3600;

  if (startPos >= arollDuration) {
    throw new AppError(422, 'INVALID_POSITION', 'Start position cannot exceed A-Roll duration');
  }

  if (endPos === undefined) {
    // Default 5 seconds or clipped to aroll duration
    endPos = Math.min(startPos + 5.0, arollDuration);
  }

  if (endPos <= startPos) {
    throw new AppError(422, 'INVALID_POSITION', 'End position must be greater than start position');
  }

  if (endPos > arollDuration) {
    endPos = arollDuration;
  }

  // Check overlap on the same track
  const overlappingClips = await prisma.timeline_EDL.findMany({
    where: {
      project_id: projectId,
      track_layer: trackLayer,
      AND: [
        { start_pos: { lt: endPos } },
        { end_pos: { gt: startPos } },
      ],
    },
  });

  if (overlappingClips.length > 0) {
    return reply.status(409).send({
      error: {
        code: 'TIMELINE_OVERLAP',
        message: 'Clip overlaps with existing clip on the same track',
        conflicts: overlappingClips,
      },
    });
  }

  let bRollId: number | null = null;
  let assetId: number | null = null;

  if (data.source === 'external') {
    let resolvedProvider = data.provider || 'pexels';
    if (!data.provider) {
      // If not passed explicitly, determine from active config
      const activeConfigs = await prisma.aPI_Configurations.findMany({
        where: {
          provider_name: { in: ['pexels', 'pixabay'] },
          is_active: true,
        },
      });
      const names = activeConfigs.map((c) => c.provider_name.toLowerCase());
      if (names.includes('pexels')) {
        resolvedProvider = 'pexels';
      } else if (names.includes('pixabay')) {
        resolvedProvider = 'pixabay';
      }
    }

    const externalBRoll = await prisma.external_BRoll.create({
      data: {
        source_url: data.preview_url || '',
        provider: resolvedProvider,
        search_query: data.q || '',
      },
    });
    bRollId = externalBRoll.b_roll_id;
  } else if (data.source === 'internal') {
    if (!data.asset_id) {
      throw new AppError(400, 'MISSING_ASSET_ID', 'asset_id is required for internal source');
    }
    const asset = await prisma.internal_Assets.findUnique({
      where: { asset_id: data.asset_id },
    });
    if (!asset) {
      throw new AppError(404, 'ASSET_NOT_FOUND', 'Internal asset not found');
    }
    assetId = asset.asset_id;
  }

  const timelineItem = await prisma.timeline_EDL.create({
    data: {
      project_id: projectId,
      track_layer: trackLayer,
      start_pos: startPos,
      end_pos: endPos,
      b_roll_id: bRollId,
      asset_id: assetId,
    },
    include: {
      b_roll: true,
      asset: true,
    },
  });

  // Update project updated_at
  await prisma.projects.update({
    where: { project_id: projectId },
    data: { updated_at: new Date() },
  });

  return reply.status(201).send({ timeline_item: timelineItem });
}
