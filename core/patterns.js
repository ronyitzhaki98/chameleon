// Decorative "line styles": horizontally tileable SVG strips that replace plain
// divider lines (a film strip, a row of candlesticks, a trend line...).
// Each generator takes the theme palette and returns { svg, width, height }.

function rng(seed) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`

export const PATTERNS = {
  filmstrip(p) {
    const w = 24
    const h = 14
    return {
      width: w,
      height: h,
      svg: svg(w, h,
        `<rect width="${w}" height="${h}" fill="${p.border}"/>` +
        `<rect x="4" y="2" width="9" height="3" rx="1" fill="${p.bg}"/>` +
        `<rect x="4" y="9" width="9" height="3" rx="1" fill="${p.bg}"/>` +
        `<rect x="16" y="5" width="6" height="4" fill="${p.accent}" opacity=".35"/>`),
    }
  },

  candles(p) {
    const w = 120
    const h = 18
    const r = rng(7)
    let body = ''
    let level = 9
    for (let i = 0; i < 10; i++) {
      const x = 6 + i * 12
      const move = (r() - 0.45) * 8
      const open = level
      const close = Math.max(3, Math.min(15, level - move))
      const up = close < open
      const top = Math.min(open, close)
      const bottom = Math.max(open, close)
      const color = up ? p.positive : p.negative
      body += `<line x1="${x}" x2="${x}" y1="${Math.max(1, top - 2 - r() * 2)}" y2="${Math.min(17, bottom + 2 + r() * 2)}" stroke="${color}" stroke-width="1"/>`
      body += `<rect x="${x - 3}" y="${top}" width="6" height="${Math.max(1.5, bottom - top)}" fill="${color}"/>`
      level = close
    }
    return { width: w, height: h, svg: svg(w, h, body) }
  },

  trendline(p) {
    const w = 80
    const h = 14
    return {
      width: w,
      height: h,
      svg: svg(w, h,
        `<polyline points="0,10 12,7 20,9 32,4 44,8 54,3 66,6 80,10" fill="none" stroke="${p.accent}" stroke-width="1.6" stroke-linejoin="round"/>` +
        `<circle cx="54" cy="3" r="1.6" fill="${p.positive}"/>`),
    }
  },

  wave(p) {
    const w = 40
    const h = 12
    return {
      width: w,
      height: h,
      svg: svg(w, h, `<path d="M0 6 Q10 0 20 6 T40 6" fill="none" stroke="${p.accent}" stroke-width="1.6"/>`),
    }
  },

  circuit(p) {
    const w = 48
    const h = 12
    return {
      width: w,
      height: h,
      svg: svg(w, h,
        `<path d="M0 6 H14 L18 2 H30 L34 6 H48" fill="none" stroke="${p.accent}" stroke-width="1.2"/>` +
        `<circle cx="18" cy="2" r="1.5" fill="${p.accent2}"/><circle cx="34" cy="6" r="1.5" fill="${p.accent2}"/>`),
    }
  },

  notes(p) {
    const w = 60
    const h = 16
    return {
      width: w,
      height: h,
      svg: svg(w, h,
        [3, 6, 9, 12].map(y => `<line x1="0" x2="${w}" y1="${y}" y2="${y}" stroke="${p.border}" stroke-width=".6"/>`).join('') +
        `<ellipse cx="14" cy="10.5" rx="2.6" ry="1.8" fill="${p.accent}"/><line x1="16.4" x2="16.4" y1="10" y2="1" stroke="${p.accent}"/>` +
        `<ellipse cx="40" cy="7.5" rx="2.6" ry="1.8" fill="${p.accent2}"/><line x1="42.4" x2="42.4" y1="7" y2="0" stroke="${p.accent2}"/>`),
    }
  },

  stars(p) {
    const w = 64
    const h = 12
    const star = (x, y, s, c) =>
      `<path d="M${x} ${y - s} L${x + s * 0.3} ${y - s * 0.3} L${x + s} ${y} L${x + s * 0.3} ${y + s * 0.3} L${x} ${y + s} L${x - s * 0.3} ${y + s * 0.3} L${x - s} ${y} L${x - s * 0.3} ${y - s * 0.3}Z" fill="${c}"/>`
    return { width: w, height: h, svg: svg(w, h, star(10, 6, 4, p.accent) + star(34, 4, 2, p.text) + star(52, 8, 3, p.accent2)) }
  },

  leaves(p) {
    const w = 40
    const h = 14
    return {
      width: w,
      height: h,
      svg: svg(w, h,
        `<path d="M0 7 H40" stroke="${p.border}" stroke-width="1"/>` +
        `<path d="M10 7 C12 1 20 1 22 7 C20 9 13 9 10 7Z" fill="${p.accent}"/>` +
        `<path d="M28 7 C30 12 36 12 38 7 C36 5 31 5 28 7Z" fill="${p.accent2}"/>`),
    }
  },

  pixels(p) {
    const w = 32
    const h = 8
    return {
      width: w,
      height: h,
      svg: svg(w, h,
        `<rect x="0" y="0" width="4" height="4" fill="${p.accent}"/><rect x="4" y="4" width="4" height="4" fill="${p.accent}"/>` +
        `<rect x="16" y="0" width="4" height="4" fill="${p.accent2}"/><rect x="20" y="4" width="4" height="4" fill="${p.accent2}"/>`),
    }
  },

  heartbeat(p) {
    const w = 80
    const h = 16
    return {
      width: w,
      height: h,
      svg: svg(w, h, `<polyline points="0,8 26,8 30,2 34,14 38,8 80,8" fill="none" stroke="${p.accent}" stroke-width="1.6" stroke-linejoin="round"/>`),
    }
  },

  dashes(p) {
    const w = 16
    const h = 6
    return { width: w, height: h, svg: svg(w, h, `<rect x="0" y="2" width="9" height="2" rx="1" fill="${p.accent}"/>`) }
  },
}

export const PATTERN_IDS = Object.keys(PATTERNS)

/** Characters a terminal draws for each line style, repeated across a row. */
export const TERMINAL_LINES = {
  filmstrip: ['▮', '▯'],
  candles: ['┃', '╽', '│', '╿'],
  trendline: ['╱', '‾', '╲', '_'],
  wave: ['∿'],
  circuit: ['─', '┬', '─', '─', '┴', '─'],
  notes: ['♪', ' ', '♫', ' '],
  stars: ['✦', ' ', '·', ' '],
  leaves: ['❦', '─', '─'],
  pixels: ['▀', '▄'],
  heartbeat: ['─', '─', '╱', '╲', '─'],
  dashes: ['╌'],
}

export function renderPattern(id, palette) {
  const make = PATTERNS[id] || PATTERNS.dashes
  return make(palette)
}

export function svgDataUri(svgText) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`
}
