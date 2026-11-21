// Solmarina Cover Studio — editor wiring.
// Owns the page state, the live preview canvas, and every control:
// photo slots, demo photos, panel drag-to-crop, zoom, caption, colours,
// export sizes and the PNG download. Photos are read in the browser
// only and never uploaded anywhere.

import { SIZES, drawCover, renderCover, layoutFor, panelAt } from './cover.js';
import { SCENES, DEMO_PHOTOS, applyScene } from './shots.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  size: 'square',
  photos: [null, null, null],
  frames: [
    { ox: 0, oy: 0, zoom: 1 },
    { ox: 0, oy: 0, zoom: 1 },
    { ox: 0, oy: 0, zoom: 1 },
  ],
  fillAll: false,
  selected: 0,
  caption: 'SUNSET HEIST',
  subtitle: 'A SOLMARINA STORY',
  color: 'yellow',
};

const preview = $('#preview');
const pctx = preview.getContext('2d');
let currentLayout = null;

function setStatus(text) {
  $('#status').textContent = text;
}

function render() {
  const { w, h } = SIZES[state.size];
  if (preview.width !== w || preview.height !== h) {
    preview.width = w;
    preview.height = h;
  }
  // Re-clamp every crop against the current layout first, so switching
  // export sizes can never leave a photo short of its panel.
  const layout = layoutFor(w, h);
  for (let i = 0; i < 3; i++) clampFrame(i, layout);
  currentLayout = drawCover(pctx, w, h, state);
  const frame = state.frames[state.selected];
  $('#sizeLabel').textContent = `${SIZES[state.size].label} — panel ${state.selected + 1} selected`;
  $('#zoom').value = Math.round(frame.zoom * 100);
  $('#zoomVal').textContent = `${Math.round(frame.zoom * 100)}%`;
  $$('.size-btn').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  $$('.swatch').forEach((b) => b.classList.toggle('active', b.dataset.color === state.color));
}

// Keep a photo's crop offset inside the panel: the photo must always
// cover its panel, so the offset can never exceed the overhang.
function clampFrame(idx, layout) {
  const img = state.fillAll ? state.photos[0] : state.photos[idx];
  const lay = layout || currentLayout;
  if (!img || !lay) return;
  const rect = idx === 0 ? lay.hero : lay.small[idx - 1];
  const frame = state.frames[idx];
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * frame.zoom;
  const dw = img.naturalWidth * base;
  const dh = img.naturalHeight * base;
  const maxOx = Math.max(0, (dw - rect.w) / 2);
  const maxOy = Math.max(0, (dh - rect.h) / 2);
  frame.ox = Math.max(-maxOx, Math.min(maxOx, frame.ox));
  frame.oy = Math.max(-maxOy, Math.min(maxOy, frame.oy));
}

// Default crop for a freshly loaded photo: bias toward the top of the
// shot, where faces usually are, so a panel never opens on a headless
// torso when the photo is taller than the panel. 0.55 of the way to the
// top puts the subject's face in frame without losing the scene below.
function defaultFrame(img, rect) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const dh = img.naturalHeight * base;
  const maxOy = Math.max(0, (dh - rect.h) / 2);
  return { ox: 0, oy: Math.round(maxOy * 0.55), zoom: 1 };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function loadDemo() {
  setStatus('Loading demo photos…');
  try {
    const [boulevard, pier] = await Promise.all(DEMO_PHOTOS.map(loadImage));
    state.photos[0] = boulevard;
    state.photos[1] = pier;
    state.photos[2] = boulevard;
    const { w, h } = SIZES[state.size];
    const layout = layoutFor(w, h);
    state.frames = [
      defaultFrame(boulevard, layout.hero),
      defaultFrame(pier, layout.small[0]),
      defaultFrame(boulevard, layout.small[1]),
    ];
    render();
    setStatus('Demo photos loaded — click a panel, drag to crop, pick a size, export.');
  } catch (err) {
    setStatus('Could not load the demo photos.');
  }
}

// --- Photo slots (file inputs) -------------------------------------------
$$('input[type="file"][data-slot]').forEach((input) => {
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      loadImage(reader.result)
        .then((img) => {
          const slot = Number(input.dataset.slot);
          state.photos[slot] = img;
          const { w, h } = SIZES[state.size];
          const layout = layoutFor(w, h);
          const rect = slot === 0 ? layout.hero : layout.small[slot - 1];
          state.frames[slot] = defaultFrame(img, rect);
          state.selected = slot;
          render();
          setStatus(`Photo ${slot + 1} loaded into panel ${slot + 1}.`);
        })
        .catch(() => setStatus('That file could not be read as a photo.'));
    };
    reader.readAsDataURL(file);
  });
});

$('#demoBtn').addEventListener('click', loadDemo);

$('#fillAll').addEventListener('change', (ev) => {
  state.fillAll = ev.target.checked;
  render();
  setStatus(state.fillAll ? 'One photo fills all three panels.' : 'Each panel uses its own photo.');
});

// --- Panel select + drag to crop ------------------------------------------
function canvasPoint(ev) {
  const r = preview.getBoundingClientRect();
  return {
    x: (ev.clientX - r.left) * (preview.width / r.width),
    y: (ev.clientY - r.top) * (preview.height / r.height),
  };
}

let drag = null;
preview.addEventListener('pointerdown', (ev) => {
  const p = canvasPoint(ev);
  const idx = panelAt(currentLayout, p.x, p.y);
  if (idx < 0) return;
  state.selected = idx;
  drag = { x: p.x, y: p.y };
  preview.setPointerCapture(ev.pointerId);
  render();
});
preview.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const p = canvasPoint(ev);
  const frame = state.frames[state.selected];
  frame.ox += p.x - drag.x;
  frame.oy += p.y - drag.y;
  clampFrame(state.selected, currentLayout);
  drag.x = p.x;
  drag.y = p.y;
  render();
});
preview.addEventListener('pointerup', () => {
  drag = null;
});
preview.addEventListener('pointercancel', () => {
  drag = null;
});

// --- Zoom (selected panel) -------------------------------------------------
$('#zoom').addEventListener('input', (ev) => {
  const frame = state.frames[state.selected];
  frame.zoom = Number(ev.target.value) / 100;
  clampFrame(state.selected, currentLayout);
  render();
});

// --- Size, caption, colour --------------------------------------------------
$$('.size-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.size = btn.dataset.size;
    render();
    setStatus(`Export size: ${SIZES[state.size].label}.`);
  });
});

$('#caption').addEventListener('input', (ev) => {
  state.caption = ev.target.value;
  render();
});
$('#subtitle').addEventListener('input', (ev) => {
  state.subtitle = ev.target.value;
  render();
});
$$('.swatch').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.color = btn.dataset.color;
    render();
  });
});

// --- Export -----------------------------------------------------------------
async function exportPNG() {
  setStatus('Rendering PNG…');
  await document.fonts.ready;
  const canvas = renderCover(state.size, state);
  const { w, h } = SIZES[state.size];
  canvas.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed — please try again.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solmarina-cover-${w}x${h}.png`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    setStatus(`Saved solmarina-cover-${w}x${h}.png`);
  }, 'image/png');
}

$('#exportBtn').addEventListener('click', exportPNG);

// --- Start -------------------------------------------------------------------
// ?scene=sunset|queen|tide picks a ready-made cover; ?demo=1 loads the
// demo photos straight away (used for the screenshots).
const params = new URLSearchParams(location.search);
if (params.get('scene')) applyScene(state, params.get('scene'));
$('#caption').value = state.caption;
$('#subtitle').value = state.subtitle;

if (document.fonts && document.fonts.load) {
  document.fonts.load('100px Anton').then(render).catch(render);
  document.fonts.ready.then(render);
}
if (params.get('demo') === '1') {
  loadDemo();
} else {
  render();
}

// Small test handle for the automated checks (not part of the UI).
window.__solmarina = {
  state,
  render,
  exportPNG,
  loadDemo,
  pngDataURL: async () => {
    await document.fonts.ready;
    return renderCover(state.size, state).toDataURL('image/png');
  },
};
