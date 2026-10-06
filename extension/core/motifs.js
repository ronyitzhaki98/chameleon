// Built-in motif library. The model may pick one of these as a starting point
// and override any part of it; with no model at all, keyword matching against
// the project's idea picks one, so the mod always produces a theme offline.

export const MOTIFS = {
  film: {
    keywords: ['video', 'film', 'movie', 'cinema', 'editor', 'editing', 'youtube', 'stream', 'camera', 'clip', 'footage', 'premiere', 'reel', 'animation'],
    name: 'Cutting Room',
    mode: 'dark',
    palette: { bg: '#121214', surface: '#1c1c20', surfaceAlt: '#26262c', text: '#f2efe6', textMuted: '#a29f97', accent: '#f5c518', accent2: '#e2483d', positive: '#5bc07a', negative: '#e2483d', border: '#3a3a42' },
    pattern: 'filmstrip',
    glyphs: ['🎬', '🎥', '💡', '🎞️', '🎙️'],
    logoIcon: 'movie',
    icons: ['movie', 'video', 'bulb', 'microphone-2', 'aperture', 'player-play'],
  },
  finance: {
    keywords: ['trading', 'trade', 'stock', 'stocks', 'crypto', 'finance', 'invest', 'market', 'forex', 'portfolio', 'bank', 'budget', 'money', 'fintech', 'day trading', 'chart'],
    name: 'Bull Market',
    mode: 'dark',
    palette: { bg: '#0b1310', surface: '#111c17', surfaceAlt: '#18261f', text: '#e6f2ea', textMuted: '#8aa396', accent: '#26c281', accent2: '#e8b14a', positive: '#26c281', negative: '#ef4f4f', border: '#24372d' },
    pattern: 'candles',
    glyphs: ['📈', '💲', '🐂', '🐻', '🕯️'],
    logoIcon: 'trending-up',
    icons: ['trending-up', 'currency-dollar', 'chart-candle', 'trending-down', 'coin', 'building-bank'],
  },
  music: {
    keywords: ['music', 'audio', 'song', 'sound', 'podcast', 'dj', 'synth', 'playlist', 'band', 'beat', 'spotify'],
    name: 'Studio Session',
    mode: 'dark',
    palette: { bg: '#140f1c', surface: '#1d1628', surfaceAlt: '#281e37', text: '#f1eafa', textMuted: '#a596ba', accent: '#c084fc', accent2: '#f472b6', positive: '#4ade80', negative: '#fb7185', border: '#3a2d4f' },
    pattern: 'notes',
    glyphs: ['🎵', '🎧', '🎹', '🎸', '🎤'],
    logoIcon: 'headphones',
    icons: ['music', 'headphones', 'piano', 'microphone', 'vinyl', 'guitar-pick'],
  },
  gaming: {
    keywords: ['game', 'gaming', 'unity', 'godot', 'arcade', 'rpg', 'pixel', 'player', 'level', 'esports'],
    name: 'Arcade',
    mode: 'dark',
    palette: { bg: '#0d0b1f', surface: '#16133a', surfaceAlt: '#1f1b4d', text: '#eef0ff', textMuted: '#9a9cc9', accent: '#22d3ee', accent2: '#f43f5e', positive: '#a3e635', negative: '#f43f5e', border: '#2e2a66' },
    pattern: 'pixels',
    glyphs: ['🎮', '👾', '🕹️', '⭐', '🏆'],
    logoIcon: 'device-gamepad-2',
    icons: ['device-gamepad-2', 'ghost-2', 'trophy', 'star', 'sword', 'heart'],
  },
  nature: {
    keywords: ['garden', 'plant', 'farm', 'nature', 'eco', 'green', 'climate', 'forest', 'agriculture', 'outdoor', 'hiking'],
    name: 'Greenhouse',
    mode: 'light',
    palette: { bg: '#f4f7ef', surface: '#ffffff', surfaceAlt: '#e8efdf', text: '#1f2b1a', textMuted: '#5d6d55', accent: '#3f8f3a', accent2: '#c08a2d', positive: '#3f8f3a', negative: '#c2452d', border: '#cfdcc3' },
    pattern: 'leaves',
    glyphs: ['🌿', '🌱', '🌻', '🍃', '🌳'],
    logoIcon: 'leaf',
    icons: ['leaf', 'seedling', 'flower', 'tree', 'sun', 'plant-2'],
  },
  space: {
    keywords: ['space', 'astronomy', 'rocket', 'nasa', 'galaxy', 'satellite', 'star', 'planet', 'orbit'],
    name: 'Deep Orbit',
    mode: 'dark',
    palette: { bg: '#070a18', surface: '#0e1328', surfaceAlt: '#151c3a', text: '#e8ecff', textMuted: '#8b93bf', accent: '#7c9cff', accent2: '#ffb86b', positive: '#5eead4', negative: '#ff6b8b', border: '#232c55' },
    pattern: 'stars',
    glyphs: ['🚀', '🪐', '🌌', '🛰️', '✨'],
    logoIcon: 'rocket',
    icons: ['rocket', 'planet', 'satellite', 'moon', 'telescope', 'star'],
  },
  tech: {
    keywords: ['api', 'backend', 'server', 'devops', 'ai', 'ml', 'robot', 'iot', 'hardware', 'chip', 'database', 'cloud', 'security', 'cli'],
    name: 'Circuit Board',
    mode: 'dark',
    palette: { bg: '#0a1214', surface: '#101c1f', surfaceAlt: '#16272b', text: '#dff7f3', textMuted: '#7fa39d', accent: '#2dd4bf', accent2: '#facc15', positive: '#4ade80', negative: '#f87171', border: '#1f3a3d' },
    pattern: 'circuit',
    glyphs: ['🔌', '🤖', '💾', '⚙️', '🛰️'],
    logoIcon: 'cpu',
    icons: ['cpu', 'server', 'terminal-2', 'robot', 'database', 'code'],
  },
  health: {
    keywords: ['health', 'fitness', 'medical', 'workout', 'gym', 'clinic', 'doctor', 'wellness', 'sleep', 'diet'],
    name: 'Vital Signs',
    mode: 'light',
    palette: { bg: '#f6f9fb', surface: '#ffffff', surfaceAlt: '#e9f1f6', text: '#13222e', textMuted: '#5a6d7a', accent: '#e0435a', accent2: '#1f9bd1', positive: '#1aa36f', negative: '#e0435a', border: '#d3e0e8' },
    pattern: 'heartbeat',
    glyphs: ['❤️', '🩺', '💪', '🏃', '🍎'],
    logoIcon: 'heartbeat',
    icons: ['heartbeat', 'stethoscope', 'run', 'apple', 'barbell', 'heart-rate-monitor'],
  },
  ocean: {
    keywords: ['ocean', 'sea', 'surf', 'boat', 'sail', 'beach', 'water', 'fish', 'marine', 'travel', 'trip', 'booking'],
    name: 'High Tide',
    mode: 'dark',
    palette: { bg: '#071722', surface: '#0c2231', surfaceAlt: '#123044', text: '#e2f3fb', textMuted: '#86a9bb', accent: '#38bdf8', accent2: '#fbbf24', positive: '#34d399', negative: '#f87171', border: '#1b3d52' },
    pattern: 'wave',
    glyphs: ['🌊', '⛵', '🐚', '🐠', '🏝️'],
    logoIcon: 'sailboat',
    icons: ['sailboat', 'fish', 'beach', 'anchor', 'wave-sine', 'ripple'],
  },
  default: {
    keywords: [],
    name: 'Workshop',
    mode: 'dark',
    palette: { bg: '#141413', surface: '#1f1e1d', surfaceAlt: '#2a2927', text: '#f0eee6', textMuted: '#a3a097', accent: '#d97757', accent2: '#6a9bcc', positive: '#788c5d', negative: '#bf4d43', border: '#3a3936' },
    pattern: 'dashes',
    glyphs: ['🛠️', '📐', '🧩', '💡', '📦'],
    logoIcon: 'sparkles',
    icons: ['sparkles', 'tool', 'puzzle', 'bulb', 'package', 'compass'],
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
