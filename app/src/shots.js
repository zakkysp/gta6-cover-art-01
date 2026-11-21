// Fixed scenes for screenshots: ?shot=editor shows the page with demo
// photos loaded; ?shot=cover shows the cover alone, edge to edge. `photo`
// picks the hero sample (samples/<photo>.jpg), `caption` the words, `size`
// the post size (square, portrait or wide). window.__shotReady is set once
// the scene has painted.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await load(
    query.get('photo') ?? 'pier',
    query.get('caption') ?? 'Sunset Heist',
    query.get('size') ?? 'square',
  );
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
