import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env.js';
import { AppError } from '../utils/errors.js';

export interface TranscribeResponse {
  duration: number;
  language: string;
  segments: {
    start: number;
    end: number;
    text: string;
  }[];
}

export interface ExtractKeywordsResponse {
  source: 'llm' | 'fallback';
  keywords: {
    keyword: string;
    search_query_en: string;
    start: number;
    end: number;
    segment_index: number;
  }[];
}

export interface SuggestAlternativeResponse {
  keyword: string;
  search_query_en: string;
}

export interface NormalizeQueryResponse {
  source: 'llm' | 'fallback';
  search_query_en: string;
  tokens: string[];
}

export class AIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.aiServiceUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': config.internalServiceToken,
      },
    });
  }

  private async callWithRetry<T>(fn: () => Promise<T>, retries = 2, delay = 500): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      const status = err.response?.status;
      if (retries > 0 && (status === 502 || status === 504 || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT')) {
        await new Promise((res) => setTimeout(res, delay));
        return this.callWithRetry(fn, retries - 1, delay * 2);
      }
      this.handleError(err);
    }
  }

  private handleError(err: any): never {
    if (err.response) {
      const { status, data } = err.response;
      const errorCode = data?.error?.code || 'AI_SERVICE_ERROR';
      const errorMessage = data?.error?.message || 'Error occurred in AI service';
      throw new AppError(status, errorCode, errorMessage);
    }
    throw new AppError(502, 'AI_SERVICE_UNAVAILABLE', err.message || 'Cannot reach AI service');
  }

  async transcribe(filePath: string, language: string): Promise<TranscribeResponse> {
    if (config.mockAi) {
      return {
        duration: 30.0,
        language,
        segments: [
          { start: 0.0, end: 5.0, text: 'Halo semuanya, selamat datang di video pemandangan alam kami.' },
          { start: 5.0, end: 12.0, text: 'Hari ini kita akan menjelajahi keindahan pantai dan deburan ombak laut.' },
          { start: 12.0, end: 20.0, text: 'Lalu kita akan naik ke gunung dan menikmati suasana hutan yang sejuk.' },
          { start: 20.0, end: 30.0, text: 'Terima kasih telah menonton dan jangan lupa subscribe.' },
        ],
      };
    }

    return this.callWithRetry(async () => {
      const res = await this.client.post<TranscribeResponse>(
        '/v1/transcribe',
        { file_path: filePath, language },
        { timeout: 300000 } // 5 minutes timeout
      );
      return res.data;
    });
  }

  async extractKeywords(
    segments: { start: number; end: number; text: string }[],
    language: string,
    sensitivityLevel: number,
    llmApiKey?: string
  ): Promise<ExtractKeywordsResponse> {
    if (config.mockAi) {
      return {
        source: 'llm',
        keywords: [
          { keyword: 'pemandangan alam', search_query_en: 'nature landscape', start: 0.0, end: 5.0, segment_index: 0 },
          { keyword: 'pantai', search_query_en: 'tropical beach ocean waves', start: 5.0, end: 12.0, segment_index: 1 },
          { keyword: 'gunung dan hutan', search_query_en: 'mountain forest green nature', start: 12.0, end: 20.0, segment_index: 2 },
        ],
      };
    }

    const headers: Record<string, string> = {};
    if (llmApiKey) {
      headers['X-LLM-Api-Key'] = llmApiKey;
    }

    return this.callWithRetry(async () => {
      const res = await this.client.post<ExtractKeywordsResponse>(
        '/v1/keywords/extract',
        { segments, language, sensitivity_level: sensitivityLevel },
        { headers, timeout: 60000 }
      );
      return res.data;
    });
  }

  async suggestAlternative(
    segmentText: string,
    previousKeyword: string,
    language: string,
    llmApiKey?: string
  ): Promise<SuggestAlternativeResponse> {
    if (config.mockAi) {
      return {
        keyword: 'ombak laut',
        search_query_en: 'ocean waves aerial view',
      };
    }

    const headers: Record<string, string> = {};
    if (llmApiKey) {
      headers['X-LLM-Api-Key'] = llmApiKey;
    }

    return this.callWithRetry(async () => {
      const res = await this.client.post<SuggestAlternativeResponse>(
        '/v1/keywords/suggest-alternative',
        { segment_text: segmentText, previous_keyword: previousKeyword, language },
        { headers, timeout: 30000 }
      );
      return res.data;
    });
  }

  async normalizeQuery(query: string, language = 'id', llmApiKey?: string): Promise<NormalizeQueryResponse> {
    if (config.mockAi) {
      return {
        source: 'fallback',
        search_query_en: query,
        tokens: query.split(/\s+/),
      };
    }

    const headers: Record<string, string> = {};
    if (llmApiKey) {
      headers['X-LLM-Api-Key'] = llmApiKey;
    }

    try {
      // strictly 3 seconds timeout with graceful degradation
      const res = await this.client.post<NormalizeQueryResponse>(
        '/v1/query/normalize',
        { query, language },
        { headers, timeout: 3000 }
      );
      return res.data;
    } catch (err) {
      // Graceful fallback to original query
      return {
        source: 'fallback',
        search_query_en: query,
        tokens: query.split(/\s+/).filter(Boolean),
      };
    }
  }
}

export const aiClient = new AIClient();
