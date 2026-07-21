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

  return (
    Date.now() >=
    expiresAt * 1000
  );
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
    "ログインの有効期限が切れました。\n再度ログインしてください。"
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

  if (
    isPortalSessionExpired(session)
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
  const session =
    getPortalAuthSession();

  if (
    session?.access_token &&
    isPortalSessionExpired(session)
  ) {
    handlePortalSessionExpired();

    throw new Error(
      "ログインの有効期限が切れています。"
    );
  }

  const headers = {
    apikey: SUPABASE_KEY,

    "Content-Type":
      "application/json",

    ...(options.headers || {})
  };

  if (session?.access_token) {
    headers.Authorization =
      `Bearer ${session.access_token}`;
  }

  const response =
    await fetch(
      `${SUPABASE_URL}${path}`,
      {
        ...options,
        headers
      }
    );

  if (response.status === 401) {
    handlePortalSessionExpired();

    throw new Error(
      "ログインの有効期限が切れています。"
    );
  }

  return response;
}