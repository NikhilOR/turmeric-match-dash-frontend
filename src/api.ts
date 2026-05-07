import {
  DashboardSummary,
  MatchDetailResponse,
  MatchEntityType,
  MatchField,
  MatchFilters,
  MatchListResponse,
} from './types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === '') {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchSummary(filters: Pick<MatchFilters, 'entityType' | 'minScore' | 'matchedField'>) {
  const response = await fetch(
    buildUrl('/api/dashboard/summary', {
      source_entity_type: filters.entityType,
      min_score: filters.minScore || undefined,
      matched_field: filters.matchedField || undefined,
    }),
  );
  return parseJson<DashboardSummary>(response);
}

export async function fetchMatches(filters: MatchFilters, page = 1, limit = 20) {
  const response = await fetch(
    buildUrl('/api/matches', {
      source_entity_type: filters.entityType,
      min_score: filters.minScore || undefined,
      matched_field: filters.matchedField || undefined,
      page,
      limit,
      status: 'PENDING',
    }),
  );

  const payload = await parseJson<MatchListResponse>(response);
  if (!filters.search.trim()) {
    return payload;
  }

  const search = filters.search.trim().toLowerCase();
  const filteredData = payload.data.filter((match) =>
    `${match.sourceName} ${match.masterName}`.toLowerCase().includes(search),
  );

  return {
    ...payload,
    data: filteredData,
    meta: {
      ...payload.meta,
      total: filteredData.length,
      totalPages: 1,
    },
  };
}

export async function fetchMatchDetail(id: string) {
  const response = await fetch(buildUrl(`/api/matches/${id}`));
  return parseJson<MatchDetailResponse>(response);
}

export async function approveMatch(id: string) {
  const response = await fetch(buildUrl(`/api/matches/${id}/approve`), {
    method: 'POST',
  });

  return parseJson<MatchDetailResponse>(response);
}

export function getEntityAccent(entityType: MatchEntityType) {
  switch (entityType) {
    case 'SUPPLIER':
      return 'var(--accent-gold)';
    case 'BUYER':
      return 'var(--accent-mint)';
    case 'EXPORTER':
      return 'var(--accent-coral)';
  }
}

export function getFieldLabel(field: MatchField) {
  switch (field) {
    case 'price':
      return 'Price';
    case 'quality':
      return 'Quality';
    case 'quantity':
      return 'Quantity';
    case 'location':
      return 'Location';
    case 'others':
      return 'Others';
  }
}
