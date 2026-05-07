import { useEffect, useRef, useState } from 'react';
import { fetchMatches, fetchSummary, getEntityAccent, getFieldLabel } from './api';
import { DashboardSummary, MatchEntityType, MatchField, MatchFilters, MatchRecord } from './types';

const DEFAULT_SECTION: MatchEntityType = 'SUPPLIER';

const SECTION_OPTIONS: Array<{
  entityType: MatchEntityType;
  label: string;
  description: string;
  shortLabel: string;
}> = [
  {
    entityType: 'EXPORTER',
    label: 'Exporter',
    description: 'Export trade opportunities',
    shortLabel: 'EX',
  },
  {
    entityType: 'SUPPLIER',
    label: 'Supplier',
    description: 'Supply-side matching queue',
    shortLabel: 'SU',
  },
  {
    entityType: 'BUYER',
    label: 'Buyer',
    description: 'Domestic buyer opportunities',
    shortLabel: 'BY',
  },
];

const EMPTY_FILTERS: MatchFilters = {
  entityType: DEFAULT_SECTION,
  minScore: 60,
  search: '',
  matchedField: '',
};

const MATCH_FIELD_OPTIONS: MatchField[] = ['price', 'quality', 'quantity', 'location', 'others'];

function getEntityLabel(entityType: MatchEntityType) {
  switch (entityType) {
    case 'SUPPLIER':
      return 'Supplier';
    case 'BUYER':
      return 'Buyer';
    case 'EXPORTER':
      return 'Exporter';
  }
}

function App() {
  const [activeSection, setActiveSection] = useState<MatchEntityType>(DEFAULT_SECTION);
  const [filters, setFilters] = useState<MatchFilters>(EMPTY_FILTERS);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      entityType: activeSection,
    }));
  }, [activeSection]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      const isInitialLoad = !hasLoadedOnce.current;

      try {
        setError(null);
        if (!cancelled) {
          if (isInitialLoad) {
            setIsLoading(true);
          } else {
            setIsRefreshing(true);
          }
        }

        const [summaryPayload, matchesPayload] = await Promise.all([
          fetchSummary(filters),
          fetchMatches(filters),
        ]);

        if (cancelled) {
          return;
        }

        setSummary(summaryPayload);
        setMatches(matchesPayload.data);
        hasLoadedOnce.current = true;
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard data');
        }
      } finally {
        if (!cancelled) {
          if (isInitialLoad) {
            setIsLoading(false);
          } else {
            setIsRefreshing(false);
          }
        }
      }
    }

    void loadDashboard();
    const timer = window.setInterval(() => {
      void loadDashboard();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [filters]);

  const activeSectionMeta =
    SECTION_OPTIONS.find((section) => section.entityType === activeSection) ?? SECTION_OPTIONS[0];
  const activeSummary = summary?.byType.find((item) => item.entityType === activeSection) ?? null;
  const topMatch =
    matches.reduce<MatchRecord | null>((bestMatch, currentMatch) => {
      if (!bestMatch || currentMatch.matchScore > bestMatch.matchScore) {
        return currentMatch;
      }

      return bestMatch;
    }, null) ?? null;

  return (
    <div className="dashboard-shell">
      <div className="dashboard-layout">
        <aside className="sidebar-panel">
          <div className="brand-block">
            <div className="brand-mark">T</div>
            <div>
              <strong>Turmeric Match</strong>
              <span>Admin workspace</span>
            </div>
          </div>

          <div className="sidebar-group">
            {SECTION_OPTIONS.map((section) => {
              const isActive = section.entityType === activeSection;

              return (
                <button
                  key={section.entityType}
                  type="button"
                  className={`sidebar-link${isActive ? ' active' : ''}`}
                  onClick={() => setActiveSection(section.entityType)}
                >
                  <span className="sidebar-icon">{section.shortLabel}</span>
                  <span className="sidebar-link-copy">
                    <strong>{section.label}</strong>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="sidebar-footer">
            <div className="profile-badge">{activeSectionMeta.shortLabel}</div>
            <div>
              <strong>{activeSectionMeta.label}</strong>
              <span>Active queue</span>
            </div>
          </div>
        </aside>

        <main className="dashboard-main">
          <header className="topbar">
            <div>
              <p className="topbar-kicker">Admin Panel</p>
              <h1>{activeSectionMeta.label} Dashboard</h1>
            </div>
            <div className="topbar-actions">
              <span className="refresh-badge">{isRefreshing ? 'Refreshing' : 'Live'}</span>
            </div>
          </header>

          <section className="summary-grid">
            <SummaryCard
              label={`${activeSectionMeta.label} Queue`}
              value={activeSummary?.total ?? 0}
              tone="gold"
              hint={
                filters.matchedField
                  ? `${getFieldLabel(filters.matchedField)}-matched ${activeSectionMeta.label.toLowerCase()} rows`
                  : `Total pending ${activeSectionMeta.label.toLowerCase()} matches`
              }
            />
            <SummaryCard
              label="Average Score"
              value={`${activeSummary?.avgScore?.toFixed(1) ?? '0.0'}%`}
              tone="mint"
              hint={
                filters.matchedField
                  ? `Average score for ${getFieldLabel(filters.matchedField).toLowerCase()}-matched rows`
                  : `Average confidence for ${activeSectionMeta.label.toLowerCase()} matches`
              }
            />
            <SummaryCard
              label="Visible Rows"
              value={matches.length}
              tone="coral"
              hint="Rows currently visible in this section"
            />
            <SummaryCard
              label="Top Match"
              value={topMatch ? topMatch.sourceName : 'None'}
              tone="steel"
              hint={topMatch ? `${topMatch.matchScore.toFixed(1)}% best score` : 'No live match yet'}
            />
          </section>

          <section className="control-panel">
            <div className="parameter-filter-row">
              <span className="parameter-filter-label">Match parameter</span>
              <div className="parameter-filter-group">
                <button
                  type="button"
                  className={`parameter-chip${filters.matchedField === '' ? ' active' : ''}`}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      matchedField: '',
                    }))
                  }
                >
                  All
                </button>
                {MATCH_FIELD_OPTIONS.map((field) => (
                  <button
                    key={field}
                    type="button"
                    className={`parameter-chip${filters.matchedField === field ? ' active' : ''}`}
                    onClick={() =>
                      setFilters((current) => ({
                        ...current,
                        matchedField: field,
                      }))
                    }
                  >
                    {getFieldLabel(field)}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-strip">
              <label className="control-field">
                <span>Min score</span>
                <input
                  type="range"
                  min={40}
                  max={100}
                  step={1}
                  value={filters.minScore}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      minScore: Number(event.target.value),
                    }))
                  }
                />
                <strong>{filters.minScore}%</strong>
              </label>

              <label className="control-field control-search">
                <span>Search names</span>
                <input
                  type="search"
                  placeholder={`Search ${activeSectionMeta.label.toLowerCase()} source or master`}
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      search: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            {error ? <div className="error-banner">{error}</div> : null}
          </section>

          <section className="content-grid">
            <div className="match-table-panel">
              <div className="panel-head">
                <div>
                  <h3>{activeSectionMeta.label} source matches</h3>
                </div>
                <span className="match-count">
                  {isRefreshing ? 'Refreshing...' : `${matches.length} visible`}
                </span>
              </div>

              <div className="match-table">
                <div className="table-row table-header">
                  <span>Source</span>
                  <span>Master</span>
                  <span>Route</span>
                  <span>Score</span>
                  <span>Matched</span>
                </div>

                {isLoading ? (
                  <div className="loading-state">Loading live queue...</div>
                ) : matches.length === 0 ? (
                  <div className="empty-state">
                    <strong>No matched rows found.</strong>
                    <p>
                      No {activeSectionMeta.label.toLowerCase()} rows are available
                      {filters.matchedField
                        ? ` for ${getFieldLabel(filters.matchedField).toLowerCase()} matching`
                        : ''}
                      {` above the current ${filters.minScore}%`} match score. Lower the min score or wait for the next sync.
                    </p>
                  </div>
                ) : (
                  matches.map((match) => (
                    <div key={match.id} className="table-row table-item">
                      <div className="table-cell">
                        <span className="table-cell-label">Source</span>
                        <strong>{match.sourceName}</strong>
                      </div>
                      <div className="table-cell">
                        <span className="table-cell-label">Master</span>
                        <span>{match.masterName}</span>
                      </div>
                      <div className="table-cell">
                        <span className="table-cell-label">Route</span>
                        <RouteBadge
                          sourceEntityType={match.sourceEntityType}
                          entityType={match.entityType}
                        />
                      </div>
                      <div className="table-cell">
                        <span className="table-cell-label">Score</span>
                        <span className="score-pill">{match.matchScore.toFixed(1)}%</span>
                      </div>
                      <div className="table-cell">
                        <span className="table-cell-label">Matched</span>
                        <span className="field-chip-group">
                        {match.matchedFields.slice(0, 3).map((field) => (
                          <small key={field} className="field-chip">
                            {field}
                          </small>
                        ))}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint: string;
  tone: 'gold' | 'mint' | 'coral' | 'steel';
}) {
  return (
    <article className={`summary-card summary-${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{hint}</span>
    </article>
  );
}

function RouteBadge({
  sourceEntityType,
  entityType,
}: {
  sourceEntityType: MatchRecord['sourceEntityType'];
  entityType: MatchRecord['entityType'];
}) {
  return (
    <span
      className="entity-badge"
      style={{ backgroundColor: getEntityAccent(entityType) }}
      title={`${getEntityLabel(sourceEntityType)} to ${getEntityLabel(entityType)}`}
    >
      {getEntityLabel(sourceEntityType)} {'->'} {getEntityLabel(entityType)}
    </span>
  );
}

export default App;
