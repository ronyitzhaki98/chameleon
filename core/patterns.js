// Line styles: horizontally tileable SVG strips that replace plain divider
// lines (a strip of film, a run of candlesticks, an ECG trace...). Each one is
// drawn at its natural height and tiles seamlessly; colors come from the theme.

const svg = (w, h, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`

export const PATTERNS = {
  filmstrip(p) {
    // One frame of 35mm stock: sprocket holes top and bottom, a frame between.
    const w = 30
    const h = 16
    return {
      width: w,
      height: h,
      svg: svg(w, h,
        `<rect width="${w}" height="${h}" fill="${p.border}"/>` +
        `<rect x="3" y="2" width="5" height="3" rx="1" fill="${p.bg}"/><rect x="18" y="2" width="5" height="3" rx="1" fill="${p.bg}"/>` +
        `<rect x="3" y="11" width="5" height="3" rx="1" fill="${p.bg}"/><rect x="18" y="11" width="5" height="3" rx="1" fill="${p.bg}"/>` +
        `<rect x="1" y="6.5" width="27" height="3" rx=".5" fill="${p.accent}" opacity=".55"/>`),
    }
  },

  candles(p) {
    // A designed run (not random): a climb, a pullback, a breakout.
    const series = [[12, 9], [9, 10], [10, 7], [7, 8], [8, 5], [5, 7], [7, 9], [9, 8], [8, 5], [5, 3], [3, 4], [4, 6]]
    const w = series.length * 9
    const h = 20
    let body = ''
    series.forEach(([open, close], i) => {
      const x = 4.5 + i * 9
      const up = close < open
      const top = Math.min(open, close)
      const bottom = Math.max(open, close)
      const c = up ? p.positive : p.negative
      body += `<line x1="${x}" x2="${x}" y1="${top - 2.5}" y2="${bottom + 2.5}" stroke="${c}" stroke-width="1" stroke-linecap="round"/>`
      body += `<rect x="${x - 2.5}" y="${top}" width="5" height="${Math.max(1.5, bottom - top)}" rx=".75" fill="${c}"/>`
    })
    return { width: w, height: h, svg: svg(w, h, body) }
  },

  trendline(p) {
    const w = 120
    const h = 16
    const line = 'M0 11 C10 11 14 7 22 8 S36 12 46 9 S60 3 72 5 S90 10 100 8 S114 11 120 11'
    return {
      width: w,
      height: h,
      svg: svg(w, h,
        `<path d="${line} L120 16 L0 16Z" fill="url(#g)"/><path d="${line}" fill="none" stroke="${p.accent}" stroke-width="1.5" stroke-linecap="round"/>`,
        `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.accent}" stop-opacity=".35"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></linearGradient>`),
    }
  },

  wave(p) {
    const w = 48
    const h = 12
    return {
      width: w,
      height: h,
      svg: svg(w, h,
        `<path d="M0 6 C8 1 16 1 24 6 S40 11 48 6" fill="none" stroke="${p.accent}" stroke-width="1.6" stroke-linecap="round"/>` +
        `<path d="M0 9 C8 4 16 4 24 9 S40 14 48 9" fill="none" stroke="${p.accent2}" stroke-width="1" opacity=".5"/>`),
    }
  },

  circuit(p) {
    const w = 64
    const h = 14
    return {
      width: w,
      height: h,
      svg: svg(w, h,
        `<path d="M0 7 H14 L19 3 H34 L39 7 H64" fill="none" stroke="${p.accent}" stroke-width="1.25" stroke-linejoin="round"/>` +
        `<path d="M24 3 V0 M29 3 V0" stroke="${p.accent}" stroke-width="1" opacity=".6"/>` +
        `<circle cx="19" cy="3" r="1.8" fill="${p.bg}" stroke="${p.accent2}" stroke-width="1.2"/>` +
        `<circle cx="39" cy="7" r="1.8" fill="${p.bg}" stroke="${p.accent2}" stroke-width="1.2"/>` +
        `<rect x="48" y="9.5" width="7" height="3" rx=".75" fill="${p.accent}" opacity=".5"/>`),
    }
  },

  notes(p) {
    const w = 72
    const h = 18
    const staff = [3, 6, 9, 12, 15].map(y => `<line x1="0" x2="${w}" y1="${y}" y2="${y}" stroke="${p.textMuted}" stroke-width=".5" opacity=".45"/>`).join('')
    const note = (x, y, c) => `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="1.9" transform="rotate(-20 ${x} ${y})" fill="${c}"/><line x1="${x + 2.4}" x2="${x + 2.4}" y1="${y - .5}" y2="${y - 9}" stroke="${c}" stroke-width="1"/>`
    return {
      width: w,
      height: h,
      svg: svg(w, h, staff + note(12, 13.5, p.accent) + note(30, 10.5, p.accent) + `<path d="M32.4 1.5 L50.4 0 V2 L32.4 3.5Z" fill="${p.accent2}"/>` + note(48, 7.5, p.accent2)),
    }
  },

  stars(p) {
    const w = 80
    const h = 14
    const spark = (x, y, s, c) => `<path d="M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s}Z" fill="${c}"/>`
    return {
      width: w,
      height: h,
      svg: svg(w, h,
        spark(10, 7, 5, p.accent) + `<circle cx="24" cy="4" r=".9" fill="${p.text}"/>` + spark(38, 9, 3, p.text) +
        `<circle cx="50" cy="11" r=".7" fill="${p.textMuted}"/>` + spark(62, 5, 4, p.accent2) + `<circle cx="74" cy="9" r=".9" fill="${p.text}"/>`),
    }
  },

  leaves(p) {
    const w = 56
    const h = 16
    const leaf = (x, y, flip, c) => `<path d="M${x} ${y} C${x + 3} ${y - 6 * flip} ${x + 10} ${y - 6 * flip} ${x + 12} ${y - 1 * flip} C${x + 8} ${y + 1 * flip} ${x + 3} ${y + 1 * flip} ${x} ${y}Z" fill="${c}"/>`
    return {
      width: w,
      height: h,
      svg: svg(w, h,
        `<path d="M0 8 C14 4 28 12 42 8 S56 8 56 8" fill="none" stroke="${p.accent}" stroke-width="1.2" opacity=".8"/>` +
        leaf(8, 7, 1, p.accent) + leaf(30, 9, -1, p.accent2) + `<circle cx="48" cy="6" r="1.4" fill="${p.accent2}"/>`),
    }
  },

  pixels(p) {
    const w = 48
    const h = 12
    const px = (x, y, c) => `<rect x="${x}" y="${y}" width="3" height="3" fill="${c}"/>`
    return {
      width: w,
      height: h,
      svg: svg(w, h,
        px(0, 6, p.accent) + px(3, 6, p.accent) + px(6, 3, p.accent) + px(9, 3, p.accent) + px(12, 6, p.accent) +
        px(24, 6, p.accent2) + px(27, 3, p.accent2) + px(30, 6, p.accent2) + px(33, 9, p.accent2) +
        px(42, 6, p.textMuted)),
    }
  },

  heartbeat(p) {
    const w = 96
    const h = 18
    return {
      width: w,
      height: h,
      svg: svg(w, h, `<path d="M0 10 H30 L33 7 L36 10 H40 L43 2 L47 16 L50 10 H58 L61 8 L64 10 H96" fill="none" stroke="${p.accent}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>`),
    }
  },

  dashes(p) {
    const w = 20
    const h = 6
    return { width: w, height: h, svg: svg(w, h, `<rect x="0" y="2" width="11" height="2" rx="1" fill="${p.accent}" opacity=".8"/><circle cx="15.5" cy="3" r="1" fill="${p.accent2}"/>`) }
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
