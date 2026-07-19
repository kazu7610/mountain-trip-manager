/* =========================================
   ポンコツ倶楽部 山行管理
   Service Worker
========================================= */

const CACHE_NAME =
  "mountain-trip-manager-v2";

const APP_FILES = [
  "./",
  "./index.html",
  "./login.html",
  "./trip-form.html",
  "./trip-detail.html",
  "./admin.html",
  "./portal-auth.js",
  "./index.js",
  "./trip-form.js",
  "./trip-detail.js",
  "./admin.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

/* =========================================
   アプリ本体をキャッシュ
========================================= */

self.addEventListener(
  "install",
  (event) => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then(
          (cache) =>
            cache.addAll(APP_FILES)
        )
    );

    self.skipWaiting();
  }
);

/* =========================================
   古いキャッシュを削除
========================================= */

self.addEventListener(
  "activate",
  (event) => {
    event.waitUntil(
      caches
        .keys()
        .then(
          (cacheNames) =>
            Promise.all(
              cacheNames
                .filter(
                  (cacheName) =>
                    cacheName !==
                    CACHE_NAME
                )
                .map(
                  (cacheName) =>
                    caches.delete(
                      cacheName
                    )
                )
            )
        )
    );

    self.clients.claim();
  }
);

/* =========================================
   同じサイト内の静的ファイルだけキャッシュ
========================================= */

self.addEventListener(
  "fetch",
  (event) => {
    const request =
      event.request;

    if (
      request.method !== "GET"
    ) {
      return;
    }

    const requestUrl =
      new URL(request.url);

    /*
     * Supabaseなど外部通信は
     * キャッシュせず通常通信する
     */
    if (
      requestUrl.origin !==
      self.location.origin
    ) {
      return;
    }

    event.respondWith(
      fetch(request)
        .then(
          (response) => {
            if (
              response.ok
            ) {
              const responseCopy =
                response.clone();

              caches
                .open(CACHE_NAME)
                .then(
                  (cache) =>
                    cache.put(
                      request,
                      responseCopy
                    )
                );
            }

            return response;
          }
        )
        .catch(
          () =>
            caches.match(request)
        )
    );
  }
);