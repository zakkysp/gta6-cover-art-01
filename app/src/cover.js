// Draws a GTA-style multi-panel poster cover for the fictional coastal city
// of Solmarina: three photo panels on a cream poster board, a Vice City
// sunset grade over every photo, and a bold Anton caption band along the
// foot. All drawing is plain canvas 2D; the only font is Anton (OFL).

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  wide: { w: 1920, h: 1080, label: '1920 × 1080' },
};

const CREAM = '#f5efe4';
const BAND = '#1c1030';
const PINK = '#ff5ea8';
const YELLOW = '#ffd23f';

/** Panel rectangles for a size, in export pixels. panels[0] is the hero. */
export function layoutFor(sizeKey) {
  const { w, h } = SIZES[sizeKey];
  const g = Math.round(w * 0.011); // gutter, scales with width
  if (sizeKey === 'wide') {
    const heroW = Math.round(w * 0.604);
    const colX = g + heroW + g;
    const colW = w - colX - g;
    const colH = Math.round((h - 3 * g - bandH(w)) / 2);
    return {
      w, h, g,
      panels: [
        { x: g, y: g, w: heroW, h: h - 2 * g - bandH(w) },
        { x: colX, y: g, w: colW, h: colH },
        { x: colX, y: g + colH + g, w: colW, h: colH },
      ],
      caption: { x: 0, y: h - g - bandH(w), w, h: bandH(w) },
    };
  }
  // square + portrait: hero on top, two panels below, caption band at foot.
  const heroH = sizeKey === 'portrait' ? Math.round(h * 0.459) : Math.round(h * 0.519);
  const midH = Math.round(h * 0.252);
  const halfW = Math.round((w - 3 * g) / 2);
  const capY = g + heroH + g + midH + g;
  return {
    w, h, g,
    panels: [
      { x: g, y: g, w: w - 2 * g, h: heroH },
      { x: g, y: g + heroH + g, w: halfW, h: midH },
      { x: g + halfW + g, y: g + heroH + g, w: halfW, h: midH },
    ],
    caption: { x: 0, y: capY, w, h: h - capY - g },
  };
}

function bandH(w) { return Math.round(w * 0.148); }

/** Draws one photo cover-fit into a panel, with pan (ox, oy) and zoom. */
function drawPhoto(ctx, img, rect, off) {
  const zoom = off?.zoom ?? 1;
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * base;
  const ph = img.naturalHeight * base;
  const cx = rect.x + rect.w / 2 + (off?.x ?? 0);
  const cy = rect.y + rect.h / 2 + (off?.y ?? 0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = 'saturate(1.3) contrast(1.06)';
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.restore();
}

/** The sunset grade: warm orange rising from the bottom, magenta in the
 *  corners, and a soft vignette. `strength` is 0..1. */
function sunsetGrade(ctx, rect, strength) {
  if (strength <= 0) return;
  const { x, y, w, h } = rect;
  const warm = ctx.createLinearGradient(0, y + h * 0.25, 0, y + h);
  warm.addColorStop(0, 'rgba(255, 122, 60, 0)');
  warm.addColorStop(0.65, `rgba(255, 90, 50, ${0.22 * strength})`);
  warm.addColorStop(1, `rgba(214, 38, 120, ${0.42 * strength})`);
  ctx.fillStyle = warm;
  ctx.fillRect(x, y, w, h);
  const top = ctx.createLinearGradient(0, y, 0, y + h * 0.4);
  top.addColorStop(0, `rgba(255, 190, 90, ${0.16 * strength})`);
  top.addColorStop(1, 'rgba(255, 190, 90, 0)');
  ctx.fillStyle = top;
  ctx.fillRect(x, y, w, h * 0.4);
  const vig = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.42,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(16, 6, 28, 0)');
  vig.addColorStop(1, `rgba(16, 6, 28, ${0.34 * strength})`);
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);
}

function emptyPanel(ctx, rect) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  grad.addColorStop(0, '#3a2440');
  grad.addColorStop(1, '#241a33');
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(245, 239, 228, 0.55)';
  ctx.font = `${Math.round(rect.h * 0.09)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ADD PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.textBaseline = 'alphabetic';
}

/** A small setting sun: disc with rays, drawn in the caption colour. */
function drawSun(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r * 1.35);
    ctx.lineTo(cx + Math.cos(a) * r * 1.7, cy + Math.sin(a) * r * 1.7);
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function fitFont(ctx, text, maxW, startSize, family) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

/** Draws the whole cover. `state` holds sizeKey, photos[3], offsets[3],
 *  caption, subtitle, color, grade (0..1) and onePhoto. `highlight` is the
 *  index of the panel to outline in the editor preview, or -1 for export. */
export function drawCover(canvas, state, highlight = -1) {
  const ctx = canvas.getContext('2d');
  const L = layoutFor(state.sizeKey);
  const { w, h } = L;
  canvas.width = w;
  canvas.height = h;

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, w, h);

  const photos = state.onePhoto
    ? [state.photos[0], state.photos[0], state.photos[0]]
    : state.photos;
  L.panels.forEach((rect, i) => {
    const img = photos[i];
    if (img) {
      drawPhoto(ctx, img, rect, state.offsets[i]);
      sunsetGrade(ctx, rect, state.grade);
    } else {
      emptyPanel(ctx, rect);
    }
    ctx.strokeStyle = 'rgba(23, 18, 31, 0.85)';
    ctx.lineWidth = Math.max(2, w * 0.002);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    if (i === highlight) {
      ctx.strokeStyle = PINK;
      ctx.lineWidth = Math.max(4, w * 0.005);
      ctx.strokeRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6);
    }
  });

  // Wordmark over the hero panel: sun + SOLMARINA. The chip is measured
  // from the real text width, so it hugs the wordmark at every size.
  const hero = L.panels[0];
  const wmSize = Math.round(w * 0.026);
  const wmPad = wmSize * 0.55;
  ctx.save();
  ctx.font = `${wmSize}px Anton, sans-serif`;
  const textW = ctx.measureText('SOLMARINA').width;
  const chipX = hero.x + w * 0.014;
  const chipY = hero.y + w * 0.014;
  const wmH = wmSize * 1.9;
  const wmW = wmPad + wmSize * 1.1 + textW + wmPad;
  ctx.fillStyle = 'rgba(23, 18, 31, 0.55)';
  ctx.fillRect(chipX, chipY, wmW, wmH);
  drawSun(ctx, chipX + wmPad + wmSize * 0.42, chipY + wmH / 2, wmSize * 0.42, YELLOW);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('SOLMARINA', chipX + wmPad + wmSize * 1.1, chipY + wmH / 2 + 1);
  ctx.restore();

  // Caption band: neon rule, big caption, subtitle.
  const cap = L.caption;
  ctx.fillStyle = BAND;
  ctx.fillRect(cap.x, cap.y, cap.w, cap.h);
  const rule = ctx.createLinearGradient(cap.x, 0, cap.x + cap.w, 0);
  rule.addColorStop(0, PINK);
  rule.addColorStop(0.5, '#ff7a3d');
  rule.addColorStop(1, YELLOW);
  ctx.fillStyle = rule;
  ctx.fillRect(cap.x, cap.y, cap.w, Math.max(4, w * 0.005));

  const text = (state.caption || '').trim().toUpperCase();
  const pad = w * 0.035;
  const subSize = Math.round(w * 0.02);
  if (text) {
    const size = fitFont(ctx, text, cap.w - 2 * pad, Math.round(cap.h * 0.52), 'Anton, sans-serif');
    ctx.fillStyle = state.color || '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    try { ctx.letterSpacing = '1px'; } catch (e) { /* older canvas: no letter-spacing */ }
    const ty = cap.y + cap.h * 0.52 + size * 0.32;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.04;
    ctx.fillText(text, cap.x + pad, ty);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    try { ctx.letterSpacing = '0px'; } catch (e) { /* ignore */ }
  }
  const sub = (state.subtitle || '').trim().toUpperCase();
  if (sub) {
    ctx.fillStyle = 'rgba(245, 239, 228, 0.75)';
    ctx.font = `600 ${subSize}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(sub, cap.x + pad, cap.y + cap.h - cap.h * 0.16);
  }
  const tag = 'SOLMARINA · VICE COAST';
  ctx.fillStyle = 'rgba(245, 239, 228, 0.55)';
  ctx.font = `600 ${Math.round(subSize * 0.85)}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(tag, cap.x + cap.w - pad, cap.y + cap.h - cap.h * 0.16);
}
