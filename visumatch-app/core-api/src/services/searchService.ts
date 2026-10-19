import { aiClient } from '../integrations/aiClient.js';
import { ExternalSearchProvider, BRollSearchResult } from '../integrations/pexelsClient.js';
import { dynamicExternalSearchProvider } from '../integrations/externalSearchProvider.js';
import { internalSearchRepository, InternalSearchRepository } from '../repositories/internalSearchRepository.js';

export interface SearchOptions {
  query: string;
  source: 'all' | 'external' | 'internal';
  page: number;
  perPage: number;
  orientation: string;
  language?: string;
  llmApiKey?: string;
}

export interface SearchResponse {
  query: string;
  page: number;
  results: BRollSearchResult[];
  warnings: string[];
}

export class SearchService {
  constructor(
    private externalProvider: ExternalSearchProvider = dynamicExternalSearchProvider,
    private internalRepo: InternalSearchRepository = internalSearchRepository
  ) {}

  async searchBroll(options: SearchOptions): Promise<SearchResponse> {
    const { query, source, page, perPage, orientation, language = 'id', llmApiKey } = options;
    const warnings: string[] = [];
    let externalResults: BRollSearchResult[] = [];
    let internalResults: BRollSearchResult[] = [];

    const fetchExternal = async (): Promise<BRollSearchResult[]> => {
      // Step 1: Normalize query via ai-service (3s timeout handled gracefully inside aiClient)
      const normalized = await aiClient.normalizeQuery(query, language, llmApiKey);
      const queryEn = normalized.search_query_en || query;
      // Step 2: Search active external provider (Pexels / Pixabay)
      return await this.externalProvider.search(queryEn, page, perPage, orientation);
    };

    const fetchInternal = async (): Promise<BRollSearchResult[]> => {
      return await this.internalRepo.search(query, page, perPage);
    };

    if (source === 'external') {
      try {
        externalResults = await fetchExternal();
      } catch (err: any) {
        if (err.message === 'EXTERNAL_PROVIDER_NOT_CONFIGURED') {
          warnings.push('EXTERNAL_PROVIDER_NOT_CONFIGURED');
        } else {
          warnings.push(`EXTERNAL_SEARCH_FAILED: ${err.message}`);
        }
      }
      return { query, page, results: externalResults, warnings };
    }

    if (source === 'internal') {
      try {
        internalResults = await fetchInternal();
      } catch (err: any) {
        warnings.push(`INTERNAL_SEARCH_FAILED: ${err.message}`);
      }
      return { query, page, results: internalResults, warnings };
    }

    // source === 'all': parallel execution with Promise.allSettled
    const [extOutcome, intOutcome] = await Promise.allSettled([fetchExternal(), fetchInternal()]);

    if (extOutcome.status === 'fulfilled') {
      externalResults = extOutcome.value;
    } else {
      const reason = extOutcome.reason;
      if (reason?.message === 'EXTERNAL_PROVIDER_NOT_CONFIGURED') {
        warnings.push('EXTERNAL_PROVIDER_NOT_CONFIGURED');
      } else {
        warnings.push(`EXTERNAL_SEARCH_FAILED: ${reason?.message || 'Unknown error'}`);
      }
    }

    if (intOutcome.status === 'fulfilled') {
      internalResults = intOutcome.value;
    } else {
      warnings.push(`INTERNAL_SEARCH_FAILED: ${intOutcome.reason?.message || 'Unknown error'}`);
    }

    // Interleave / combine results
    const combined: BRollSearchResult[] = [];
    const maxLen = Math.max(externalResults.length, internalResults.length);
    for (let i = 0; i < maxLen; i++) {
      if (externalResults[i]) combined.push(externalResults[i]);
      if (internalResults[i]) combined.push(internalResults[i]);
    }

    return {
      query,
      page,
      results: combined.slice(0, perPage),
      warnings,
    };
  }
}

export const searchService = new SearchService();
