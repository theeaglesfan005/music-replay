/**
 * Client-side stats computation engine.
 * Port of the Python backend's compute_stats, apply_exclusions,
 * estimate_period_plays, etc. for use in static mode.
 */

import type { Stats, StatsFilter, AlbumExclusion } from "./api";

// Raw track from the library export JSON
export interface RawTrack {
  name: string;
  artist: string;
  albumArtist?: string;
  album: string;
  playCount: number;
  duration: number;
  genre: string;
  year: number;
  dateAdded?: string;
  lastPlayed?: string;
  rating: number;
  loved: boolean;
}

interface Snapshot {
  timestamp: string;
  type: "base" | "delta";
  counts: Record<string, number>;
}

interface SnapshotData {
  snapshots: Snapshot[];
}

interface ExclusionsData {
  albums: (AlbumExclusion | string)[];
  artists: string[];
  tracks: string[];
}

interface LibraryExport {
  tracks: RawTrack[];
  count: number;
  exportDate: string;
}

// Cached static data (loaded once, reused across filter changes)
let cachedLibrary: LibraryExport | null = null;
let cachedSnapshots: SnapshotData | null = null;
let cachedExclusions: ExclusionsData | null = null;
let cachedDeletedTracks: RawTrack[] | null = null;

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

async function loadStaticJson<T>(filename: string): Promise<T> {
  const res = await fetch(`${BASE_PATH}/data/${filename}`);
  if (!res.ok) throw new Error(`Failed to load ${filename}`);
  return res.json();
}

async function getLibrary(): Promise<LibraryExport> {
  if (!cachedLibrary) {
    cachedLibrary = await loadStaticJson<LibraryExport>("library.json");
  }
  return cachedLibrary;
}

async function getSnapshots(): Promise<SnapshotData> {
  if (!cachedSnapshots) {
    try {
      cachedSnapshots = await loadStaticJson<SnapshotData>("snapshots.json");
    } catch {
      cachedSnapshots = { snapshots: [] };
    }
  }
  return cachedSnapshots;
}

async function getExclusions(): Promise<ExclusionsData> {
  if (!cachedExclusions) {
    try {
      cachedExclusions = await loadStaticJson<ExclusionsData>("exclusions.json");
    } catch {
      cachedExclusions = { albums: [], artists: [], tracks: [] };
    }
  }
  return cachedExclusions;
}

async function getDeletedTracks(): Promise<RawTrack[]> {
  if (!cachedDeletedTracks) {
    try {
      cachedDeletedTracks = await loadStaticJson<RawTrack[]>("deleted_tracks.json");
    } catch {
      cachedDeletedTracks = [];
    }
  }
  return cachedDeletedTracks;
}

function makeTrackKey(t: RawTrack): string {
  return `${(t.name || "").trim()} ||| ${(t.artist || "").trim()} ||| ${(t.album || "").trim()}`;
}

function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr.replace("Z", "+00:00"));
  } catch {
    return null;
  }
}

function applyExclusions(tracks: RawTrack[], excl: ExclusionsData): RawTrack[] {
  const rawAlbums = excl.albums || [];
  const excludedAlbums: Array<[string, string | null]> = [];
  for (const entry of rawAlbums) {
    if (typeof entry === "object" && entry !== null) {
      excludedAlbums.push([(entry.album || "").toLowerCase(), (entry.artist || "").toLowerCase()]);
    } else {
      excludedAlbums.push([(entry as string).toLowerCase(), null]);
    }
  }
  const excludedArtists = new Set((excl.artists || []).map((a: string) => a.toLowerCase()));
  const excludedTracks = new Set((excl.tracks || []).map((t: string) => t.toLowerCase()));

  if (excludedAlbums.length === 0 && excludedArtists.size === 0 && excludedTracks.size === 0) {
    return tracks;
  }

  return tracks.filter((t) => {
    const album = (t.album || "").toLowerCase();
    const artist = (t.artist || "").toLowerCase();
    const albumArtist = (t.albumArtist || artist).toLowerCase();
    const name = (t.name || "").toLowerCase();
    const trackKey = `${name} ||| ${artist}`;

    for (const [excAlbum, excArtist] of excludedAlbums) {
      if (album === excAlbum) {
        if (excArtist === null || excArtist === artist || excArtist === albumArtist) {
          return false;
        }
      }
    }
    if (excludedArtists.has(artist)) return false;
    if (excludedTracks.has(trackKey)) return false;
    return true;
  });
}

function reconstructSnapshot(snapData: SnapshotData, index: number): Record<string, number> {
  const snapshots = snapData.snapshots || [];
  if (!snapshots.length || index < 0 || index >= snapshots.length) return {};
  const full: Record<string, number> = { ...snapshots[0].counts };
  for (let i = 1; i <= index; i++) {
    for (const [key, val] of Object.entries(snapshots[i].counts)) {
      full[key] = val;
    }
  }
  return full;
}

function buildSeedEstimates(tracks: RawTrack[]): Map<string, Map<string, number>> {
  const HALF_LIFE_MONTHS = 6;
  const DECAY = Math.log(2) / HALF_LIFE_MONTHS;

  const estimates = new Map<string, Map<string, number>>();
  for (const t of tracks) {
    const pc = t.playCount || 0;
    if (pc <= 0) continue;
    const key = makeTrackKey(t);
    const da = parseDate(t.dateAdded);
    const lp = parseDate(t.lastPlayed);
    if (!da || !lp) continue;

    const months: string[] = [];
    let cy = da.getFullYear(), cm = da.getMonth();
    const ey = lp.getFullYear(), em = lp.getMonth();
    while (cy < ey || (cy === ey && cm <= em)) {
      months.push(`${cy}-${cm}`);
      cm++;
      if (cm > 11) { cm = 0; cy++; }
    }
    if (months.length === 0) months.push(`${ey}-${em}`);

    // Exponential decay weights — last month gets highest weight
    const n = months.length;
    const weights = months.map((_, i) => Math.exp(-DECAY * (n - 1 - i)));
    const totalWeight = weights.reduce((s, w) => s + w, 0);

    const trackEst = new Map<string, number>();
    for (let i = 0; i < months.length; i++) {
      trackEst.set(months[i], pc * weights[i] / totalWeight);
    }
    estimates.set(key, trackEst);
  }
  return estimates;
}

function estimatePeriodPlays(
  tracks: RawTrack[],
  snapData: SnapshotData,
  filter: StatsFilter
): { counts: Record<string, number>; isReal: boolean } {
  const snapshots = snapData.snapshots || [];

  let periodStart: Date;
  let periodEnd: Date;

  if (filter.dateFrom || filter.dateTo) {
    periodStart = filter.dateFrom ? new Date(filter.dateFrom) : new Date(2000, 0, 1);
    periodEnd = filter.dateTo ? new Date(filter.dateTo + "T23:59:59") : new Date(2099, 11, 31);
  } else if (filter.year && filter.month && filter.day) {
    periodStart = new Date(filter.year, filter.month - 1, filter.day);
    periodEnd = new Date(filter.year, filter.month - 1, filter.day, 23, 59, 59);
  } else if (filter.year && filter.month) {
    periodStart = new Date(filter.year, filter.month - 1, 1);
    periodEnd = new Date(filter.year, filter.month, 1);
  } else if (filter.year) {
    periodStart = new Date(filter.year, 0, 1);
    periodEnd = new Date(filter.year + 1, 0, 1);
  } else {
    return { counts: {}, isReal: false };
  }

  // Try snapshot bracketing
  let idxBefore: number | null = null;
  let idxAfter: number | null = null;
  let idxFirstInPeriod: number | null = null;
  let idxLastInPeriod: number | null = null;
  for (let i = 0; i < snapshots.length; i++) {
    const st = new Date(snapshots[i].timestamp);
    if (st <= periodStart) idxBefore = i;
    if (st >= periodEnd && idxAfter === null) idxAfter = i;
    if (st > periodStart && st < periodEnd) {
      if (idxFirstInPeriod === null) idxFirstInPeriod = i;
      idxLastInPeriod = i;
    }
  }

  // Use the best available bracket pair:
  // - Ideal: snapshot before period + snapshot after period
  // - Partial: first snapshot in period as start, or last snapshot in period as end
  let bestStart = idxBefore;
  let bestEnd = idxAfter;
  if (bestStart === null && idxFirstInPeriod !== null) bestStart = idxFirstInPeriod;
  if (bestEnd === null && idxLastInPeriod !== null) bestEnd = idxLastInPeriod;

  if (bestStart !== null && bestEnd !== null && bestStart !== bestEnd) {
    const countsBefore = reconstructSnapshot(snapData, bestStart);
    const countsAfter = reconstructSnapshot(snapData, bestEnd);
    const result: Record<string, number> = {};
    for (const [key, countAfter] of Object.entries(countsAfter)) {
      const countBefore = countsBefore[key] || 0;
      const delta = countAfter - countBefore;
      if (delta > 0) result[key] = delta;
    }
    return { counts: result, isReal: true };
  }

  // Fall back to seed estimates
  const estimates = buildSeedEstimates(tracks);
  const result: Record<string, number> = {};
  for (const [key, monthlyEst] of estimates) {
    let total = 0;
    for (const [ymKey, count] of monthlyEst) {
      const [y, m] = ymKey.split("-").map(Number);
      const monthStart = new Date(y, m, 1);
      const monthEnd = new Date(m === 11 ? y + 1 : y, m === 11 ? 0 : m + 1, 1);
      if (monthStart < periodEnd && monthEnd > periodStart) {
        total += count;
      }
    }
    if (total > 0) result[key] = Math.round(total);
  }
  return { counts: result, isReal: false };
}

function getSnapshotCoverage(snapData: SnapshotData) {
  const snapshots = snapData.snapshots || [];
  if (!snapshots.length) {
    return { first_snapshot: null, last_snapshot: null, snapshot_count: 0, real_data_starts: null };
  }
  const timestamps = snapshots.map((s) => new Date(s.timestamp)).sort((a, b) => a.getTime() - b.getTime());
  const first = timestamps[0];
  const last = timestamps[timestamps.length - 1];
  let realStart: string | null = null;
  if (timestamps.length >= 2) {
    const rs = new Date(first);
    rs.setMonth(rs.getMonth() + 1);
    rs.setDate(1);
    realStart = rs.toISOString();
  }
  return {
    first_snapshot: first.toISOString(),
    last_snapshot: last.toISOString(),
    snapshot_count: timestamps.length,
    real_data_starts: realStart,
  };
}

function buildFilterDesc(filter: StatsFilter): string {
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  if (filter.dateFrom || filter.dateTo) {
    const parts: string[] = [];
    if (filter.dateFrom) parts.push(`from ${new Date(filter.dateFrom).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`);
    if (filter.dateTo) parts.push(`to ${new Date(filter.dateTo).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`);
    return parts.join(" ");
  }
  if (filter.year && filter.month && filter.day) {
    return new Date(filter.year, filter.month - 1, filter.day).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  }
  if (filter.year && filter.month) return `${MONTHS[filter.month - 1]} ${filter.year}`;
  if (filter.year) return String(filter.year);
  return "All Time";
}

export async function computeStatsFromLibrary(filter?: StatsFilter): Promise<Stats> {
  const library = await getLibrary();
  const snapData = await getSnapshots();
  const excl = await getExclusions();
  const deletedTracks = await getDeletedTracks();

  // Merge deleted tracks so they appear in all-time and period stats
  let allLibraryTracks = library.tracks;
  if (deletedTracks.length > 0) {
    const existingKeys = new Set(allLibraryTracks.map(makeTrackKey));
    const toMerge = deletedTracks.filter((dt) => !existingKeys.has(makeTrackKey(dt)));
    if (toMerge.length > 0) {
      allLibraryTracks = [...allLibraryTracks, ...toMerge];
    }
  }

  const tracks = applyExclusions(allLibraryTracks, excl);

  const isFiltered = !!(filter?.year || filter?.dateFrom || filter?.dateTo);
  let isEstimated = false;
  let isRealSnapshotData = false;
  let playedTracks: RawTrack[];

  if (isFiltered && filter) {
    // Day-level filtering: use lastPlayed to identify which tracks were
    // played, and snapshot diffs for the delta play count (not all-time).
    if (filter.year && filter.month && filter.day && !filter.dateFrom && !filter.dateTo) {
      const { counts: periodEstimates } = estimatePeriodPlays(tracks, snapData, filter);

      playedTracks = [];
      for (const t of tracks) {
        if ((t.playCount || 0) <= 0) continue;
        const lp = parseDate(t.lastPlayed);
        if (!lp) continue;
        if (lp.getFullYear() === filter.year && lp.getMonth() === filter.month - 1 && lp.getDate() === filter.day) {
          const key = makeTrackKey(t);
          // Use snapshot delta if available, otherwise count as 1
          playedTracks.push({ ...t, playCount: periodEstimates[key] || 1 });
        }
      }
      isRealSnapshotData = true;
    } else {
      const { counts: periodEstimates, isReal } = estimatePeriodPlays(tracks, snapData, filter);
      isRealSnapshotData = isReal;
      isEstimated = !isReal && Object.keys(periodEstimates).length > 0;

      // Supplement with tracks whose lastPlayed falls in the period but
      // were missed by snapshots (e.g. Apple Music sync delay)
      if (isReal) {
        let lpStart: Date | null = null;
        let lpEnd: Date | null = null;
        if (filter.dateFrom || filter.dateTo) {
          lpStart = filter.dateFrom ? new Date(filter.dateFrom) : new Date(2000, 0, 1);
          lpEnd = filter.dateTo ? new Date(filter.dateTo + "T23:59:59") : new Date(2099, 11, 31);
        } else if (filter.year && filter.month) {
          lpStart = new Date(filter.year, filter.month - 1, 1);
          lpEnd = new Date(filter.year, filter.month, 1);
        } else if (filter.year) {
          lpStart = new Date(filter.year, 0, 1);
          lpEnd = new Date(filter.year + 1, 0, 1);
        }
        if (lpStart && lpEnd) {
          for (const t of tracks) {
            const key = makeTrackKey(t);
            if (periodEstimates[key]) continue;
            const lp = parseDate(t.lastPlayed);
            if (!lp) continue;
            if (lp >= lpStart && lp <= lpEnd && (t.playCount || 0) > 0) {
              periodEstimates[key] = t.playCount;
            }
          }
        }
      }

      playedTracks = [];
      for (const t of tracks) {
        const key = makeTrackKey(t);
        const estPlays = periodEstimates[key] || 0;
        if (estPlays > 0) {
          playedTracks.push({ ...t, playCount: estPlays });
        }
      }
    }
  } else {
    playedTracks = tracks.filter((t) => (t.playCount || 0) > 0);
  }

  // Top songs
  const topSongsByPlays = [...playedTracks].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 100);
  const topSongsByTime = [...playedTracks].sort((a, b) => (b.duration || 0) * (b.playCount || 0) - (a.duration || 0) * (a.playCount || 0)).slice(0, 100);

  // Top artists
  const artistMap = new Map<string, { plays: number; duration: number; tracks: number; songs: Set<string> }>();
  for (const t of playedTracks) {
    const artist = t.albumArtist || t.artist || "Unknown";
    const entry = artistMap.get(artist) || { plays: 0, duration: 0, tracks: 0, songs: new Set<string>() };
    const pc = t.playCount || 0;
    entry.plays += pc;
    entry.duration += (t.duration || 0) * pc;
    entry.tracks += 1;
    entry.songs.add(t.name || "");
    artistMap.set(artist, entry);
  }
  const artistList = Array.from(artistMap.entries()).map(([k, v]) => ({
    artist: k, playCount: v.plays, totalListeningTime: v.duration, uniqueTracks: v.tracks, uniqueSongs: v.songs.size,
  }));
  const topArtistsByPlays = [...artistList].sort((a, b) => b.playCount - a.playCount).slice(0, 100);
  const topArtistsByTime = [...artistList].sort((a, b) => b.totalListeningTime - a.totalListeningTime).slice(0, 100);

  // Top albums
  const albumMap = new Map<string, { plays: number; duration: number; tracks: number; artist: string; year: number; ratings: number[] }>();
  for (const t of playedTracks) {
    const album = t.album || "Unknown";
    const entry = albumMap.get(album) || { plays: 0, duration: 0, tracks: 0, artist: "", year: 0, ratings: [] };
    const pc = t.playCount || 0;
    entry.plays += pc;
    entry.duration += (t.duration || 0) * pc;
    entry.tracks += 1;
    if (!entry.artist) entry.artist = t.albumArtist || t.artist || "Unknown";
    if (!entry.year) entry.year = t.year || 0;
    // Track ratings for average calculation
    const raw = t.rating || 0;
    if (raw > 0) {
      const stars = Math.round(raw / 20);
      entry.ratings.push(stars);
    }
    albumMap.set(album, entry);
  }
  const albumList = Array.from(albumMap.entries()).map(([k, v]) => ({
    album: k, artist: v.artist, playCount: v.plays, totalListeningTime: v.duration, trackCount: v.tracks, year: v.year,
    averageRating: v.ratings.length > 0 ? Math.round(v.ratings.reduce((a, b) => a + b, 0) / v.ratings.length * 100) / 100 : 0,
  }));
  const topAlbumsByPlays = [...albumList].sort((a, b) => b.playCount - a.playCount).slice(0, 100);
  const topAlbumsByTime = [...albumList].sort((a, b) => b.totalListeningTime - a.totalListeningTime).slice(0, 100);

  // Top genres
  const genreMap = new Map<string, { plays: number; duration: number; tracks: number }>();
  for (const t of playedTracks) {
    const genre = t.genre || "Unknown";
    const entry = genreMap.get(genre) || { plays: 0, duration: 0, tracks: 0 };
    const pc = t.playCount || 0;
    entry.plays += pc;
    entry.duration += (t.duration || 0) * pc;
    entry.tracks += 1;
    genreMap.set(genre, entry);
  }
  const topGenres = Array.from(genreMap.entries())
    .map(([k, v]) => ({ genre: k, playCount: v.plays, totalListeningTime: v.duration, trackCount: v.tracks }))
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 50);

  // Overview
  const totalPlays = playedTracks.reduce((s, t) => s + (t.playCount || 0), 0);
  const totalListeningSeconds = playedTracks.reduce((s, t) => s + (t.duration || 0) * (t.playCount || 0), 0);

  const allUniqueArtists = new Set<string>();
  const allUniqueAlbums = new Set<string>();
  const allUniqueGenres = new Set<string>();
  for (const t of allLibraryTracks) {
    allUniqueArtists.add(t.artist || t.albumArtist || "Unknown");
    allUniqueAlbums.add(t.album || "Unknown");
    allUniqueGenres.add(t.genre || "Unknown");
  }

  // Ratings
  const ratingBreakdown: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratedTotal = 0, ratedCount = 0;
  for (const t of allLibraryTracks) {
    const raw = t.rating || 0;
    let stars = raw > 0 ? Math.round(raw / 20) : 0;
    stars = Math.max(0, Math.min(5, stars));
    ratingBreakdown[stars]++;
    if (raw > 0) { ratedTotal += stars; ratedCount++; }
  }

  // Latest played
  let latestPlayed: Date | null = null;
  for (const t of playedTracks) {
    const lp = parseDate(t.lastPlayed);
    if (lp && (!latestPlayed || lp > latestPlayed)) latestPlayed = lp;
  }

  // Top years
  const yearCounts = new Map<number, number>();
  for (const t of playedTracks) {
    if ((t.year || 0) > 1900) yearCounts.set(t.year, (yearCounts.get(t.year) || 0) + (t.playCount || 0));
  }
  const topYears = Array.from(yearCounts.entries())
    .map(([y, c]) => ({ year: y, playCount: c }))
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 20);

  // Decades
  const decadeCounts = new Map<number, number>();
  for (const t of playedTracks) {
    if ((t.year || 0) > 1900) {
      const decade = Math.floor(t.year / 10) * 10;
      decadeCounts.set(decade, (decadeCounts.get(decade) || 0) + (t.playCount || 0));
    }
  }
  const decades = Array.from(decadeCounts.entries())
    .map(([d, c]) => ({ decade: `${d}s`, playCount: c }))
    .sort((a, b) => b.playCount - a.playCount);

  const makeSong = (t: RawTrack, i: number) => ({
    rank: i + 1, name: t.name || "", artist: t.artist || "",
    albumArtist: t.albumArtist || t.artist || "",
    album: t.album || "",
    playCount: t.playCount || 0, duration: t.duration || 0,
    totalListeningTime: (t.duration || 0) * (t.playCount || 0),
    genre: t.genre || "", year: t.year || 0, loved: t.loved || false,
    rating: (t.rating || 0) > 0 ? Math.round((t.rating || 0) / 20) : 0,
  });

  return {
    overview: {
      totalTracks: allLibraryTracks.length,
      playedTracks: playedTracks.length,
      totalPlays,
      totalListeningTimeSeconds: totalListeningSeconds,
      totalListeningTimeHours: Math.round(totalListeningSeconds / 3600 * 10) / 10,
      totalListeningTimeDays: Math.round(totalListeningSeconds / 86400 * 10) / 10,
      lovedTracks: allLibraryTracks.filter((t) => t.loved).length,
      uniqueArtists: allUniqueArtists.size,
      uniqueAlbums: allUniqueAlbums.size,
      uniqueGenres: allUniqueGenres.size,
      latestPlayedAt: latestPlayed ? latestPlayed.toISOString() : null,
      ratings: {
        averageRating: ratedCount > 0 ? Math.round(ratedTotal / ratedCount * 100) / 100 : 0,
        ratedCount,
        breakdown: { "5": ratingBreakdown[5], "4": ratingBreakdown[4], "3": ratingBreakdown[3], "2": ratingBreakdown[2], "1": ratingBreakdown[1], "0": ratingBreakdown[0] },
      },
    },
    topSongsByPlays: topSongsByPlays.map(makeSong),
    topSongsByTime: topSongsByTime.map(makeSong),
    topArtistsByPlays: topArtistsByPlays.map((a, i) => ({ rank: i + 1, ...a })),
    topArtistsByTime: topArtistsByTime.map((a, i) => ({ rank: i + 1, ...a })),
    topAlbumsByPlays: topAlbumsByPlays.map((a, i) => ({ rank: i + 1, ...a })),
    topAlbumsByTime: topAlbumsByTime.map((a, i) => ({ rank: i + 1, ...a })),
    topGenres: topGenres.map((g, i) => ({ rank: i + 1, ...g })),
    topYears,
    decades,
    exportDate: library.exportDate,
    libraryTrackCount: library.count,
    isFiltered,
    filterDescription: buildFilterDesc(filter || {}),
    isEstimated,
    isRealSnapshotData,
    snapshotCoverage: getSnapshotCoverage(snapData),
  };
}
