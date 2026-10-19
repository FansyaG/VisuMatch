import { prisma } from '../utils/prisma.js';
import { pexelsClient, ExternalSearchProvider, BRollSearchResult } from './pexelsClient.js';
import { pixabayClient } from './pixabayClient.js';

export class DynamicExternalSearchProvider implements ExternalSearchProvider {
  constructor(
    private pexels: ExternalSearchProvider = pexelsClient,
    private pixabay: ExternalSearchProvider = pixabayClient
  ) {}

  async search(query: string, page = 1, perPage = 12, orientation = 'landscape'): Promise<BRollSearchResult[]> {
    // Check active configurations
    const activeConfigs = await prisma.aPI_Configurations.findMany({
      where: {
        provider_name: { in: ['pexels', 'pixabay'] },
        is_active: true,
      },
    });

    const activeProviders = activeConfigs.map((c) => c.provider_name.toLowerCase());
    const isPexelsActive = activeProviders.includes('pexels');
    const isPixabayActive = activeProviders.includes('pixabay');

    if (!isPexelsActive && !isPixabayActive) {
      throw new Error('EXTERNAL_PROVIDER_NOT_CONFIGURED');
    }

    if (isPexelsActive && isPixabayActive) {
      // Prioritize Pexels, fallback to Pixabay if empty or error
      try {
        const results = await this.pexels.search(query, page, perPage, orientation);
        if (results && results.length > 0) {
          return results;
        }
      } catch (err) {
        // Fallback to Pixabay
      }

      return await this.pixabay.search(query, page, perPage, orientation);
    }

    if (isPexelsActive) {
      return await this.pexels.search(query, page, perPage, orientation);
    }

    // Only Pixabay active
    return await this.pixabay.search(query, page, perPage, orientation);
  }
}

export const dynamicExternalSearchProvider = new DynamicExternalSearchProvider();
