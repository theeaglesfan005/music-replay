"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Music,
  Disc3,
  Users,
  Clock,
  Heart,
  BarChart3,
  RefreshCw,
  Loader2,
  Play,
  Library,
  ListMusic,
  Mic2,
} from "lucide-react";
import {
  Stats,
  StatsFilter,
  TimeDisplayMode,
  fetchStats,
  fetchYears,
  triggerExport,
  addExclusion,
  formatListeningTime,
  formatNumber,
  STATIC_MODE,
  songArtworkUrl,
  albumArtworkUrl,
  artistArtworkUrl,
} from "./lib/api";
import StatCard from "./components/StatCard";
import TopList from "./components/TopList";
import GenreChart from "./components/GenreChart";
import DecadeChart from "./components/DecadeChart";
import FilterBar from "./components/FilterBar";
import ExclusionManager from "./components/ExclusionManager";
import RatingCard from "./components/RatingCard";

type Tab = "overview" | "songs" | "artists" | "albums" | "genres";

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showAllSongs, setShowAllSongs] = useState(false);
  const [showAllArtists, setShowAllArtists] = useState(false);
  const [showAllAlbums, setShowAllAlbums] = useState(false);
  const [filter, setFilter] = useState<StatsFilter>({});
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [timeMode, setTimeMode] = useState<TimeDisplayMode>("minutes");
  const [cardTimeUnit, setCardTimeUnit] = useState<"minutes" | "hours">("minutes");
  const [songSort, setSongSort] = useState<"plays" | "time">("plays");
  const [artistSort, setArtistSort] = useState<"plays" | "time">("time");
  const [albumSort, setAlbumSort] = useState<"plays" | "time">("plays");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const loadStats = useCallback(async (currentFilter?: StatsFilter) => {
    try {
      setRefreshing(true);
      setError(null);
      const data = await fetchStats(currentFilter || filter);
      setStats(data);
    } catch {
      setError(
        "Could not load stats. Make sure the backend is running on port 5001."
      );
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [filter]);

  const loadYears = useCallback(async () => {
    try {
      const data = await fetchYears();
      setAvailableYears(data.years);
    } catch {}
  }, []);

  useEffect(() => {
    loadStats();
    loadYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (newFilter: StatsFilter) => {
    setFilter(newFilter);
    loadStats(newFilter);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);
      await triggerExport();
      await loadYears();
      await loadStats();
    } catch {
      setError("Export failed. Make sure Music app is running.");
    } finally {
      setExporting(false);
    }
  };

  const handleExcludeAlbum = async (albumName: string, artistName: string) => {
    try {
      await addExclusion("album", albumName, artistName);
      await loadStats();
    } catch {}
  };

  const handleExclusionsChange = () => {
    loadStats();
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <BarChart3 size={18} /> },
    { id: "songs", label: "Top Songs", icon: <Music size={18} /> },
    { id: "artists", label: "Top Artists", icon: <Mic2 size={18} /> },
    { id: "albums", label: "Top Albums", icon: <Disc3 size={18} /> },
    { id: "genres", label: "Genres", icon: <ListMusic size={18} /> },
  ];

  if (!mounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-card-border border-t-accent" />
          <p className="text-lg text-muted">Loading your music library...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md text-center">
          <Music size={64} className="mx-auto mb-4 text-accent" />
          <h1 className="mb-2 text-2xl font-bold">Music Replay</h1>
          <p className="mb-6 text-muted">{error}</p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="gradient-bg rounded-full px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {exporting ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Exporting...
              </span>
            ) : (
              "Export Library & Load"
            )}
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const listeningDisplay = formatListeningTime(stats.overview.totalListeningTimeSeconds, timeMode);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-card-border bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-2">
          <div className="flex items-center gap-3">
            <div className="gradient-bg flex h-8 w-8 items-center justify-center rounded-lg">
              <Play size={16} className="text-white" fill="white" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">Music Replay</h1>
              <p className="text-[10px] text-muted">
                {stats.filterDescription && stats.isFiltered
                  ? stats.filterDescription
                  : "Your complete library"}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-3">
              {refreshing && (
                <Loader2 size={14} className="animate-spin text-accent" />
              )}
              {stats.exportDate && (
                <span className="hidden text-xs text-muted sm:block">
                  Last export:{" "}
                  {new Date(stats.exportDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              )}
              {!STATIC_MODE && (
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-1.5 rounded-full border border-card-border px-3 py-1 text-xs font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
                >
                  {exporting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  {exporting ? "Exporting..." : "Refresh"}
                </button>
              )}
            </div>
            {stats.overview.latestPlayedAt && (
              <span className="text-[10px] text-muted">
                Latest play:{" "}
                {new Date(stats.overview.latestPlayedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="sticky top-[49px] z-40 border-b border-card-border bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-6 py-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "gradient-bg text-white"
                  : "text-muted hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-[1600px] px-6 py-8">
        {/* Filter Bar + Exclusions */}
        <div className="mb-8 space-y-4">
          <FilterBar
            availableYears={availableYears}
            filter={filter}
            onFilterChange={handleFilterChange}
          />
          {!STATIC_MODE && (
            <ExclusionManager onExclusionsChange={handleExclusionsChange} />
          )}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Hero Stats */}
            <div className="gradient-bg-subtle rounded-3xl p-8 text-center">
              <p className="mb-2 text-sm font-medium uppercase tracking-widest text-muted">
                {stats.isFiltered ? `Listening Time · ${stats.filterDescription}` : "Total Listening Time"}
              </p>
              <p className="text-5xl font-bold tracking-tight sm:text-6xl">
                <span className="gradient-text">{listeningDisplay}</span>
              </p>
              <div className="mt-3 flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                  <p className="text-muted">
                    across {formatNumber(stats.overview.totalPlays)} {stats.isEstimated ? "estimated" : "total"} plays
                  </p>
                  <button
                    onClick={() => setTimeMode(timeMode === "minutes" ? "detailed" : "minutes")}
                    className="rounded-full border border-card-border px-3 py-0.5 text-xs font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground"
                  >
                    {timeMode === "minutes" ? "Show detailed" : "Show minutes"}
                  </button>
                </div>
                {stats.isFiltered && stats.isRealSnapshotData && (
                  <p className="text-xs text-emerald-400/80">
                    ✓ Play counts based on real snapshot data for this period.
                  </p>
                )}
                {stats.isFiltered && stats.isEstimated && (
                  <p className="text-xs text-amber-400/70">
                    ⚡ Play counts are estimated for this period (distributed evenly across active months).
                    {stats.snapshotCoverage?.real_data_starts
                      ? ` Real data available from ${new Date(stats.snapshotCoverage.real_data_starts).toLocaleDateString(undefined, { month: "long", year: "numeric" })} onward.`
                      : " Monthly snapshots will begin collecting on April 1 — real data available from May 2026 onward."}
                  </p>
                )}
              </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <StatCard
                label="Library Tracks"
                value={stats.overview.totalTracks}
                icon={<Library size={20} />}
              />
              <StatCard
                label="Played Tracks"
                value={stats.overview.playedTracks}
                icon={<Play size={20} />}
              />
              <StatCard
                label="Total Plays"
                value={stats.overview.totalPlays}
                icon={<Music size={20} />}
                gradient
              />
              <StatCard
                label="Unique Artists"
                value={stats.overview.uniqueArtists}
                icon={<Users size={20} />}
              />
              <StatCard
                label="Unique Albums"
                value={stats.overview.uniqueAlbums}
                icon={<Disc3 size={20} />}
              />
              <StatCard
                label="Genres"
                value={stats.overview.uniqueGenres}
                icon={<ListMusic size={20} />}
              />
              <StatCard
                label="Loved Tracks"
                value={stats.overview.lovedTracks}
                icon={<Heart size={20} />}
              />
              <div
                onClick={() => setCardTimeUnit(cardTimeUnit === "minutes" ? "hours" : "minutes")}
                className="cursor-pointer"
              >
                <StatCard
                  label={cardTimeUnit === "minutes" ? "Listening Minutes" : "Listening Hours"}
                  value={
                    cardTimeUnit === "minutes"
                      ? Math.floor(stats.overview.totalListeningTimeSeconds / 60)
                      : stats.overview.totalListeningTimeHours
                  }
                  sublabel={`Tap for ${cardTimeUnit === "minutes" ? "hours" : "minutes"}`}
                  icon={<Clock size={20} />}
                  gradient
                />
              </div>
            </div>

            {/* Ratings */}
            <RatingCard ratings={stats.overview.ratings} />

            {/* Quick Top 10s */}
            <div className="grid gap-6 lg:grid-cols-3">
              <TopList
                title="Top 10 Songs"
                sortMode={songSort}
                headerRight={
                  <div className="flex gap-1">
                    <button onClick={() => setSongSort("plays")} className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${songSort === "plays" ? "gradient-bg text-white" : "border border-card-border text-muted hover:bg-white/5"}`}>Plays</button>
                    <button onClick={() => setSongSort("time")} className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${songSort === "time" ? "gradient-bg text-white" : "border border-card-border text-muted hover:bg-white/5"}`}>Time</button>
                  </div>
                }
                items={(songSort === "plays" ? stats.topSongsByPlays : stats.topSongsByTime).slice(0, 10).map((s) => ({
                  rank: s.rank,
                  title: s.name,
                  subtitle: `${s.artist} · ${s.album}`,
                  playCount: s.playCount,
                  totalListeningTime: s.totalListeningTime,
                  loved: s.loved,
                  rating: s.rating,
                  albumName: s.album,
                  artistName: s.artist,
                  artworkUrl: songArtworkUrl(s.name, s.artist, s.album, s.albumArtist),
                }))}
                onExcludeAlbum={STATIC_MODE ? undefined : handleExcludeAlbum}
              />
              <TopList
                title="Top 10 Artists"
                sortMode={artistSort}
                headerRight={
                  <div className="flex gap-1">
                    <button onClick={() => setArtistSort("time")} className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${artistSort === "time" ? "gradient-bg text-white" : "border border-card-border text-muted hover:bg-white/5"}`}>Time</button>
                    <button onClick={() => setArtistSort("plays")} className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${artistSort === "plays" ? "gradient-bg text-white" : "border border-card-border text-muted hover:bg-white/5"}`}>Plays</button>
                  </div>
                }
                items={(artistSort === "plays" ? stats.topArtistsByPlays : stats.topArtistsByTime).slice(0, 10).map((a) => ({
                  rank: a.rank,
                  title: a.artist,
                  subtitle: `${formatNumber(a.uniqueSongs)} songs`,
                  playCount: a.playCount,
                  totalListeningTime: a.totalListeningTime,
                  artworkUrl: artistArtworkUrl(a.artist),
                }))}
                artworkShape="circle"
              />
              <TopList
                title="Top 10 Albums"
                sortMode={albumSort}
                headerRight={
                  <div className="flex gap-1">
                    <button onClick={() => setAlbumSort("plays")} className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${albumSort === "plays" ? "gradient-bg text-white" : "border border-card-border text-muted hover:bg-white/5"}`}>Plays</button>
                    <button onClick={() => setAlbumSort("time")} className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${albumSort === "time" ? "gradient-bg text-white" : "border border-card-border text-muted hover:bg-white/5"}`}>Time</button>
                  </div>
                }
                items={(albumSort === "plays" ? stats.topAlbumsByPlays : stats.topAlbumsByTime).slice(0, 10).map((a) => ({
                  rank: a.rank,
                  title: a.album,
                  subtitle: `${a.artist}${a.year ? ` · ${a.year}` : ""}`,
                  playCount: a.playCount,
                  totalListeningTime: a.totalListeningTime,
                  averageRating: a.averageRating,
                  albumName: a.album,
                  artistName: a.artist,
                  artworkUrl: albumArtworkUrl(a.album, a.artist),
                }))}
                onExcludeAlbum={STATIC_MODE ? undefined : handleExcludeAlbum}
              />
            </div>
          </div>
        )}

        {activeTab === "songs" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Sort by:</span>
              <button onClick={() => setSongSort("plays")} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${songSort === "plays" ? "gradient-bg text-white" : "border border-card-border text-muted hover:bg-white/5"}`}>Plays</button>
              <button onClick={() => setSongSort("time")} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${songSort === "time" ? "gradient-bg text-white" : "border border-card-border text-muted hover:bg-white/5"}`}>Total Time</button>
            </div>
            <TopList
              title="Top Songs"
              sortMode={songSort}
              items={(songSort === "plays" ? stats.topSongsByPlays : stats.topSongsByTime).map((s) => ({
                rank: s.rank,
                title: s.name,
                subtitle: `${s.artist} · ${s.album}`,
                playCount: s.playCount,
                totalListeningTime: s.totalListeningTime,
                loved: s.loved,
                rating: s.rating,
                extra: s.genre,
                albumName: s.album,
                artistName: s.artist,
                artworkUrl: songArtworkUrl(s.name, s.artist, s.album, s.albumArtist),
              }))}
              showAll={showAllSongs}
              onToggleShowAll={() => setShowAllSongs(!showAllSongs)}
              onExcludeAlbum={STATIC_MODE ? undefined : handleExcludeAlbum}
            />
          </div>
        )}

        {activeTab === "artists" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Sort by:</span>
              <button onClick={() => setArtistSort("time")} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${artistSort === "time" ? "gradient-bg text-white" : "border border-card-border text-muted hover:bg-white/5"}`}>Total Time</button>
              <button onClick={() => setArtistSort("plays")} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${artistSort === "plays" ? "gradient-bg text-white" : "border border-card-border text-muted hover:bg-white/5"}`}>Plays</button>
            </div>
            <TopList
              title="Top Artists"
              sortMode={artistSort}
              items={(artistSort === "plays" ? stats.topArtistsByPlays : stats.topArtistsByTime).map((a) => ({
                rank: a.rank,
                title: a.artist,
                subtitle: `${formatNumber(a.uniqueTracks)} songs`,
                playCount: a.playCount,
                totalListeningTime: a.totalListeningTime,
                artworkUrl: artistArtworkUrl(a.artist),
              }))}
              showAll={showAllArtists}
              onToggleShowAll={() => setShowAllArtists(!showAllArtists)}
              artworkShape="circle"
            />
          </div>
        )}

        {activeTab === "albums" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Sort by:</span>
              <button onClick={() => setAlbumSort("plays")} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${albumSort === "plays" ? "gradient-bg text-white" : "border border-card-border text-muted hover:bg-white/5"}`}>Plays</button>
              <button onClick={() => setAlbumSort("time")} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${albumSort === "time" ? "gradient-bg text-white" : "border border-card-border text-muted hover:bg-white/5"}`}>Total Time</button>
            </div>
            <TopList
              title="Top Albums"
              sortMode={albumSort}
              items={(albumSort === "plays" ? stats.topAlbumsByPlays : stats.topAlbumsByTime).map((a) => ({
                rank: a.rank,
                title: a.album,
                subtitle: `${a.artist}${a.year ? ` · ${a.year}` : ""}`,
                playCount: a.playCount,
                totalListeningTime: a.totalListeningTime,
                averageRating: a.averageRating,
                albumName: a.album,
                artistName: a.artist,
                artworkUrl: albumArtworkUrl(a.album, a.artist),
              }))}
              showAll={showAllAlbums}
              onToggleShowAll={() => setShowAllAlbums(!showAllAlbums)}
              onExcludeAlbum={STATIC_MODE ? undefined : handleExcludeAlbum}
            />
          </div>
        )}

        {activeTab === "genres" && (
          <div className="space-y-6">
            <GenreChart genres={stats.topGenres} />
            <DecadeChart decades={stats.decades} />
            <TopList
              title="All Genres"
              items={stats.topGenres.map((g) => ({
                rank: g.rank,
                title: g.genre,
                subtitle: `${formatNumber(g.trackCount)} tracks`,
                playCount: g.playCount,
                totalListeningTime: g.totalListeningTime,
              }))}
              showAll
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-card-border py-6 text-center text-xs text-muted">
        <p>
          Music Replay · All {formatNumber(stats.overview.totalTracks)} tracks
          in your library, including imported &amp; uploaded music
        </p>
      </footer>
    </div>
  );
}
