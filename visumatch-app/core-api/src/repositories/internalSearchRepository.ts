import { prisma } from '../utils/prisma.js';
import { BRollSearchResult } from '../integrations/pexelsClient.js';

export interface InternalSearchRepository {
  search(query: string, page: number, perPage: number): Promise<BRollSearchResult[]>;
}

export class PrismaInternalSearchRepository implements InternalSearchRepository {
  async search(query: string, page = 1, perPage = 12): Promise<BRollSearchResult[]> {
    const skip = (page - 1) * perPage;
    
    // We try search using title, description, or tags containing query
    // If fulltext works or LIKE fallback
    const terms = query.trim().split(/\s+/).filter(Boolean);
    const orConditions = terms.map((term) => ({
      OR: [
        { title: { contains: term } },
        { description: { contains: term } },
        { tags: { contains: term } },
      ],
    }));

    const assets = await prisma.internal_Assets.findMany({
      where: orConditions.length > 0 ? { OR: orConditions } : {},
      skip,
      take: perPage,
      orderBy: { created_at: 'desc' },
    });

    return assets.map((asset) => ({
      id: `int_${asset.asset_id}`,
      source: 'internal',
      provider: null,
      title: asset.title,
      thumbnail_url: asset.file_path, // Can be placeholder or asset file path
      preview_url: asset.file_path,
      duration: 10.0, // Default estimated internal clip duration
      width: 1920,
      height: 1080,
      tags: asset.tags ? asset.tags.split(',').map((t) => t.trim()) : [],
    }));
  }
}

export const internalSearchRepository = new PrismaInternalSearchRepository();
