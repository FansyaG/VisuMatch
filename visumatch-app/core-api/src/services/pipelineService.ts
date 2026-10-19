import { prisma } from '../utils/prisma.js';
import { aiClient } from '../integrations/aiClient.js';
import { dynamicExternalSearchProvider } from '../integrations/externalSearchProvider.js';
import { decrypt } from '../utils/crypto.js';

export class PipelineService {
  async getLlmApiKey(): Promise<string | undefined> {
    const configRow = await prisma.aPI_Configurations.findFirst({
      where: {
        provider_name: { in: ['gemini', 'openai', 'llm'] },
        is_active: true,
      },
    });

    if (!configRow) return undefined;
    try {
      return decrypt(configRow.api_key);
    } catch {
      return configRow.api_key;
    }
  }

  async runPipeline(projectId: number): Promise<void> {
    // Stage tracker helper
    const setStatus = async (stage: string, status: 'processing' | 'completed' | 'failed', errorMessage?: string) => {
      await prisma.pipelineStatus.upsert({
        where: { project_id: projectId },
        update: { stage, status, error_message: errorMessage || null },
        create: { project_id: projectId, stage, status, error_message: errorMessage || null },
      });
    };

    try {
      // 1. Get project, media, and settings
      const project = await prisma.projects.findUnique({
        where: { project_id: projectId },
        include: {
          media_aroll: { orderBy: { uploaded_at: 'desc' }, take: 1 },
          ai_settings: true,
        },
      });

      if (!project || project.media_aroll.length === 0) {
        await setStatus('init', 'failed', 'Project or A-Roll media not found');
        return;
      }

      const media = project.media_aroll[0];
      const language = project.ai_settings?.language || 'id';
      const sensitivityLevel = project.ai_settings?.sensitivity_level || 3;
      const llmKey = await this.getLlmApiKey();

      // ==========================================
      // STAGE 1: TRANSCRIBE
      // ==========================================
      await setStatus('transcribe', 'processing');
      const transcribeRes = await aiClient.transcribe(media.file_path, language);

      // Save Transcripts
      await prisma.transcripts.deleteMany({ where: { media_id: media.media_id } });
      const createdTranscripts = [];
      for (const seg of transcribeRes.segments) {
        const tr = await prisma.transcripts.create({
          data: {
            media_id: media.media_id,
            text_content: seg.text,
            start_time: seg.start,
            end_time: seg.end,
          },
        });
        createdTranscripts.push({ ...tr, segmentIndex: createdTranscripts.length });
      }

      // ==========================================
      // STAGE 2: KEYWORDS EXTRACTION
      // ==========================================
      await setStatus('keywords', 'processing');
      const segmentsInput = createdTranscripts.map((t) => ({
        start: t.start_time,
        end: t.end_time,
        text: t.text_content,
      }));

      const keywordsRes = await aiClient.extractKeywords(segmentsInput, language, sensitivityLevel, llmKey);

      for (const kw of keywordsRes.keywords) {
        const transcript = createdTranscripts[kw.segment_index] || createdTranscripts[0];
        if (transcript) {
          await prisma.extracted_Keywords.create({
            data: {
              transcript_id: transcript.transcript_id,
              keyword: kw.keyword.slice(0, 50),
            },
          });
        }
      }

      // ==========================================
      // STAGE 3: FETCH B-ROLL
      // ==========================================
      await setStatus('fetch_broll', 'processing');
      const externalBRolls = [];

      for (const kw of keywordsRes.keywords) {
        try {
          const results = await dynamicExternalSearchProvider.search(kw.search_query_en || kw.keyword, 1, 3, 'landscape');
          if (results.length > 0) {
            const chosen = results[0];
            const eb = await prisma.external_BRoll.create({
              data: {
                source_url: chosen.preview_url,
                provider: chosen.provider || 'pexels',
                search_query: kw.keyword.slice(0, 100),
              },
            });
            externalBRolls.push({
              b_roll_id: eb.b_roll_id,
              start: kw.start,
              end: kw.end,
              duration: chosen.duration,
            });
          }
        } catch (err) {
          // If external provider fails or isn't configured, continue pipeline without crashing
          console.warn(`Could not fetch B-Roll for keyword "${kw.keyword}":`, err);
        }
      }

      // ==========================================
      // STAGE 4: SYNC TIMELINE
      // ==========================================
      await setStatus('sync_timeline', 'processing');

      // Clear existing auto B-Roll tracks on V2
      await prisma.timeline_EDL.deleteMany({
        where: {
          project_id: projectId,
          track_layer: 'V2',
        },
      });

      for (const broll of externalBRolls) {
        const clipDuration = broll.end - broll.start > 0 ? broll.end - broll.start : (broll.duration || 5.0);
        const endPos = Math.min(broll.start + clipDuration, media.duration || 9999);

        if (endPos > broll.start) {
          await prisma.timeline_EDL.create({
            data: {
              project_id: projectId,
              track_layer: 'V2',
              start_pos: broll.start,
              end_pos: endPos,
              b_roll_id: broll.b_roll_id,
            },
          });
        }
      }

      await setStatus('completed', 'completed');
    } catch (err: any) {
      console.error('Pipeline execution error:', err);
      await setStatus('failed', 'failed', err.message || 'Pipeline failed');
    }
  }

  // Trigger stages independently for manual endpoints
  async runTranscribe(projectId: number): Promise<void> {
    const project = await prisma.projects.findUnique({
      where: { project_id: projectId },
      include: { media_aroll: { orderBy: { uploaded_at: 'desc' }, take: 1 }, ai_settings: true },
    });
    if (!project || project.media_aroll.length === 0) throw new Error('A-Roll media not found');
    const media = project.media_aroll[0];
    const res = await aiClient.transcribe(media.file_path, project.ai_settings?.language || 'id');
    
    await prisma.transcripts.deleteMany({ where: { media_id: media.media_id } });
    for (const seg of res.segments) {
      await prisma.transcripts.create({
        data: {
          media_id: media.media_id,
          text_content: seg.text,
          start_time: seg.start,
          end_time: seg.end,
        },
      });
    }
  }

  async runExtractKeywords(projectId: number): Promise<void> {
    const project = await prisma.projects.findUnique({
      where: { project_id: projectId },
      include: {
        media_aroll: {
          orderBy: { uploaded_at: 'desc' },
          take: 1,
          include: { transcripts: true },
        },
        ai_settings: true,
      },
    });
    if (!project || project.media_aroll.length === 0) throw new Error('A-Roll media not found');
    const transcripts = project.media_aroll[0].transcripts;
    const llmKey = await this.getLlmApiKey();

    const res = await aiClient.extractKeywords(
      transcripts.map((t) => ({ start: t.start_time, end: t.end_time, text: t.text_content })),
      project.ai_settings?.language || 'id',
      project.ai_settings?.sensitivity_level || 3,
      llmKey
    );

    for (const kw of res.keywords) {
      const tr = transcripts[kw.segment_index] || transcripts[0];
      if (tr) {
        await prisma.extracted_Keywords.create({
          data: {
            transcript_id: tr.transcript_id,
            keyword: kw.keyword.slice(0, 50),
          },
        });
      }
    }
  }
}

export const pipelineService = new PipelineService();
