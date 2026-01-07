/* public/sw.js — Buzz click => focus/open the right tab */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url || '/';
  const target = new URL(rawUrl, self.location.origin).toString();

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    // 1) Exact match? focus it.
    const exact = clients.find(c => c.url === target);
    if (exact) { await exact.focus(); return; }

    // 2) Same-origin? pick one, focus + navigate if needed.
    const sameOrigin = clients.find(c => {
      try { return new URL(c.url).origin === self.location.origin; } catch { return false; }
    });
    if (sameOrigin) {
      await sameOrigin.focus();
      if (sameOrigin.url !== target) sameOrigin.navigate(target);
      return;
    }

    // 3) No tab? open new one.
    await self.clients.openWindow(target);
  })());
});

// keep SW alive/controlled
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
