/* =========================================
   ポンコツ倶楽部
   Supabase共通接続・認証
========================================= */

const SUPABASE_URL =
  "https://dqhyufinoxssxkcarohx.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_rIp7lS9MjRQzoHaEdB_uWQ_xp2Otry3";

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

  localStorage.removeItem(
    "ponkotsu_session"
  );

  localStorage.removeItem(
    "ponkotsu_member"
  );

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

  return response;
}