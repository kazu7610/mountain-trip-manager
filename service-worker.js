/* =========================================
   ポンコツ倶楽部 山行管理
   Service Worker
========================================= */

const CACHE_NAME =
  "mountain-trip-manager-v3";

const APP_FILES = [
  "./",
  "./index.html",
  "./login.html",
  "./trip-form.html",
  "./trip-detail.html",
  "./admin.html",
  "./portal-auth.js",
  "./push-notifications.js",
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
      request.method !==
      "GET"
    ) {
      return;
    }

    const requestUrl =
      new URL(request.url);

    /*
     * Supabaseなどの外部通信は
     * キャッシュしない
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
            if (response.ok) {
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

/* =========================================
   Push通知を受信
========================================= */

self.addEventListener(
  "push",
  (event) => {
    let data = {
      title:
        "山行管理",

      body:
        "新しいお知らせがあります。",

      url:
        "./index.html",

      badge:
        1
    };

    if (event.data) {
      try {
        data = {
          ...data,
          ...event.data.json()
        };

      } catch (error) {
        data.body =
          event.data.text();
      }
    }

    const badgeCount =
      Math.max(
        1,
        Number(
          data.badge || 1
        )
      );

    const notificationOptions = {
      body:
        data.body,

      icon:
        "./icons/icon-192.png",

      badge:
        "./icons/icon-192.png",

      tag:
        "mountain-trip-notification",

      renotify:
        true,

      data: {
        url:
          data.url ||
          "./index.html"
      }
    };

    event.waitUntil(
      Promise.all([
        self.registration
          .showNotification(
            data.title ||
            "山行管理",
            notificationOptions
          ),

        setApplicationBadge(
          badgeCount
        )
      ])
    );
  }
);

/* =========================================
   通知を押したとき
========================================= */

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const targetUrl =
      new URL(
        event.notification
          .data?.url ||
        "./index.html",
        self.location.origin
      ).href;

    event.waitUntil(
      Promise.all([
        clearApplicationBadge(),

        clients
          .matchAll({
            type:
              "window",

            includeUncontrolled:
              true
          })
          .then(
            (clientList) => {
              for (
                const client of
                clientList
              ) {
                if (
                  "focus" in client
                ) {
                  client.navigate(
                    targetUrl
                  );

                  return client.focus();
                }
              }

              if (
                clients.openWindow
              ) {
                return clients
                  .openWindow(
                    targetUrl
                  );
              }

              return null;
            }
          )
      ])
    );
  }
);

/* =========================================
   アプリアイコンへバッジを設定
========================================= */

async function setApplicationBadge(
  count
) {
  try {
    if (
      "setAppBadge" in
      navigator
    ) {
      await navigator
        .setAppBadge(
          count
        );
    }
  } catch (error) {
    console.error(
      "バッジを設定できませんでした。",
      error
    );
  }
}

/* =========================================
   アプリアイコンのバッジを消す
========================================= */

async function clearApplicationBadge() {
  try {
    if (
      "clearAppBadge" in
      navigator
    ) {
      await navigator
        .clearAppBadge();
    }
  } catch (error) {
    console.error(
      "バッジを消去できませんでした。",
      error
    );
  }
}