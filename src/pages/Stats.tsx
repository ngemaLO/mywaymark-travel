import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useStatsData } from '@/hooks/useStatsData';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { Globe, MapPin, Building2, CalendarDays, Flame, Trophy, Clock, Navigation } from 'lucide-react';
import { TravelContextConnected } from '@/components/TravelContext';
import { PlacesGrid } from '@/components/PlacesGrid';

function StatCard({ value, label, icon: Icon }: { value: string | number; label: string; icon: React.ElementType }) {
  return (
    <div className="stat-card">
      <Icon className="stat-card-icon" />
      <span className="stat-card-value">{value}</span>
      <span className="stat-card-label">{label}</span>
    </div>
  );
}

function RecordItem({ icon: Icon, label, value, sub }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="record-item">
      <div className="record-icon">
        <Icon className="w-4 h-4" />
      </div>
      <div className="record-text">
        <span className="record-label">{label}</span>
        <span className="record-value">{value}</span>
        {sub && <span className="record-sub">{sub}</span>}
      </div>
    </div>
  );
}

export default function Stats() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading } = useStatsData();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const maxYearCount = stats ? Math.max(...stats.byYear.map(y => y.count), 1) : 1;

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <Header />

      <main className="stats-page">

        {/* Page heading */}
        <div className="stats-heading">
          <h1 className="journal-title">Your world, by the numbers</h1>
          <p className="journal-body" style={{ marginBottom: 0 }}>
            Everything you've logged, counted.
          </p>
        </div>

        <TravelContextConnected />

        {isLoading && (
          <div className="stats-loading">
            <div className="stats-loading-dot" />
            <div className="stats-loading-dot" />
            <div className="stats-loading-dot" />
          </div>
        )}

        {!isLoading && !stats && (
          <div className="journal-entry journal-entry--welcome">
            <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <p className="journal-body text-center">No visits logged yet. Start exploring.</p>
          </div>
        )}

        {stats && (
          <>
            {/* ── Hero numbers ── */}
            <div className="stat-grid">
              <StatCard value={stats.countriesVisited} label="countries" icon={Globe} />
              <StatCard value={stats.citiesVisited} label="cities" icon={Building2} />
              <StatCard value={stats.daysAbroad > 0 ? `${stats.daysAbroad}+` : '—'} label="days abroad" icon={CalendarDays} />
              <StatCard value={stats.yearsExploring} label={stats.yearsExploring === 1 ? 'year exploring' : 'years exploring'} icon={Flame} />
            </div>

            {/* ── Continents ── */}
            <div className="journal-section">
              <h2 className="journal-section-title">Continents</h2>
              <div className="continent-list">
                {stats.continentStats.map(c => (
                  <div key={c.name} className="continent-row">
                    <div className="continent-meta">
                      <span className="continent-name">{c.name}</span>
                      <span className="continent-count">{c.visited} / {c.total}</span>
                    </div>
                    <div className="continent-track">
                      <div
                        className="continent-fill"
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Personal records ── */}
            <div className="journal-section">
              <h2 className="journal-section-title">Personal records</h2>
              <div className="records-list">
                {stats.firstCountry && (
                  <RecordItem
                    icon={Navigation}
                    label="First trip"
                    value={stats.firstCountry.name}
                    sub={String(stats.firstCountry.year)}
                  />
                )}
                {stats.mostVisited && (
                  <RecordItem
                    icon={Trophy}
                    label="Most visited"
                    value={stats.mostVisited.name}
                    sub={`${stats.mostVisited.count} times`}
                  />
                )}
                {stats.longestStay && (
                  <RecordItem
                    icon={Clock}
                    label="Longest stay"
                    value={stats.longestStay.name}
                    sub={`${stats.longestStay.days} days`}
                  />
                )}
                {stats.latestTrip && (
                  <RecordItem
                    icon={MapPin}
                    label="Latest trip"
                    value={stats.latestTrip.name}
                    sub={String(stats.latestTrip.year)}
                  />
                )}
              </div>
            </div>

            {/* ── Year by year ── */}
            {stats.byYear.length > 1 && (
              <div className="journal-section">
                <h2 className="journal-section-title">Activity by year</h2>
                <div className="year-chart">
                  {stats.byYear.map(({ year, count }) => (
                    <div key={year} className="year-bar-col">
                      <span className="year-bar-count">{count}</span>
                      <div
                        className="year-bar"
                        style={{ height: `${Math.round((count / maxYearCount) * 100)}%` }}
                        title={`${count} visit${count !== 1 ? 's' : ''} in ${year}`}
                      />
                      <span className="year-bar-label">{year}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Countries ── */}
            <div className="journal-section">
              <h2 className="journal-section-title">Your countries</h2>
              <PlacesGrid />
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
