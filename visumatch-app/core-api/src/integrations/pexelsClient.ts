import axios from 'axios';
import { prisma } from '../utils/prisma.js';
import { decrypt } from '../utils/crypto.js';

export interface BRollSearchResult {
  id: string;
  source: 'external' | 'internal';
  provider: 'pexels' | 'pixabay' | null;
  title: string;
  thumbnail_url: string;
  preview_url: string;
  duration: number;
  width: number;
  height: number;
  tags: string[];
}

export interface ExternalSearchProvider {
  search(query: string, page: number, perPage: number, orientation: string): Promise<BRollSearchResult[]>;
}

export class PexelsClient implements ExternalSearchProvider {
  async getActiveApiKey(): Promise<string | null> {
    const configRow = await prisma.aPI_Configurations.findFirst({
      where: {
        provider_name: { equals: 'pexels' },
        is_active: true,
      },
    });

    if (!configRow) return null;
    try {
      return decrypt(configRow.api_key);
    } catch {
      return configRow.api_key; // fallback if stored unencrypted in mock
    }
  }

  async search(query: string, page = 1, perPage = 12, orientation = 'landscape'): Promise<BRollSearchResult[]> {
    const apiKey = await this.getActiveApiKey();
    if (!apiKey) {
      throw new Error('EXTERNAL_PROVIDER_NOT_CONFIGURED');
    }

    const response = await axios.get('https://api.pexels.com/videos/search', {
      headers: {
        Authorization: apiKey,
      },
      params: {
        query,
        page,
        per_page: perPage,
        orientation,
      },
      timeout: 10000,
    });

    const videos = response.data?.videos || [];
    return videos.map((video: any) => {
      // Find best video file for preview
      const videoFile = video.video_files?.find((f: any) => f.quality === 'sd' || f.quality === 'hd') || video.video_files?.[0];
      return {
        id: `ext_${video.id}`,
        source: 'external',
        provider: 'pexels',
        title: video.url?.split('/').filter(Boolean).pop()?.replace(/-\d+$/, '').replace(/-/g, ' ') || 'Pexels Video',
        thumbnail_url: video.image || '',
        preview_url: videoFile?.link || '',
        duration: video.duration || 0,
        width: video.width || 1920,
        height: video.height || 1080,
        tags: video.tags?.map((t: any) => t.name || t) || [],
      };
    });
  }
}

export const pexelsClient = new PexelsClient();
