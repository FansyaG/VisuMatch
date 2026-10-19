import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { encrypt, decrypt, maskApiKey } from '../src/utils/crypto.js';
import { searchService } from '../src/services/searchService.js';
import { ExternalSearchProvider, BRollSearchResult } from '../src/integrations/pexelsClient.js';
import { PixabayClient } from '../src/integrations/pixabayClient.js';
import { DynamicExternalSearchProvider } from '../src/integrations/externalSearchProvider.js';
import { InternalSearchRepository } from '../src/repositories/internalSearchRepository.js';
import { prisma } from '../src/utils/prisma.js';

describe('Crypto Utility Tests', () => {
  it('should encrypt and decrypt API key correctly', () => {
    const original = 'PexelsApiKey_1234567890abcdef';
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted.split(':').length).toBe(3);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should mask API key correctly', () => {
    expect(maskApiKey('AIzaSy1234567890XYZ')).toBe('AIza...0XYZ');
    expect(maskApiKey('short')).toBe('****');
  });
});

describe('SearchService Unit Tests', () => {
  const mockExternal: ExternalSearchProvider = {
    search: async (q: string): Promise<BRollSearchResult[]> => [
      {
        id: 'ext_1',
        source: 'external',
        provider: 'pexels',
        title: 'Beach clip',
        thumbnail_url: 'http://img.com/1',
        preview_url: 'http://video.com/1',
        duration: 10,
        width: 1920,
        height: 1080,
        tags: ['beach'],
      },
    ],
  };

  const mockInternal: InternalSearchRepository = {
    search: async (q: string): Promise<BRollSearchResult[]> => [
      {
        id: 'int_1',
        source: 'internal',
        provider: null,
        title: 'Local Pantai',
        thumbnail_url: '/local/1',
        preview_url: '/local/1',
        duration: 10,
        width: 1920,
        height: 1080,
        tags: ['pantai'],
      },
    ],
  };

  it('should return combined results for source=all', async () => {
    const service = new searchService.constructor(mockExternal, mockInternal);
    const res = await service.searchBroll({
      query: 'pantai',
      source: 'all',
      page: 1,
      perPage: 10,
      orientation: 'landscape',
    });

    expect(res.results.length).toBe(2);
    expect(res.results[0].source).toBe('external');
    expect(res.results[1].source).toBe('internal');
    expect(res.warnings.length).toBe(0);
  });

  it('should handle partial failure gracefully when external provider fails', async () => {
    const failingExternal: ExternalSearchProvider = {
      search: async () => {
        throw new Error('EXTERNAL_PROVIDER_NOT_CONFIGURED');
      },
    };

    const service = new searchService.constructor(failingExternal, mockInternal);
    const res = await service.searchBroll({
      query: 'pantai',
      source: 'all',
      page: 1,
      perPage: 10,
      orientation: 'landscape',
    });

    expect(res.results.length).toBe(1);
    expect(res.results[0].source).toBe('internal');
    expect(res.warnings).toContain('EXTERNAL_PROVIDER_NOT_CONFIGURED');
  });

  describe('DynamicExternalSearchProvider Unit Tests', () => {
    it('should prioritize Pexels when both are active and Pexels succeeds', async () => {
      const pexelsMock: ExternalSearchProvider = {
        search: async () => [
          {
            id: 'ext_px_1',
            source: 'external',
            provider: 'pexels',
            title: 'Pexels Clip',
            thumbnail_url: 'http://img.com/px',
            preview_url: 'http://video.com/px',
            duration: 12,
            width: 1920,
            height: 1080,
            tags: ['sky'],
          },
        ],
      };

      const pixabayMock: ExternalSearchProvider = {
        search: async () => [
          {
            id: 'ext_pix_1',
            source: 'external',
            provider: 'pixabay',
            title: 'Pixabay Clip',
            thumbnail_url: 'http://img.com/pix',
            preview_url: 'http://video.com/pix',
            duration: 15,
            width: 1920,
            height: 1080,
            tags: ['sky'],
          },
        ],
      };

      // Mock prisma.aPI_Configurations.findMany
      const originalFindMany = prisma.aPI_Configurations.findMany;
      (prisma.aPI_Configurations as any).findMany = async () => [
        { config_id: 1, provider_name: 'pexels', api_key: 'enc', is_active: true },
        { config_id: 2, provider_name: 'pixabay', api_key: 'enc', is_active: true },
      ];

      try {
        const provider = new DynamicExternalSearchProvider(pexelsMock, pixabayMock);
        const results = await provider.search('sky');
        expect(results.length).toBe(1);
        expect(results[0].provider).toBe('pexels');
      } finally {
        prisma.aPI_Configurations.findMany = originalFindMany;
      }
    });

    it('should fallback to Pixabay when both are active and Pexels returns empty', async () => {
      const pexelsMock: ExternalSearchProvider = {
        search: async () => [],
      };

      const pixabayMock: ExternalSearchProvider = {
        search: async () => [
          {
            id: 'ext_pix_1',
            source: 'external',
            provider: 'pixabay',
            title: 'Pixabay Clip',
            thumbnail_url: 'http://img.com/pix',
            preview_url: 'http://video.com/pix',
            duration: 15,
            width: 1920,
            height: 1080,
            tags: ['sky'],
          },
        ],
      };

      const originalFindMany = prisma.aPI_Configurations.findMany;
      (prisma.aPI_Configurations as any).findMany = async () => [
        { config_id: 1, provider_name: 'pexels', api_key: 'enc', is_active: true },
        { config_id: 2, provider_name: 'pixabay', api_key: 'enc', is_active: true },
      ];

      try {
        const provider = new DynamicExternalSearchProvider(pexelsMock, pixabayMock);
        const results = await provider.search('sky');
        expect(results.length).toBe(1);
        expect(results[0].provider).toBe('pixabay');
      } finally {
        prisma.aPI_Configurations.findMany = originalFindMany;
      }
    });

    it('should fallback to Pixabay when both are active and Pexels throws an error', async () => {
      const pexelsMock: ExternalSearchProvider = {
        search: async () => {
          throw new Error('Pexels API Error');
        },
      };

      const pixabayMock: ExternalSearchProvider = {
        search: async () => [
          {
            id: 'ext_pix_1',
            source: 'external',
            provider: 'pixabay',
            title: 'Pixabay Clip',
            thumbnail_url: 'http://img.com/pix',
            preview_url: 'http://video.com/pix',
            duration: 15,
            width: 1920,
            height: 1080,
            tags: ['sky'],
          },
        ],
      };

      const originalFindMany = prisma.aPI_Configurations.findMany;
      (prisma.aPI_Configurations as any).findMany = async () => [
        { config_id: 1, provider_name: 'pexels', api_key: 'enc', is_active: true },
        { config_id: 2, provider_name: 'pixabay', api_key: 'enc', is_active: true },
      ];

      try {
        const provider = new DynamicExternalSearchProvider(pexelsMock, pixabayMock);
        const results = await provider.search('sky');
        expect(results.length).toBe(1);
        expect(results[0].provider).toBe('pixabay');
      } finally {
        prisma.aPI_Configurations.findMany = originalFindMany;
      }
    });

    it('should use Pixabay directly if only Pixabay is active', async () => {
      const pexelsMock: ExternalSearchProvider = {
        search: async () => [],
      };

      const pixabayMock: ExternalSearchProvider = {
        search: async () => [
          {
            id: 'ext_pix_1',
            source: 'external',
            provider: 'pixabay',
            title: 'Pixabay Clip',
            thumbnail_url: 'http://img.com/pix',
            preview_url: 'http://video.com/pix',
            duration: 15,
            width: 1920,
            height: 1080,
            tags: ['sky'],
          },
        ],
      };

      const originalFindMany = prisma.aPI_Configurations.findMany;
      (prisma.aPI_Configurations as any).findMany = async () => [
        { config_id: 2, provider_name: 'pixabay', api_key: 'enc', is_active: true },
      ];

      try {
        const provider = new DynamicExternalSearchProvider(pexelsMock, pixabayMock);
        const results = await provider.search('sky');
        expect(results.length).toBe(1);
        expect(results[0].provider).toBe('pixabay');
      } finally {
        prisma.aPI_Configurations.findMany = originalFindMany;
      }
    });

    it('should throw EXTERNAL_PROVIDER_NOT_CONFIGURED if no providers are active', async () => {
      const originalFindMany = prisma.aPI_Configurations.findMany;
      (prisma.aPI_Configurations as any).findMany = async () => [];

      try {
        const provider = new DynamicExternalSearchProvider();
        await expect(provider.search('sky')).rejects.toThrow('EXTERNAL_PROVIDER_NOT_CONFIGURED');
      } finally {
        prisma.aPI_Configurations.findMany = originalFindMany;
      }
    });
  });

  describe('createAssetSchema Unit Tests', () => {
    it('validates required title and optional description/tags', async () => {
      const { createAssetSchema } = await import('../src/schemas/index.js');
      
      const valid = createAssetSchema.safeParse({
        title: 'Nature B-Roll',
        description: 'Forest and river',
        tags: 'nature, forest',
      });
      expect(valid.success).toBe(true);

      const minimal = createAssetSchema.safeParse({
        title: 'Only Title',
      });
      expect(minimal.success).toBe(true);
      if (minimal.success) {
        expect(minimal.data.description).toBe('');
        expect(minimal.data.tags).toBe('');
      }

      const missingTitle = createAssetSchema.safeParse({});
      expect(missingTitle.success).toBe(false);
      if (!missingTitle.success) {
        expect(missingTitle.error.errors[0].path).toContain('title');
      }

      const emptyTitle = createAssetSchema.safeParse({ title: '' });
      expect(emptyTitle.success).toBe(false);
    });
  });
});
