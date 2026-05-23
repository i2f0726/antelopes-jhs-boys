// ===================================================================
// Antelopes Dashboard Service Worker
// 目的: iOS PWAの「アプリ削除→再インストール」問題を解決
// 戦略: Network First（常に最新を取りに行き、失敗時のみキャッシュ）
// ===================================================================

// バージョン番号: index.htmlを更新したらこの数字を上げる
// （これだけで全ユーザーが自動的に最新版になります）
const CACHE_VERSION = '2026-05-23-2016';
const CACHE_NAME = `antelopes-${CACHE_VERSION}`;

// オフライン時にも見られるようにキャッシュするファイル
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json'
];

// ---------- インストール: 初回キャッシュ ----------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // 古いSWを即座に置き換え
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
    }).then(() => self.clients.claim()) // 開いているページも即座に新SWの管理下に
  );
});

// ---------- フェッチ: Network First戦略 ----------
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // GET以外（POST等）はキャッシュしない
  if (req.method !== 'GET') return;

  // 同一オリジンのみ対象
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((response) => {
        // 成功したらキャッシュも更新（次回のオフライン用）
        if (response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, cloned));
        }
        return response;
      })
      .catch(() => {
        // ネット失敗 → キャッシュから返す（オフライン対応）
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          // キャッシュにもない場合はindex.htmlを返す（SPA的なフォールバック）
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
