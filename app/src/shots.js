// Solmarina Cover Studio — demo scenes.
// A scene is one ready-made cover: export size, caption, subtitle and
// caption colour. The editor applies one from a ?scene= URL parameter,
// which is also how the screenshots are driven.

export const SCENES = {
  sunset: {
    size: 'square',
    caption: 'SUNSET HEIST',
    subtitle: 'A SOLMARINA STORY',
    color: 'yellow',
  },
  queen: {
    size: 'portrait',
    caption: 'BOULEVARD QUEEN',
    subtitle: 'SOLMARINA AFTER DARK',
    color: 'pink',
  },
  tide: {
    size: 'wide',
    caption: 'NEON TIDE',
    subtitle: 'THE HARBOUR NEVER SLEEPS',
    color: 'white',
  },
};

// The two kit sample photos (AI-made, free to use) the "Load demo photos"
// button fills the panels with.
export const DEMO_PHOTOS = ['samples/boulevard.jpg', 'samples/pier.jpg'];

// Copy a scene's fields into the editor state. Returns false for an
// unknown scene name so a bad URL parameter is ignored, not fatal.
export function applyScene(state, name) {
  const scene = SCENES[name];
  if (!scene) return false;
  state.size = scene.size;
  state.caption = scene.caption;
  state.subtitle = scene.subtitle;
  state.color = scene.color;
  return true;
}
