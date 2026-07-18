/* =========================================
   ポンコツ倶楽部
   ログイン画面
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    initializeLoginPage();
  }
);

/* =========================================
   ログイン画面を準備
========================================= */

async function initializeLoginPage() {
  const loginForm =
    document.getElementById(
      "login-form"
    );

  if (!loginForm) {
    console.error(
      "ログインフォームが見つかりません。"
    );

    return;
  }

  loginForm.addEventListener(
    "submit",
    handleLogin
  );

  await loadMembers();
}

/* =========================================
   会員一覧を読み込む
========================================= */

async function loadMembers() {
  const memberSelect =
    document.getElementById(
      "member-select"
    );

  const message =
    document.getElementById(
      "login-message"
    );

  if (!memberSelect || !message) {
    console.error(
      "会員一覧の表示場所が見つかりません。"
    );

    return;
  }

  try {
    const response =
      await portalFetch(
        "/rest/v1/members" +
        "?select=id,name,role" +
        "&active=eq.true" +
        "&order=id.asc"
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "会員情報の取得に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    const members =
      await response.json();

    memberSelect.innerHTML = `
      <option value="">
        会員を選択してください
      </option>
    `;

    members.forEach((member) => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        String(member.id);

      option.textContent =
        member.name;

      option.dataset.name =
        member.name;

      option.dataset.role =
        member.role || "member";

      memberSelect.appendChild(
        option
      );
    });

    message.textContent = "";
    message.classList.remove(
      "loading-text"
    );

  } catch (error) {
    console.error(error);

    message.textContent =
      "会員情報を読み込めませんでした。";

    message.classList.remove(
      "loading-text"
    );
  }
}

/* =========================================
   ログイン処理
========================================= */

async function handleLogin(event) {
  event.preventDefault();

  const memberSelect =
    document.getElementById(
      "member-select"
    );

  const passwordInput =
    document.getElementById(
      "password"
    );

  const loginButton =
    document.getElementById(
      "login-button"
    );

  const message =
    document.getElementById(
      "login-message"
    );

  if (
    !memberSelect ||
    !passwordInput ||
    !loginButton ||
    !message
  ) {
    console.error(
      "ログインに必要な項目が見つかりません。"
    );

    return;
  }

  const memberId =
    Number(memberSelect.value);

  const password =
    passwordInput.value;

  const selectedOption =
    memberSelect.options[
      memberSelect.selectedIndex
    ];

  const memberName =
    selectedOption?.dataset.name || "";

  const memberRole =
    selectedOption?.dataset.role ||
    "member";

  if (
    !Number.isInteger(memberId) ||
    memberId <= 0
  ) {
    message.textContent =
      "名前を選択してください。";

    return;
  }

  if (!password) {
    message.textContent =
      "パスワードを入力してください。";

    return;
  }

  const email =
    createLoginEmail(memberId);

  loginButton.disabled = true;
  loginButton.textContent =
    "ログイン中...";

  message.textContent = "";
  message.classList.remove(
    "loading-text"
  );

  try {
    const response = await fetch(
      `${SUPABASE_URL}` +
      "/auth/v1/token" +
      "?grant_type=password",
      {
        method: "POST",

        headers: {
          apikey: SUPABASE_KEY,

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          email,
          password
        })
      }
    );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error_description ||
        result.msg ||
        result.message ||
        "ログインに失敗しました。"
      );
    }

    saveLoginSession(
      result,
      memberId,
      memberName,
      memberRole
    );

    window.location.href =
      "index.html";

  } catch (error) {
    console.error(error);

    message.textContent =
      "名前またはパスワードが違います。";

    loginButton.disabled = false;
    loginButton.textContent =
      "ログイン";
  }
}

/* =========================================
   Auth用の仮メールアドレス
========================================= */

function createLoginEmail(memberId) {
  return (
    `member-${memberId}` +
    "@ponkotsu-club.local"
  );
}

/* =========================================
   ログイン情報を保存
========================================= */

function saveLoginSession(
  authResult,
  memberId,
  memberName,
  memberRole
) {
  const session = {
    access_token:
      authResult.access_token,

    refresh_token:
      authResult.refresh_token,

    expires_in:
      authResult.expires_in,

    expires_at:
      Math.floor(Date.now() / 1000) +
      Number(
        authResult.expires_in || 3600
      ),

    user:
      authResult.user
  };

  localStorage.setItem(
    "ponkotsu_session",
    JSON.stringify(session)
  );

  localStorage.setItem(
    "ponkotsu_member",
    JSON.stringify({
      id: memberId,
      name: memberName,
      role: memberRole,
      authUserId:
        authResult.user?.id || null
    })
  );
}