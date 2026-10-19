import axios from 'axios';
import { prisma } from '../utils/prisma.js';
import { decrypt } from '../utils/crypto.js';
import { ExternalSearchProvider, BRollSearchResult } from './pexelsClient.js';

export class PixabayClient implements ExternalSearchProvider {
  async getActiveApiKey(): Promise<string | null> {
    const configRow = await prisma.aPI_Configurations.findFirst({
      where: {
        provider_name: { equals: 'pixabay' },
        is_active: true,
      },
    });

    if (!configRow) return null;
    try {
      return decrypt(configRow.api_key);
    } catch {
      return configRow.api_key;
    }
  }

  async search(query: string, page = 1, perPage = 12, orientation = 'landscape'): Promise<BRollSearchResult[]> {
    const apiKey = await this.getActiveApiKey();
    if (!apiKey) {
      throw new Error('EXTERNAL_PROVIDER_NOT_CONFIGURED');
    }

    try {
      const response = await axios.get('https://pixabay.com/api/videos/', {
        params: {
          key: apiKey,
          q: query,
          page,
          per_page: perPage,
          safesearch: 'true',
        },
        timeout: 10000,
      });

      const hits = response.data?.hits || [];
      return hits.map((hit: any) => {
        const videos = hit.videos || {};
        const chosenVideo = videos.medium?.url ? videos.medium : (videos.small?.url ? videos.small : null);
        const previewUrl = chosenVideo?.url || videos.large?.url || videos.tiny?.url || '';
        const thumbnailUrl = videos.tiny?.thumbnail || '';
        const tags = hit.tags ? hit.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
        const width = chosenVideo?.width || 1920;
        const height = chosenVideo?.height || 1080;

        return {
          id: `ext_${hit.id}`,
          source: 'external' as const,
          provider: 'pixabay' as const,
          title: tags.slice(0, 3).join(' ') || 'Pixabay Video',
          thumbnail_url: thumbnailUrl,
          preview_url: previewUrl,
          duration: hit.duration || 0,
          width,
          height,
          tags,
        };
      });
    } catch (err: any) {
      if (err.response?.status === 429) {
        throw new Error('PIXABAY_RATE_LIMIT_EXCEEDED: Pixabay rate limit exceeded (100 requests per 60 seconds). Please try again later.');
      }
      throw err;
    }
  }
}

export const pixabayClient = new PixabayClient();
