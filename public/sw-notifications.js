/* Foco — extensão do service worker (carregada via workbox importScripts).
   Ao tocar numa notificação, foca a aba do Foco já aberta ou abre uma nova. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          client.postMessage({ type: 'foco:notification-click', tag: event.notification.tag })
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
