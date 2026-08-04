/* =========================================
   ポンコツ倶楽部
   Supabase共通接続・認証
========================================= */

const SUPABASE_URL =
  "https://dqhyufinoxssxkcarohx.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_rIp7lS9MjRQzoHaEdB_uWQ_xp2Otry3";


/* =========================================
   ログイン画面へ移動中かどうか
========================================= */

let portalLoginRedirecting = false;


/* =========================================
   セッション更新処理の重複防止
========================================= */

let portalSessionRefreshPromise = null;


/* =========================================
   保存済みログイン情報を取得
========================================= */

function getPortalAuthSession() {
  const savedSession =
    localStorage.getItem(
      "ponkotsu_session"
    );

  if (!savedSession) {
    return null;
  }

  try {
    return JSON.parse(
      savedSession
    );

  } catch (error) {
    console.error(
      "ログイン情報の読み込みに失敗しました。",
      error
    );

    localStorage.removeItem(
      "ponkotsu_session"
    );

    return null;
  }
}


/* =========================================
   ログイン中の会員情報を取得
========================================= */

function getPortalMember() {
  const savedMember =
    localStorage.getItem(
      "ponkotsu_member"
    );

  if (!savedMember) {
    return null;
  }

  try {
    return JSON.parse(
      savedMember
    );

  } catch (error) {
    console.error(
      "会員情報の読み込みに失敗しました。",
      error
    );

    localStorage.removeItem(
      "ponkotsu_member"
    );

    return null;
  }
}


/* =========================================
   ログイン情報だけ削除
========================================= */

function clearPortalLoginInfo() {
  localStorage.removeItem(
    "ponkotsu_session"
  );

  localStorage.removeItem(
    "ponkotsu_member"
  );
}


/* =========================================
   ログイン期限切れ判定
========================================= */

function isPortalSessionExpired(
  session
) {
  const expiresAt =
    Number(session?.expires_at);

  if (
    !Number.isFinite(expiresAt) ||
    expiresAt <= 0
  ) {
    return false;
  }

  /*
    通信直前の更新失敗を防ぐため、
    有効期限の60秒前から更新対象にする。
  */
  return (
    Date.now() >=
    (expiresAt - 60) * 1000
  );
}


/* =========================================
   セッションを保存
========================================= */

function savePortalAuthSession(
  authResult
) {
  const session = {
    access_token:
      authResult.access_token,

    refresh_token:
      authResult.refresh_token,

    expires_in:
      authResult.expires_in,

    expires_at:
      Math.floor(
        Date.now() / 1000
      ) +
      Number(
        authResult.expires_in ||
        3600
      ),

    user:
      authResult.user
  };

  localStorage.setItem(
    "ponkotsu_session",
    JSON.stringify(session)
  );

  return session;
}


/* =========================================
   refresh_tokenでログインを自動更新
========================================= */

async function refreshPortalSession() {
  if (portalSessionRefreshPromise) {
    return portalSessionRefreshPromise;
  }

  portalSessionRefreshPromise =
    (async () => {
      const currentSession =
        getPortalAuthSession();

      const refreshToken =
        currentSession?.refresh_token;

      if (!refreshToken) {
        throw new Error(
          "ログイン更新情報がありません。"
        );
      }

      const response =
        await fetch(
          `${SUPABASE_URL}` +
          "/auth/v1/token" +
          "?grant_type=refresh_token",
          {
            method: "POST",

            headers: {
              apikey:
                SUPABASE_KEY,

              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                refresh_token:
                  refreshToken
              })
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        console.error(
          "ログインの自動更新に失敗しました。",
          result
        );

        throw new Error(
          result.error_description ||
          result.msg ||
          result.message ||
          "ログインを更新できませんでした。"
        );
      }

      return savePortalAuthSession(
        result
      );
    })();

  try {
    return await portalSessionRefreshPromise;

  } finally {
    portalSessionRefreshPromise =
      null;
  }
}


/* =========================================
   有効なセッションを取得
========================================= */

async function getValidPortalSession() {
  const session =
    getPortalAuthSession();

  if (!session?.access_token) {
    return null;
  }

  if (
    !isPortalSessionExpired(
      session
    )
  ) {
    return session;
  }

  return await refreshPortalSession();
}


/* =========================================
   ログイン期限切れ時の処理
========================================= */

function handlePortalSessionExpired() {
  if (portalLoginRedirecting) {
    return;
  }

  portalLoginRedirecting = true;

  clearPortalLoginInfo();

  alert(
    "ログインを更新できませんでした。\n再度ログインしてください。"
  );

  window.location.href =
    "login.html";
}


/* =========================================
   ログイン確認
========================================= */

function requirePortalLogin() {
  const session =
    getPortalAuthSession();

  const member =
    getPortalMember();

  if (
    !session?.access_token ||
    !member?.id
  ) {
    window.location.href =
      "login.html";

    return false;
  }

  /*
    期限切れでもrefresh_tokenがあれば、
    次の通信時に自動更新する。
  */
  if (
    isPortalSessionExpired(session) &&
    !session?.refresh_token
  ) {
    handlePortalSessionExpired();

    return false;
  }

  return true;
}


/* =========================================
   ログアウト
========================================= */

function logoutPortal() {
  const confirmed =
    confirm(
      "ログアウトしますか？"
    );

  if (!confirmed) {
    return;
  }

  /*
    通知登録とService Workerは削除しない。
    ログイン情報だけを削除する。
  */
  clearPortalLoginInfo();

  window.location.href =
    "login.html";
}


/* =========================================
   Supabase通信
========================================= */

async function portalFetch(
  path,
  options = {}
) {
  let session;

  try {
    session =
      await getValidPortalSession();

  } catch (error) {
    console.error(error);

    handlePortalSessionExpired();

    throw error;
  }

  const createHeaders =
    (accessToken) => ({
      apikey:
        SUPABASE_KEY,

      "Content-Type":
        "application/json",

      ...(options.headers || {}),

      ...(accessToken
        ? {
            Authorization:
              `Bearer ${accessToken}`
          }
        : {})
    });

  let response =
    await fetch(
      `${SUPABASE_URL}${path}`,
      {
        ...options,

        headers:
          createHeaders(
            session?.access_token
          )
      }
    );

  /*
    401の場合は一度だけ
    セッションを更新して再通信する。
  */
  if (
    response.status === 401 &&
    session?.refresh_token
  ) {
    try {
      const refreshedSession =
        await refreshPortalSession();

      response =
        await fetch(
          `${SUPABASE_URL}${path}`,
          {
            ...options,

            headers:
              createHeaders(
                refreshedSession
                  .access_token
              )
          }
        );

    } catch (error) {
      console.error(error);

      handlePortalSessionExpired();

      throw error;
    }
  }

  if (response.status === 401) {
    handlePortalSessionExpired();

    throw new Error(
      "ログインを確認できませんでした。"
    );
  }

  return response;
}