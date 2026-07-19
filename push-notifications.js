/* =========================================
   ポンコツ倶楽部
   Push通知・端末登録
========================================= */

const VAPID_PUBLIC_KEY =
  "BIouRgH5Si_tURFRUkBGfk_yHp9-XuTv5KALyc3_X3VMphEKYsplDWFouI_EhFhwfYXfMXxvVUctQdMMs-JqgMg";

/* =========================================
   通知機能を利用できるか確認
========================================= */

function canUsePushNotifications() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/* =========================================
   Base64文字列をUint8Arrayへ変換
========================================= */

function urlBase64ToUint8Array(
  base64String
) {
  const padding =
    "=".repeat(
      (
        4 -
        base64String.length % 4
      ) % 4
    );

  const base64 =
    (
      base64String +
      padding
    )
      .replace(
        /-/g,
        "+"
      )
      .replace(
        /_/g,
        "/"
      );

  const rawData =
    window.atob(
      base64
    );

  return Uint8Array.from(
    rawData,
    (character) =>
      character.charCodeAt(0)
  );
}

/* =========================================
   ArrayBufferをBase64文字列へ変換
========================================= */

function arrayBufferToBase64(
  buffer
) {
  const bytes =
    new Uint8Array(
      buffer
    );

  let binary = "";

  bytes.forEach(
    (byte) => {
      binary +=
        String.fromCharCode(
          byte
        );
    }
  );

  return window.btoa(
    binary
  );
}

/* =========================================
   Push購読を取得・作成
========================================= */

async function getOrCreatePushSubscription() {
  const registration =
    await navigator
      .serviceWorker
      .ready;

  let subscription =
    await registration
      .pushManager
      .getSubscription();

  if (subscription) {
    return subscription;
  }

  subscription =
    await registration
      .pushManager
      .subscribe({
        userVisibleOnly:
          true,

        applicationServerKey:
          urlBase64ToUint8Array(
            VAPID_PUBLIC_KEY
          )
      });

  return subscription;
}

/* =========================================
   端末情報をSupabaseへ保存
========================================= */

async function savePushSubscription(
  subscription
) {
  const member =
    getPortalMember();

  if (!member?.id) {
    throw new Error(
      "ログイン情報を確認できません。"
    );
  }

  const p256dhKey =
    subscription
      .getKey(
        "p256dh"
      );

  const authKey =
    subscription
      .getKey(
        "auth"
      );

  if (
    !p256dhKey ||
    !authKey
  ) {
    throw new Error(
      "通知用の端末情報を取得できませんでした。"
    );
  }

  const response =
    await portalFetch(
      "/rest/v1/push_subscriptions" +
      "?on_conflict=endpoint",
      {
        method:
          "POST",

        headers: {
          Prefer:
            "resolution=merge-duplicates,return=minimal"
        },

        body:
          JSON.stringify({
            member_id:
              Number(member.id),

            endpoint:
              subscription.endpoint,

            p256dh:
              arrayBufferToBase64(
                p256dhKey
              ),

            auth:
              arrayBufferToBase64(
                authKey
              ),

            user_agent:
              navigator.userAgent,

            active:
              true,

            updated_at:
              new Date()
                .toISOString()
          })
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      "通知先の保存に失敗しました。" +
      ` ${response.status} ${errorText}`
    );
  }
}

/* =========================================
   通知を有効にする
========================================= */

async function enablePushNotifications(
  button = null
) {
  if (
    !canUsePushNotifications()
  ) {
    alert(
      "この端末またはブラウザは通知機能に対応していません。"
    );

    return false;
  }

  const member =
    getPortalMember();

  if (!member?.id) {
    alert(
      "ログイン情報を確認できません。もう一度ログインしてください。"
    );

    location.href =
      "login.html";

    return false;
  }

  if (button) {
    button.disabled =
      true;

    button.textContent =
      "設定中...";
  }

  try {
    let permission =
      Notification.permission;

    if (
      permission ===
      "default"
    ) {
      permission =
        await Notification
          .requestPermission();
    }

    if (
      permission !==
      "granted"
    ) {
      alert(
        "通知が許可されませんでした。\n端末の設定から通知を許可してください。"
      );

      return false;
    }

    const subscription =
      await getOrCreatePushSubscription();

    await savePushSubscription(
      subscription
    );

    alert(
      "通知を有効にしました。"
    );

    return true;

  } catch (error) {
    console.error(
      error
    );

    alert(
      "通知を有効にできませんでした。\n" +
      (
        error?.message ||
        "設定を確認してください。"
      )
    );

    return false;

  } finally {
    if (button) {
      button.disabled =
        false;

      button.textContent =
        "通知を有効にする";
    }
  }
}

/* =========================================
   現在の通知登録状態を確認
========================================= */

async function isPushNotificationEnabled() {
  if (
    !canUsePushNotifications() ||
    Notification.permission !==
      "granted"
  ) {
    return false;
  }

  const registration =
    await navigator
      .serviceWorker
      .ready;

  const subscription =
    await registration
      .pushManager
      .getSubscription();

  return Boolean(
    subscription
  );
}