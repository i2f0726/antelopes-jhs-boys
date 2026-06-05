// ===================================================================
// Antelopes Dashboard Service Worker
// 目的: iOS PWAの「アプリ削除→再インストール」問題を解決
// 戦略: Network First（常に最新を取りに行き、失敗時のみキャッシュ）
// ===================================================================

// バージョン番号: index.htmlを更新したらこの数字を上げる
const CACHE_VERSION = '2026-06-05-1526';
const CACHE_NAME = `antelopes-${CACHE_VERSION}`;

// オフライン時にも見られるようにキャッシュするファイル
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json'
];

// ========== FCM設定 ==========
// firebase-messaging-sw.js の代わりにこのSWでFCMを処理する
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCPpFsN2deoRQ3JckTbJ4yg3SptIVJtf-E",
  authDomain: "antelopes-hs-dashboard.firebaseapp.com",
  projectId: "antelopes-hs-dashboard",
  storageBucket: "antelopes-hs-dashboard.firebasestorage.app",
  messagingSenderId: "929985303695",
  appId: "1:929985303695:web:f51d460d45f290d4eb4cfa"
});

const messaging = firebase.messaging();

// バックグラウンド通知受信
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] バックグラウンド通知受信:', payload);
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'アンテロープス', {
    body: body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: '/' }
  });
});

// 通知タップで画面を開く
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

// ---------- インストール: 初回キャッシュ ----------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ---------- アクティベート: 古いキャッシュを削除 ----------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('antelopes-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ---------- フェッチ: Network First戦略 ----------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((response) => {
        if (response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, cloned));
        }
        return response;
      })
      .catch(() => {
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// ---------- メッセージ: ページ側からの即時更新指示を受け取る ----------
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
