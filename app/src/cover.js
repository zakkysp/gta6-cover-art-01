// Solmarina Cover Studio — the cover renderer.
// Pure canvas 2D, no dependencies. One function draws the whole poster
// (board, wordmark, three graded photo panels, caption band) at any size.

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 × 1350' },
  wide: { w: 1920, h: 1080, label: 'Wide 1920 × 1080' },
};

export const SCENE_COLORS = {
  white: '#ffffff',
  pink: '#ff5fa2',
  yellow: '#ffc93c',
};

const NAVY = '#1d1530';
const CREAM = '#f6ead1';
const BOARD = '#f2e3c2';

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Every rect the poster needs, derived from the canvas size alone.
export function layoutFor(w, h) {
  const pad = Math.round(0.04 * w);
  const top = Math.round(0.035 * h);
  const gap = Math.round(0.018 * h);
  const markH = Math.round(0.085 * h);
  const heroH = Math.round(0.46 * h);
  const smallH = Math.round(0.185 * h);
  const hero = { x: pad, y: top + markH + gap, w: w - 2 * pad, h: heroH };
  const smallW = Math.round((w - 2 * pad - gap) / 2);
  const smallY = hero.y + hero.h + gap;
  const small = [
    { x: pad, y: smallY, w: smallW, h: smallH },
    { x: pad + smallW + gap, y: smallY, w: smallW, h: smallH },
  ];
  const bandY = smallY + smallH + gap;
  const band = { x: pad, y: bandY, w: w - 2 * pad, h: h - bandY - pad };
  return { pad, top, gap, markH, hero, small, band };
}

// Cover-fit placement for one photo inside one panel, with the user's
// crop offset (ox/oy, canvas pixels) and zoom applied on top.
function coverFit(img, rect, frame) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const s = base * (frame && frame.zoom ? frame.zoom : 1);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  const ox = frame && frame.ox ? frame.ox : 0;
  const oy = frame && frame.oy ? frame.oy : 0;
  return {
    dx: rect.x + (rect.w - dw) / 2 + ox,
    dy: rect.y + (rect.h - dh) / 2 + oy,
    dw,
    dh,
  };
}

function drawPhoto(ctx, img, rect, frame) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (img) {
    const f = coverFit(img, rect, frame);
    ctx.filter = 'saturate(1.35) contrast(1.06) brightness(1.02)';
    ctx.drawImage(img, f.dx, f.dy, f.dw, f.dh);
    ctx.filter = 'none';
    // Vice City sunset grade: warm orange melting into magenta, laid over
    // the photo so every panel shares the same golden-hour light.
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w * 0.7, rect.y + rect.h);
    g.addColorStop(0, 'rgba(255, 122, 26, 0.22)');
    g.addColorStop(0.55, 'rgba(255, 45, 120, 0.15)');
    g.addColorStop(1, 'rgba(120, 40, 180, 0.17)');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'source-over';
    // Vignette: darkened corners pull the eye to the middle of the shot.
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const v = ctx.createRadialGradient(
      cx, cy, Math.min(rect.w, rect.h) * 0.35,
      cx, cy, Math.max(rect.w, rect.h) * 0.72,
    );
    v.addColorStop(0, 'rgba(24, 4, 40, 0)');
    v.addColorStop(1, 'rgba(24, 4, 40, 0.38)');
    ctx.fillStyle = v;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else {
    // Empty slot: a dark panel that invites a photo.
    ctx.fillStyle = '#241b3a';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = 'rgba(246, 234, 209, 0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(rect.x + 10, rect.y + 10, rect.w - 20, rect.h - 20);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(246, 234, 209, 0.85)';
    ctx.font = `600 ${Math.max(16, Math.round(rect.h * 0.13))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
  }
  ctx.restore();
  // Panel frame.
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = Math.max(3, Math.round(rect.w * 0.004));
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
}

function drawWordmark(ctx, w, layout) {
  const { top, markH } = layout;
  const cy = top + markH / 2;
  const text = 'SOLMARINA';
  const fontPx = Math.round(markH * 0.62);
  ctx.font = `${fontPx}px Anton, 'Arial Black', sans-serif`;
  const textW = ctx.measureText(text).width;
  const sunR = Math.round(fontPx * 0.42);
  const gapX = Math.round(fontPx * 0.28);
  const chipPad = Math.round(fontPx * 0.34);
  // The chip is measured from the real text width, so it hugs the sun
  // and the wordmark exactly at every export size.
  const chipW = chipPad * 2 + sunR * 2 + gapX + textW;
  const chipH = markH;
  const chipX = Math.round((w - chipW) / 2);
  roundRectPath(ctx, chipX, top, chipW, chipH, Math.round(chipH * 0.22));
  ctx.fillStyle = NAVY;
  ctx.fill();
  // Sun: a gradient disc with eight rays.
  const sx = chipX + chipPad + sunR;
  const sg = ctx.createLinearGradient(sx - sunR, cy - sunR, sx + sunR, cy + sunR);
  sg.addColorStop(0, '#ffd94d');
  sg.addColorStop(1, '#ff7a1a');
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = Math.max(2, Math.round(fontPx * 0.05));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(a) * (sunR + 3), cy + Math.sin(a) * (sunR + 3));
    ctx.lineTo(
      sx + Math.cos(a) * (sunR + Math.round(fontPx * 0.16)),
      cy + Math.sin(a) * (sunR + Math.round(fontPx * 0.16)),
    );
    ctx.stroke();
  }
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sx, cy, sunR, 0, Math.PI * 2);
  ctx.fill();
  // Wordmark text.
  ctx.fillStyle = CREAM;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, chipX + chipPad + sunR * 2 + gapX, cy + Math.round(fontPx * 0.04));
}

function drawCaptionBand(ctx, layout, state) {
  const { band } = layout;
  roundRectPath(ctx, band.x, band.y, band.w, band.h, Math.round(band.h * 0.08));
  ctx.fillStyle = NAVY;
  ctx.fill();
  // Neon rule: hot pink melting into sun yellow, across the band.
  const ruleH = Math.max(4, Math.round(band.h * 0.045));
  const rg = ctx.createLinearGradient(band.x, 0, band.x + band.w, 0);
  rg.addColorStop(0, '#ff2d78');
  rg.addColorStop(1, '#ffc93c');
  ctx.fillStyle = rg;
  ctx.fillRect(
    band.x + Math.round(band.w * 0.04),
    band.y + Math.round(band.h * 0.1),
    band.w - Math.round(band.w * 0.08),
    ruleH,
  );
  // Caption, shrunk until it fits the band.
  const availW = band.w - Math.round(band.w * 0.08);
  let capPx = Math.round(band.h * 0.42);
  ctx.font = `${capPx}px Anton, 'Arial Black', sans-serif`;
  while (ctx.measureText(state.caption || ' ').width > availW && capPx > 20) {
    capPx -= 2;
    ctx.font = `${capPx}px Anton, 'Arial Black', sans-serif`;
  }
  ctx.fillStyle = SCENE_COLORS[state.color] || '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.caption || '', band.x + band.w / 2, band.y + band.h * 0.48);
  // Subtitle, smaller and quieter.
  const subPx = Math.max(14, Math.round(band.h * 0.16));
  ctx.font = `600 ${subPx}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(246, 234, 209, 0.85)';
  ctx.fillText((state.subtitle || '').toUpperCase(), band.x + band.w / 2, band.y + band.h * 0.82);
}

// Draw the whole poster onto ctx at exactly w × h pixels.
// state: { photos[3], frames[3], fillAll, caption, subtitle, color }.
export function drawCover(ctx, w, h, state) {
  const layout = layoutFor(w, h);
  ctx.fillStyle = BOARD;
  ctx.fillRect(0, 0, w, h);
  drawWordmark(ctx, w, layout);
  const photos = state.fillAll
    ? [state.photos[0], state.photos[0], state.photos[0]]
    : state.photos;
  drawPhoto(ctx, photos[0], layout.hero, state.frames[0]);
  drawPhoto(ctx, photos[1], layout.small[0], state.frames[1]);
  drawPhoto(ctx, photos[2], layout.small[1], state.frames[2]);
  drawCaptionBand(ctx, layout, state);
  return layout;
}

// Render the poster off-screen at one of the export sizes.
export function renderCover(sizeKey, state) {
  const { w, h } = SIZES[sizeKey];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, w, h, state);
  return canvas;
}

// Which panel (0 = hero, 1–2 = small panels) holds canvas point x, y?
// Returns -1 when the point is on the board, not on a photo.
export function panelAt(layout, x, y) {
  const hero = layout.hero;
  if (x >= hero.x && x <= hero.x + hero.w && y >= hero.y && y <= hero.y + hero.h) return 0;
  for (let i = 0; i < 2; i++) {
    const r = layout.small[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return 1 + i;
  }
  return -1;
}
