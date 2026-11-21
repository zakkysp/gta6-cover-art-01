// Wires Solmarina Cover Studio: photo slots, panel crop-and-position,
// caption and grade controls, size picker, and PNG export. Photos are read
// on the person's own machine and never uploaded. A `?shot=` query sets up
// a fixed scene for a screenshot instead (./shots.js).
import { drawCover, layoutFor, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const statusEl = document.getElementById('status');
const gradeInput = document.getElementById('grade');
const zoomInput = document.getElementById('zoom');
const onePhotoBox = document.getElementById('one-photo');

const state = {
  sizeKey: 'square',
  photos: [null, null, null],
  offsets: [{ x: 0, y: 0, zoom: 1 }, { x: 0, y: 0, zoom: 1 }, { x: 0, y: 0, zoom: 1 }],
  caption: captionInput.value,
  subtitle: subtitleInput.value,
  color: '#ffffff',
  grade: gradeInput.value / 100,
  onePhoto: false,
};
let selected = 0;

function redraw(highlight = true) {
  drawCover(canvas, state, highlight ? selected : -1);
  zoomInput.value = Math.round(state.offsets[selected].zoom * 100);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}

function panelAt(p) {
  const L = layoutFor(state.sizeKey);
  return L.panels.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
}

// Click a panel to select it; drag to pan its photo.
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = panelAt(p);
  if (i < 0) return;
  selected = i;
  drag = { x: p.x, y: p.y, ox: state.offsets[i].x, oy: state.offsets[i].y };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  state.offsets[selected].x = drag.ox + (p.x - drag.x);
  state.offsets[selected].y = drag.oy + (p.y - drag.y);
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

function bindPhotoSlot(i) {
  document.getElementById(`photo-${i}`).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    state.photos[i] = await loadImage(URL.createObjectURL(file));
    state.offsets[i] = { x: 0, y: 0, zoom: 1 };
    selected = i;
    redraw();
  });
}
[0, 1, 2].forEach(bindPhotoSlot);

// Default framing per sample photo: both demo photos are tall shots whose
// subject sits near the top, so nudge them down and the face stays in frame.
function frameFor(sample) {
  return sample === 'boulevard' ? { x: 0, y: 140, zoom: 1 } : { x: 0, y: 60, zoom: 1 };
}

document.getElementById('demo').addEventListener('click', async () => {
  state.photos[0] = await loadImage('samples/boulevard.jpg');
  state.photos[1] = await loadImage('samples/pier.jpg');
  state.photos[2] = await loadImage('samples/boulevard.jpg');
  state.offsets = [frameFor('boulevard'), frameFor('pier'), frameFor('boulevard')];
  redraw();
  statusEl.textContent = 'Demo photos loaded — click a panel, then drag to crop it.';
});

onePhotoBox.addEventListener('change', () => { state.onePhoto = onePhotoBox.checked; redraw(); });
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
gradeInput.addEventListener('input', () => { state.grade = gradeInput.value / 100; redraw(); });
zoomInput.addEventListener('input', () => {
  state.offsets[selected].zoom = zoomInput.value / 100;
  redraw();
});

document.querySelectorAll('.swatch').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.swatch').forEach((x) => x.classList.remove('is-active'));
    b.classList.add('is-active');
    state.color = b.dataset.color;
    redraw();
  });
});

document.querySelectorAll('.size-btn').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.size-btn').forEach((x) => x.classList.remove('is-active'));
    b.classList.add('is-active');
    state.sizeKey = b.dataset.size;
    redraw();
  });
});

document.getElementById('export').addEventListener('click', () => {
  drawCover(canvas, state, -1); // export without the selection outline
  const size = SIZES[state.sizeKey];
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `solmarina-cover-${size.w}x${size.h}.png`;
    a.click();
    statusEl.textContent = `Saved solmarina-cover-${size.w}x${size.h}.png`;
    redraw();
  }, 'image/png');
});

// Wait for Anton before the first paint so the canvas lettering uses it.
async function boot() {
  try {
    await document.fonts.load('80px Anton');
    await document.fonts.ready;
  } catch (e) { /* fall back to the system sans-serif */ }
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (shot) {
    await runShot(shot, q, async (sample, text, sizeKey) => {
      if (sizeKey) {
        state.sizeKey = sizeKey;
        document.querySelectorAll('.size-btn').forEach((x) => x.classList.toggle('is-active', x.dataset.size === sizeKey));
      }
      const other = sample === 'pier' ? 'boulevard' : 'pier';
      state.photos[0] = await loadImage(`samples/${sample}.jpg`);
      state.photos[1] = await loadImage(`samples/${other}.jpg`);
      state.photos[2] = await loadImage(`samples/${sample}.jpg`);
      state.offsets = [frameFor(sample), frameFor(other), frameFor(sample)];
      state.caption = text;
      captionInput.value = text;
      redraw(false);
    });
  } else {
    redraw();
  }
}
boot();
