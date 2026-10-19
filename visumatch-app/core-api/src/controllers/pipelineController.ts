import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { pipelineService } from '../services/pipelineService.js';
import { AppError } from '../utils/errors.js';

export async function getPipelineStatusHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const projectId = parseInt(id, 10);

  const status = await prisma.pipelineStatus.findUnique({
    where: { project_id: projectId },
  });

  if (!status) {
    return reply.send({
      stage: 'idle',
      status: 'idle',
      error_message: null,
    });
  }

  return reply.send(status);
}

export async function manualTranscribeHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const projectId = parseInt(id, 10);

  await pipelineService.runTranscribe(projectId);
  return reply.send({ success: true, message: 'Transcription completed' });
}

export async function manualExtractKeywordsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const projectId = parseInt(id, 10);

  await pipelineService.runExtractKeywords(projectId);
  return reply.send({ success: true, message: 'Keyword extraction completed' });
}

export async function manualFetchBrollHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const projectId = parseInt(id, 10);

  // Re-run pipeline from stage
  setImmediate(() => {
    pipelineService.runPipeline(projectId);
  });

  return reply.send({ success: true, message: 'Fetch B-Roll started' });
}

export async function manualSyncTimelineHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const projectId = parseInt(id, 10);

  setImmediate(() => {
    pipelineService.runPipeline(projectId);
  });

  return reply.send({ success: true, message: 'Timeline sync started' });
}
