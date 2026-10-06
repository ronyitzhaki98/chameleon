// Built-in motif library. The model may pick one of these as a starting point
// and override any part of it; with no model at all, keyword matching against
// the project's idea picks one, so the mod always produces a theme offline.

const logo = body =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${body}</svg>`

export const MOTIFS = {
  film: {
    keywords: ['video', 'film', 'movie', 'cinema', 'editor', 'editing', 'youtube', 'stream', 'camera', 'clip', 'footage', 'premiere', 'reel', 'animation'],
    name: 'Cutting Room',
    mode: 'dark',
    palette: { bg: '#121214', surface: '#1c1c20', surfaceAlt: '#26262c', text: '#f2efe6', textMuted: '#a29f97', accent: '#f5c518', accent2: '#e2483d', positive: '#5bc07a', negative: '#e2483d', border: '#3a3a42' },
    pattern: 'filmstrip',
    glyphs: ['🎬', '🎥', '💡', '🎞️', '🎙️'],
    logo: logo(
      '<rect x="4" y="13" width="24" height="15" rx="2" fill="currentColor"/>' +
      '<path d="M4 8 L26 3 L27.5 8.5 L5.5 13.5Z" fill="currentColor"/>' +
      '<path d="M9 7 L12 11 M15 5.5 L18 9.5 M21 4.2 L24 8.2" stroke="#000" stroke-width="2"/>'),
  },
  finance: {
    keywords: ['trading', 'trade', 'stock', 'stocks', 'crypto', 'finance', 'invest', 'market', 'forex', 'portfolio', 'bank', 'budget', 'money', 'fintech', 'day trading', 'chart'],
    name: 'Bull Market',
    mode: 'dark',
    palette: { bg: '#0b1310', surface: '#111c17', surfaceAlt: '#18261f', text: '#e6f2ea', textMuted: '#8aa396', accent: '#26c281', accent2: '#e8b14a', positive: '#26c281', negative: '#ef4f4f', border: '#24372d' },
    pattern: 'candles',
    glyphs: ['📈', '💲', '🐂', '🐻', '🕯️'],
    logo: logo(
      '<line x1="9" y1="4" x2="9" y2="28" stroke="#26c281" stroke-width="2"/><rect x="5.5" y="9" width="7" height="12" fill="#26c281"/>' +
      '<line x1="22" y1="6" x2="22" y2="27" stroke="#ef4f4f" stroke-width="2"/><rect x="18.5" y="12" width="7" height="10" fill="#ef4f4f"/>'),
  },
  music: {
    keywords: ['music', 'audio', 'song', 'sound', 'podcast', 'dj', 'synth', 'playlist', 'band', 'beat', 'spotify'],
    name: 'Studio Session',
    mode: 'dark',
    palette: { bg: '#140f1c', surface: '#1d1628', surfaceAlt: '#281e37', text: '#f1eafa', textMuted: '#a596ba', accent: '#c084fc', accent2: '#f472b6', positive: '#4ade80', negative: '#fb7185', border: '#3a2d4f' },
    pattern: 'notes',
    glyphs: ['🎵', '🎧', '🎹', '🎸', '🎤'],
    logo: logo('<path d="M12 6 L26 3 V21" stroke="currentColor" stroke-width="2.5" fill="none"/><circle cx="9" cy="24" r="4.5" fill="currentColor"/><circle cx="22.5" cy="21" r="4.5" fill="currentColor"/>'),
  },
  gaming: {
    keywords: ['game', 'gaming', 'unity', 'godot', 'arcade', 'rpg', 'pixel', 'player', 'level', 'esports'],
    name: 'Arcade',
    mode: 'dark',
    palette: { bg: '#0d0b1f', surface: '#16133a', surfaceAlt: '#1f1b4d', text: '#eef0ff', textMuted: '#9a9cc9', accent: '#22d3ee', accent2: '#f43f5e', positive: '#a3e635', negative: '#f43f5e', border: '#2e2a66' },
    pattern: 'pixels',
    glyphs: ['🎮', '👾', '🕹️', '⭐', '🏆'],
    logo: logo('<rect x="3" y="10" width="26" height="14" rx="7" fill="currentColor"/><path d="M9 14 V20 M6 17 H12" stroke="#000" stroke-width="2"/><circle cx="21" cy="15" r="1.6" fill="#000"/><circle cx="24" cy="19" r="1.6" fill="#000"/>'),
  },
  nature: {
    keywords: ['garden', 'plant', 'farm', 'nature', 'eco', 'green', 'climate', 'forest', 'agriculture', 'outdoor', 'hiking'],
    name: 'Greenhouse',
    mode: 'light',
    palette: { bg: '#f4f7ef', surface: '#ffffff', surfaceAlt: '#e8efdf', text: '#1f2b1a', textMuted: '#5d6d55', accent: '#3f8f3a', accent2: '#c08a2d', positive: '#3f8f3a', negative: '#c2452d', border: '#cfdcc3' },
    pattern: 'leaves',
    glyphs: ['🌿', '🌱', '🌻', '🍃', '🌳'],
    logo: logo('<path d="M6 26 C6 12 14 5 27 5 C27 18 20 26 6 26Z" fill="currentColor"/><path d="M6 26 L20 12" stroke="#fff" stroke-width="1.5"/>'),
  },
  space: {
    keywords: ['space', 'astronomy', 'rocket', 'nasa', 'galaxy', 'satellite', 'star', 'planet', 'orbit'],
    name: 'Deep Orbit',
    mode: 'dark',
    palette: { bg: '#070a18', surface: '#0e1328', surfaceAlt: '#151c3a', text: '#e8ecff', textMuted: '#8b93bf', accent: '#7c9cff', accent2: '#ffb86b', positive: '#5eead4', negative: '#ff6b8b', border: '#232c55' },
    pattern: 'stars',
    glyphs: ['🚀', '🪐', '🌌', '🛰️', '✨'],
    logo: logo('<path d="M16 3 C22 8 23 16 20 23 H12 C9 16 10 8 16 3Z" fill="currentColor"/><circle cx="16" cy="13" r="2.5" fill="#000"/><path d="M12 23 L8 28 M20 23 L24 28 M16 24 V30" stroke="#ffb86b" stroke-width="2"/>'),
  },
  tech: {
    keywords: ['api', 'backend', 'server', 'devops', 'ai', 'ml', 'robot', 'iot', 'hardware', 'chip', 'database', 'cloud', 'security', 'cli'],
    name: 'Circuit Board',
    mode: 'dark',
    palette: { bg: '#0a1214', surface: '#101c1f', surfaceAlt: '#16272b', text: '#dff7f3', textMuted: '#7fa39d', accent: '#2dd4bf', accent2: '#facc15', positive: '#4ade80', negative: '#f87171', border: '#1f3a3d' },
    pattern: 'circuit',
    glyphs: ['🔌', '🤖', '💾', '⚙️', '🛰️'],
    logo: logo('<rect x="8" y="8" width="16" height="16" rx="2" fill="currentColor"/><path d="M12 8 V3 M16 8 V3 M20 8 V3 M12 24 V29 M16 24 V29 M20 24 V29 M8 12 H3 M8 20 H3 M24 12 H29 M24 20 H29" stroke="currentColor" stroke-width="2"/>'),
  },
  health: {
    keywords: ['health', 'fitness', 'medical', 'workout', 'gym', 'clinic', 'doctor', 'wellness', 'sleep', 'diet'],
    name: 'Vital Signs',
    mode: 'light',
    palette: { bg: '#f6f9fb', surface: '#ffffff', surfaceAlt: '#e9f1f6', text: '#13222e', textMuted: '#5a6d7a', accent: '#e0435a', accent2: '#1f9bd1', positive: '#1aa36f', negative: '#e0435a', border: '#d3e0e8' },
    pattern: 'heartbeat',
    glyphs: ['❤️', '🩺', '💪', '🏃', '🍎'],
    logo: logo('<path d="M16 28 C4 19 3 12 6 8 C9 4 14 5 16 9 C18 5 23 4 26 8 C29 12 28 19 16 28Z" fill="currentColor"/><polyline points="7,16 12,16 14,12 17,20 19,16 25,16" stroke="#fff" stroke-width="1.6" fill="none"/>'),
  },
  ocean: {
    keywords: ['ocean', 'sea', 'surf', 'boat', 'sail', 'beach', 'water', 'fish', 'marine', 'travel', 'trip', 'booking'],
    name: 'High Tide',
    mode: 'dark',
    palette: { bg: '#071722', surface: '#0c2231', surfaceAlt: '#123044', text: '#e2f3fb', textMuted: '#86a9bb', accent: '#38bdf8', accent2: '#fbbf24', positive: '#34d399', negative: '#f87171', border: '#1b3d52' },
    pattern: 'wave',
    glyphs: ['🌊', '⛵', '🐚', '🐠', '🏝️'],
    logo: logo('<path d="M3 20 Q9 14 15 20 T27 20 V28 H3Z" fill="currentColor"/><path d="M8 17 L16 4 L16 17Z" fill="#fbbf24"/>'),
  },
  default: {
    keywords: [],
    name: 'Workshop',
    mode: 'dark',
    palette: { bg: '#141413', surface: '#1f1e1d', surfaceAlt: '#2a2927', text: '#f0eee6', textMuted: '#a3a097', accent: '#d97757', accent2: '#6a9bcc', positive: '#788c5d', negative: '#bf4d43', border: '#3a3936' },
    pattern: 'dashes',
    glyphs: ['🛠️', '📐', '🧩', '💡', '📦'],
    logo: logo('<path d="M16 3 L18.5 13.5 L29 16 L18.5 18.5 L16 29 L13.5 18.5 L3 16 L13.5 13.5Z" fill="currentColor"/>'),
  },
}

export const MOTIF_IDS = Object.keys(MOTIFS)

/** Picks the motif whose keywords best match the idea; `default` when none do. */
export function matchMotif(idea) {
  const text = ` ${String(idea || '').toLowerCase()} `
  let best = 'default'
  let bestScore = 0
  for (const [id, motif] of Object.entries(MOTIFS)) {
    let score = 0
    for (const word of motif.keywords) {
      if (text.includes(` ${word}`) || text.includes(`${word} `)) score += word.includes(' ') ? 2 : 1
    }
    if (score > bestScore) {
      best = id
      bestScore = score
    }
  }
  return best
}
