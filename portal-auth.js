/* =========================================
   ポンコツ倶楽部
   Supabase共通接続・認証
========================================= */

const SUPABASE_URL = "https://dqhyufinoxssxkcarohx.supabase.co";
const SUPABASE_KEY = "sb_publishable_rIp7lS9MjRQzoHaEdB_uWQ_xp2Otry3";

/* =========================================
   保存済みログイン情報を取得
========================================= */

function getPortalAuthSession() {
  const savedSession = localStorage.getItem("portalAuthSession");

  if (!savedSession) {
    return null;
  }

  try {
    return JSON.parse(savedSession);
  } catch (error) {
    console.error(
      "ログイン情報の読み込みに失敗しました。",
      error
    );

    localStorage.removeItem("portalAuthSession");

    return null;
  }
}

/* =========================================
   Supabase通信
========================================= */

async function portalFetch(path, options = {}) {
  const session = getPortalAuthSession();

  const headers = {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  /*
    ログイン済みのときだけ、
    Supabase Authのアクセストークンを付ける
  */
  if (session?.access_token) {
    headers.Authorization =
      `Bearer ${session.access_token}`;
  }

  const response = await fetch(
    `${SUPABASE_URL}${path}`,
    {
      ...options,
      headers
    }
  );

  return response;
}