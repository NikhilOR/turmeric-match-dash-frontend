export type MatchStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type MatchEntityType = 'SUPPLIER' | 'BUYER' | 'EXPORTER';
export type MatchField = 'price' | 'quality' | 'quantity' | 'location' | 'others';

export interface MatchRecord {
  id: string;
  entityType: MatchEntityType;
  sourceEntityType: MatchEntityType;
  sourceRecordId: string;
  masterRecordId: string;
  sourceName: string;
  masterName: string;
  status: MatchStatus;
  approvedAt: string | null;
  rejectedAt: string | null;
  matchScore: number;
  matchedFields: string[];
  unmatchedFields: string[];
  scoreBreakdown: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface MatchListResponse {
  data: MatchRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface MatchDetailResponse extends MatchRecord {
  sourceRecord: Record<string, unknown> | null;
  masterRecord: Record<string, unknown> | null;
  sheetSync?: {
    updated: boolean;
    hidden: boolean;
  };
}

export interface DashboardSummary {
  totalMatches: number;
  avgScore: number;
  topMatches: MatchRecord[];
  byType: Array<{
    entityType: MatchEntityType;
    total: number;
    avgScore: number;
  }>;
}

export interface MatchFilters {
  entityType: MatchEntityType;
  routeEntityType: '' | 'BUYER' | 'EXPORTER';
  minScore: number;
  search: string;
  matchedField: '' | MatchField;
}
