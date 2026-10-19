import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { exportTimelineSchema } from '../schemas/index.js';
import { AppError } from '../utils/errors.js';

export async function exportVideoHandler(request: FastifyRequest, reply: FastifyReply) {
  // In deadline mode, return 501 NOT_IMPLEMENTED as specified in prompt
  return reply.status(501).send({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Video rendering via FFmpeg is disabled in deadline mode. Use timeline export (XML/EDL) instead.',
    },
  });
}

export async function getExportJobHandler(request: FastifyRequest, reply: FastifyReply) {
  const { jobId } = request.params as { jobId: string };
  const id = parseInt(jobId, 10);

  const job = await prisma.exportJob.findUnique({
    where: { job_id: id },
  });

  if (!job) {
    throw new AppError(404, 'JOB_NOT_FOUND', 'Export job not found');
  }

  return reply.send({ job });
}

export async function exportTimelineHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const projectId = parseInt(id, 10);

  const parseResult = exportTimelineSchema.safeParse(request.query);
  if (!parseResult.success) {
    throw parseResult.error;
  }

  const { format } = parseResult.data;

  const project = await prisma.projects.findUnique({
    where: { project_id: projectId },
    include: {
      media_aroll: true,
      timeline_edl: {
        include: { b_roll: true, asset: true },
        orderBy: [{ track_layer: 'asc' }, { start_pos: 'asc' }],
      },
    },
  });

  if (!project) {
    throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }

  if (format === 'edl') {
    // Generate CMX3600 EDL
    let edlContent = `TITLE: ${project.project_name.toUpperCase()}\nFCM: NON-DROP FRAME\n\n`;
    project.timeline_edl.forEach((clip, index) => {
      const eventNum = String(index + 1).padStart(3, '0');
      const reel = clip.b_roll ? 'BROLL' : 'ASSET';
      const track = clip.track_layer === 'V2' ? 'V' : clip.track_layer;
      
      const formatTime = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        const f = Math.floor((secs % 1) * 25);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
      };

      const srcIn = formatTime(0);
      const srcOut = formatTime(clip.end_pos - clip.start_pos);
      const dstIn = formatTime(clip.start_pos);
      const dstOut = formatTime(clip.end_pos);

      edlContent += `${eventNum}  ${reel}    ${track}     C        ${srcIn} ${srcOut} ${dstIn} ${dstOut}\n`;
      const clipName = clip.b_roll ? clip.b_roll.search_query : clip.asset?.title || 'Clip';
      edlContent += `* FROM CLIP NAME: ${clipName}\n\n`;
    });

    reply.header('Content-Type', 'text/plain');
    reply.header('Content-Disposition', `attachment; filename="${project.project_name}.edl"`);
    return reply.send(edlContent);
  }

  // Final Cut Pro XML (FCPXML/Premiere-compatible)
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="5">\n`;
  xml += `  <project>\n    <name>${project.project_name}</name>\n    <children>\n      <sequence>\n        <name>${project.project_name}</name>\n        <media>\n          <video>\n            <track>\n`;

  project.timeline_edl.forEach((clip, index) => {
    const clipName = clip.b_roll ? clip.b_roll.search_query : clip.asset?.title || 'Clip';
    const clipUrl = clip.b_roll ? clip.b_roll.source_url : clip.asset?.file_path || '';
    const startFrame = Math.round(clip.start_pos * 25);
    const endFrame = Math.round(clip.end_pos * 25);

    xml += `              <clipitem id="clipitem-${index + 1}">\n`;
    xml += `                <name>${clipName}</name>\n`;
    xml += `                <start>${startFrame}</start>\n`;
    xml += `                <end>${endFrame}</end>\n`;
    xml += `                <file id="file-${index + 1}">\n`;
    xml += `                  <name>${clipName}</name>\n`;
    xml += `                  <pathurl>${clipUrl}</pathurl>\n`;
    xml += `                </file>\n`;
    xml += `              </clipitem>\n`;
  });

  xml += `            </track>\n          </video>\n        </media>\n      </sequence>\n    </children>\n  </project>\n</xmeml>\n`;

  reply.header('Content-Type', 'application/xml');
  reply.header('Content-Disposition', `attachment; filename="${project.project_name}.xml"`);
  return reply.send(xml);
}
