export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:2121/api";
export const STATIC_MODE = process.env.NEXT_PUBLIC_STATIC_MODE === "true";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export interface RatingBreakdown {
  "5": number;
  "4": number;
  "3": number;
  "2": number;
  "1": number;
  "0": number;
}

export interface RatingStats {
  averageRating: number;
  ratedCount: number;
  breakdown: RatingBreakdown;
}

export interface Overview {
  totalTracks: number;
  playedTracks: number;
  totalPlays: number;
  totalListeningTimeSeconds: number;
  totalListeningTimeHours: number;
  totalListeningTimeDays: number;
  lovedTracks: number;
  uniqueArtists: number;
  uniqueAlbums: number;
  uniqueGenres: number;
  latestPlayedAt: string | null;
  ratings: RatingStats;
}

export interface TopSong {
  rank: number;
  name: string;
  artist: string;
  albumArtist: string;
  album: string;
  playCount: number;
  duration: number;
  totalListeningTime: number;
  genre: string;
  year: number;
  loved: boolean;
  rating: number;
}

export interface TopArtist {
  rank: number;
  artist: string;
  playCount: number;
  totalListeningTime: number;
  uniqueTracks: number;
  uniqueSongs: number;
}

export interface AlbumAlias {
  album: string;
  artist: string;
  firstSeen: string;
  lastSeen: string;
}

export interface TopAlbum {
  rank: number;
  album: string;
  artist: string;
  playCount: number;
  totalListeningTime: number;
  trackCount: number;
  year: number;
  averageRating: number;
  aliases?: AlbumAlias[];
}

export interface TopGenre {
  rank: number;
  genre: string;
  playCount: number;
  totalListeningTime: number;
  trackCount: number;
}

export interface YearEntry {
  year: number;
  playCount: number;
}

export interface DecadeEntry {
  decade: string;
  playCount: number;
}

export interface Stats {
  overview: Overview;
  topSongsByPlays: TopSong[];
  topSongsByTime: TopSong[];
  topArtistsByPlays: TopArtist[];
  topArtistsByTime: TopArtist[];
  topAlbumsByPlays: TopAlbum[];
  topAlbumsByTime: TopAlbum[];
  topGenres: TopGenre[];
  topYears: YearEntry[];
  decades: DecadeEntry[];
  exportDate: string;
  libraryTrackCount: number;
  isFiltered: boolean;
  filterDescription: string;
  isEstimated: boolean;
  isRealSnapshotData: boolean;
  snapshotCoverage: {
    first_snapshot: string | null;
    last_snapshot: string | null;
    snapshot_count: number;
    real_data_starts: string | null;
  };
}

export interface AlbumExclusion {
  album: string;
  artist: string;
}

export interface Exclusions {
  albums: AlbumExclusion[];
  artists: string[];
  tracks: string[];
}

export interface StatsFilter {
  year?: number;
  month?: number;
  day?: number;
  dateFrom?: string;
  dateTo?: string;
}

export async function fetchStats(filter?: StatsFilter): Promise<Stats> {
  if (STATIC_MODE) {
    const { computeStatsFromLibrary } = await import("./computeStats");
    return computeStatsFromLibrary(filter);
  }
  const params = new URLSearchParams();
  if (filter?.year) params.set("year", String(filter.year));
  if (filter?.month) params.set("month", String(filter.month));
  if (filter?.day) params.set("day", String(filter.day));
  if (filter?.dateFrom) params.set("dateFrom", filter.dateFrom);
  if (filter?.dateTo) params.set("dateTo", filter.dateTo);
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/stats${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function triggerExport(): Promise<{ status: string; count: number; exportDate: string }> {
  const res = await fetch(`${API_BASE}/export`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to export library");
  return res.json();
}

export async function fetchYears(): Promise<{ years: number[]; earliestYear: number | null }> {
  if (STATIC_MODE) {
    const res = await fetch(`${BASE_PATH}/data/years.json`);
    if (!res.ok) throw new Error("Failed to fetch static years");
    return res.json();
  }
  const res = await fetch(`${API_BASE}/years`);
  if (!res.ok) throw new Error("Failed to fetch years");
  return res.json();
}

export async function fetchExclusions(): Promise<Exclusions> {
  const res = await fetch(`${API_BASE}/exclusions`);
  if (!res.ok) throw new Error("Failed to fetch exclusions");
  return res.json();
}

export async function addExclusion(type: "album" | "artist" | "track", value: string, artist?: string): Promise<Exclusions> {
  const body: Record<string, string> = { type, value };
  if (type === "album" && artist) body.artist = artist;
  const res = await fetch(`${API_BASE}/exclusions/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to add exclusion");
  return res.json();
}

export async function removeExclusion(type: "album" | "artist" | "track", value: string, artist?: string): Promise<Exclusions> {
  const body: Record<string, string> = { type, value };
  if (type === "album" && artist) body.artist = artist;
  const res = await fetch(`${API_BASE}/exclusions/remove`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to remove exclusion");
  return res.json();
}

// ─── Song override index (loaded once in static mode) ───
let _overrideIndex: Set<string> | null = null;
let _overrideIndexLoading: Promise<Set<string>> | null = null;

async function getOverrideIndex(): Promise<Set<string>> {
  if (_overrideIndex) return _overrideIndex;
  if (!_overrideIndexLoading) {
    _overrideIndexLoading = fetch(`${BASE_PATH}/data/artwork/overrides_index.json`)
      .then((res) => (res.ok ? res.json() : []))
      .then((arr: string[]) => { _overrideIndex = new Set(arr); return _overrideIndex; })
      .catch(() => { _overrideIndex = new Set(); return _overrideIndex; });
  }
  return _overrideIndexLoading;
}

export function songArtworkUrl(name: string, artist: string, album?: string, albumArtist?: string): string {
  if (STATIC_MODE) {
    // In static mode, songs use album artwork by default.
    // Override check is async so we can't do it here synchronously.
    // The export script generates overrides_index.json; songArtworkUrlAsync handles it.
    // For the sync path, just return the album artwork URL.
    const aa = albumArtist || artist;
    return `${BASE_PATH}/data/artwork/albums/${artworkHash(album || "", aa)}.jpg`;
  }
  return `${API_BASE}/artwork?name=${encodeURIComponent(name)}&artist=${encodeURIComponent(artist)}`;
}

export function albumArtworkUrl(album: string, artist: string): string {
  if (STATIC_MODE) {
    return `${BASE_PATH}/data/artwork/albums/${artworkHash(album, artist)}.jpg`;
  }
  return `${API_BASE}/artwork/album?album=${encodeURIComponent(album)}&artist=${encodeURIComponent(artist)}`;
}

export function artistArtworkUrl(artist: string): string {
  if (STATIC_MODE) {
    if (artist.toLowerCase() === "various artists") {
      return `${BASE_PATH}/data/artwork/artists/various_artists.png`;
    }
    return `${BASE_PATH}/data/artwork/artists/${artworkHash("__artist__", artist)}.jpg`;
  }
  return `${API_BASE}/artwork/artist?artist=${encodeURIComponent(artist)}`;
}

function artworkHash(name: string, artist: string): string {
  const key = `${name}|||${artist}`.toLowerCase().trim();
  return md5HashReal(key);
}

function md5HashReal(str: string): string {
  // Minimal MD5 implementation for artwork hash matching
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936);d = ff(d, a, b, c, k[1], 12, -389564586);c = ff(c, d, a, b, k[2], 17, 606105819);b = ff(b, c, d, a, k[3], 22, -1044525330);a = ff(a, b, c, d, k[4], 7, -176418897);d = ff(d, a, b, c, k[5], 12, 1200080426);c = ff(c, d, a, b, k[6], 17, -1473231341);b = ff(b, c, d, a, k[7], 22, -45705983);a = ff(a, b, c, d, k[8], 7, 1770035416);d = ff(d, a, b, c, k[9], 12, -1958414417);c = ff(c, d, a, b, k[10], 17, -42063);b = ff(b, c, d, a, k[11], 22, -1990404162);a = ff(a, b, c, d, k[12], 7, 1804603682);d = ff(d, a, b, c, k[13], 12, -40341101);c = ff(c, d, a, b, k[14], 17, -1502002290);b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510);d = gg(d, a, b, c, k[6], 9, -1069501632);c = gg(c, d, a, b, k[11], 14, 643717713);b = gg(b, c, d, a, k[0], 20, -373897302);a = gg(a, b, c, d, k[5], 5, -701558691);d = gg(d, a, b, c, k[10], 9, 38016083);c = gg(c, d, a, b, k[15], 14, -660478335);b = gg(b, c, d, a, k[4], 20, -405537848);a = gg(a, b, c, d, k[9], 5, 568446438);d = gg(d, a, b, c, k[14], 9, -1019803690);c = gg(c, d, a, b, k[3], 14, -187363961);b = gg(b, c, d, a, k[8], 20, 1163531501);a = gg(a, b, c, d, k[13], 5, -1444681467);d = gg(d, a, b, c, k[2], 9, -51403784);c = gg(c, d, a, b, k[7], 14, 1735328473);b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558);d = hh(d, a, b, c, k[8], 11, -2022574463);c = hh(c, d, a, b, k[11], 16, 1839030562);b = hh(b, c, d, a, k[14], 23, -35309556);a = hh(a, b, c, d, k[1], 4, -1530992060);d = hh(d, a, b, c, k[4], 11, 1272893353);c = hh(c, d, a, b, k[7], 16, -155497632);b = hh(b, c, d, a, k[10], 23, -1094730640);a = hh(a, b, c, d, k[13], 4, 681279174);d = hh(d, a, b, c, k[0], 11, -358537222);c = hh(c, d, a, b, k[3], 16, -722521979);b = hh(b, c, d, a, k[6], 23, 76029189);a = hh(a, b, c, d, k[9], 4, -640364487);d = hh(d, a, b, c, k[12], 11, -421815835);c = hh(c, d, a, b, k[15], 16, 530742520);b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844);d = ii(d, a, b, c, k[7], 10, 1126891415);c = ii(c, d, a, b, k[14], 15, -1416354905);b = ii(b, c, d, a, k[5], 21, -57434055);a = ii(a, b, c, d, k[12], 6, 1700485571);d = ii(d, a, b, c, k[3], 10, -1894986606);c = ii(c, d, a, b, k[10], 15, -1051523);b = ii(b, c, d, a, k[1], 21, -2054922799);a = ii(a, b, c, d, k[8], 6, 1873313359);d = ii(d, a, b, c, k[15], 10, -30611744);c = ii(c, d, a, b, k[6], 15, -1560198380);b = ii(b, c, d, a, k[13], 21, 1309151649);a = ii(a, b, c, d, k[4], 6, -145523070);d = ii(d, a, b, c, k[11], 10, -1120210379);c = ii(c, d, a, b, k[2], 15, 718787259);b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]);x[1] = add32(b, x[1]);x[2] = add32(c, x[2]);x[3] = add32(d, x[3]);
  }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) { a = add32(add32(a, q), add32(x, t)); return add32((a << s) | (a >>> (32 - s)), b); }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
  function add32(a: number, b: number) { return (a + b) & 0xFFFFFFFF; }
  function md5blk(s: number[]) { const md5blks: number[] = []; for (let i = 0; i < 64; i += 4) { md5blks[i >> 2] = s[i] + (s[i + 1] << 8) + (s[i + 2] << 16) + (s[i + 3] << 24); } return md5blks; }

  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) { bytes.push(code); }
    else if (code < 0x800) { bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f)); }
    else { bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f)); }
  }

  const n = bytes.length;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const bitLen = n * 8;
  bytes.push(bitLen & 0xff, (bitLen >> 8) & 0xff, (bitLen >> 16) & 0xff, (bitLen >> 24) & 0xff, 0, 0, 0, 0);

  const state = [1732584193, -271733879, -1732584194, 271733878];
  for (let i = 0; i < bytes.length; i += 64) {
    md5cycle(state, md5blk(bytes.slice(i, i + 64)));
  }

  const hex = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const byte = (state[i] >> (j * 8)) & 0xff;
      result += hex[byte >> 4] + hex[byte & 0xf];
    }
  }
  return result;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export type TimeDisplayMode = "minutes" | "detailed";

export function formatListeningTime(
  seconds: number,
  mode: TimeDisplayMode = "minutes"
): string {
  if (mode === "minutes") {
    const totalMinutes = Math.floor(seconds / 60);
    return `${formatNumber(totalMinutes)} minutes`;
  }

  // Detailed mode: years, months, weeks, days, hours, minutes, seconds
  let remaining = Math.floor(seconds);
  const years = Math.floor(remaining / (365.25 * 86400));
  remaining -= Math.floor(years * 365.25 * 86400);
  const months = Math.floor(remaining / (30.44 * 86400));
  remaining -= Math.floor(months * 30.44 * 86400);
  const weeks = Math.floor(remaining / (7 * 86400));
  remaining -= weeks * 7 * 86400;
  const days = Math.floor(remaining / 86400);
  remaining -= days * 86400;
  const hours = Math.floor(remaining / 3600);
  remaining -= hours * 3600;
  const minutes = Math.floor(remaining / 60);
  const secs = remaining - minutes * 60;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years !== 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} mo`);
  if (weeks > 0) parts.push(`${weeks} wk${weeks !== 1 ? "s" : ""}`);
  if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  if (hours > 0) parts.push(`${hours} hr${hours !== 1 ? "s" : ""}`);
  if (minutes > 0) parts.push(`${minutes} min`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} sec`);

  return parts.join(", ");
}
