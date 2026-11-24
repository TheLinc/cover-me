async (page) => {
  const OUT = 'F:/worktrees/cover-me/t3-25b2dc1d/.proof/shots/';
  const VERSIONS = [['before', 'http://localhost:3218'], ['after', 'http://localhost:3217']];
  const STEPS = [
    { name: 'hero-badge', path: '/', sel: 'a[href="/changelog"]', glyph: '→' },
    { name: 'auth-link', path: '/auth', sel: 'p:has(button:has-text("Create one free"))', glyph: '→' },
    { name: 'terms-bullets', path: '/terms', sel: 'ul:has(li:has-text("BYOK"))', glyph: '→' },
    { name: 'privacy-provider-link', path: '/privacy', sel: 'div:has(> a:has-text("Privacy Policy"))', glyph: '↗' },
    { name: 'guide-back-link', path: '/guides/chatgpt-resume-prompts', sel: 'article header a[href="/guides"]', glyph: '←' },
    { name: 'uninstall-privacy-facts', path: '/uninstalled', sel: 'ul:has(li:has-text("With your own API key"))', glyph: '→', submit: true },
  ];
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route(/posthog|ingest\./, (r) => r.abort());
  const failures = [];
  for (const [label, base] of VERSIONS) {
    for (const [i, s] of STEPS.entries()) {
      await page.goto(base + s.path, { waitUntil: 'networkidle', timeout: 180000 });
      if (s.submit) {
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() });
        await page.reload({ waitUntil: 'networkidle' });
        await page.getByLabel('Privacy concerns').check();
        await page.getByRole('button', { name: /send|submit/i }).click();
      }
      const el = page.locator(s.sel).first();
      await el.waitFor({ timeout: 20000 });
      await el.scrollIntoViewIfNeeded();
      const text = await el.innerText();
      const hasGlyph = text.includes(s.glyph);
      if (label === 'before' && !hasGlyph) failures.push(`${label} ${s.name}: expected ${s.glyph}`);
      if (label === 'after' && (hasGlyph || (await el.locator('svg').count()) === 0)) failures.push(`${label} ${s.name}: expected an svg icon, no ${s.glyph}`);
      const b = await el.boundingBox();
      const pad = 12;
      await page.screenshot({
        path: `${OUT}${label}-${i + 1}-${s.name}.png`,
        clip: { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad), width: Math.min(b.width, 760) + pad * 2, height: Math.min(b.height, 240) + pad * 2 },
      });
    }
  }
  if (failures.length) throw new Error(failures.join('\n'));
  return 'all assertions passed';
}
