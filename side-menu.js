// ========================================
// ポンコツ倶楽部 共通スライドメニュー
// ========================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    createSideMenu();

    setupSideMenuEvents();

    highlightCurrentPage();

    await loadSideMenuBadges();

  }
);


/* ========================================
   サイドメニュー作成
======================================== */

function createSideMenu() {

  const menuHtml = `
    <button
      type="button"
      class="side-menu-toggle"
      id="side-menu-toggle"
      aria-label="メニューを開く"
      aria-controls="side-menu"
      aria-expanded="false"
    >
      ☰
    </button>

    <div
      class="side-menu-overlay"
      id="side-menu-overlay"
    ></div>

    <aside
      class="side-menu"
      id="side-menu"
      aria-hidden="true"
    >

      <div class="side-menu-header">

        <h2 class="side-menu-title">
          ポンコツ倶楽部
        </h2>

        <button
          type="button"
          class="side-menu-close"
          id="side-menu-close"
          aria-label="メニューを閉じる"
        >
          ×
        </button>

      </div>

      <nav class="side-menu-nav">

        <a
          class="side-menu-link"
          href="index.html"
        >
          ホーム
        </a>

        <a
          class="side-menu-link"
          href="trip-form.html?v=25"
        >
          山行届
        </a>

        <a
          class="
            side-menu-link
            side-menu-sub-link
          "
          href="trip-list.html?status=active"
        >
          <span>
            提出済み
          </span>

          <span
            id="side-menu-submitted-badge"
            class="side-menu-badge"
            hidden
          >
            0
          </span>
        </a>

        <a
          class="
            side-menu-link
            side-menu-sub-link
          "
          href="trip-list.html?status=submitted"
        >
          <span>
            承認待ち
          </span>

          <span
            id="side-menu-approval-badge"
            class="side-menu-badge"
            hidden
          >
            0
          </span>
        </a>

        <a
          class="side-menu-link"
          href="trip-list.html"
        >
          山行一覧
        </a>

        <a
          class="side-menu-link"
          href="trip-history.html"
        >
          山行履歴
        </a>

        <a
          class="side-menu-link"
          href="annual-stats.html"
        >
          年間実績
        </a>

        <a
          class="side-menu-link"
          href="notice.html"
        >
          <span>
            お知らせ
          </span>

          <span
            id="side-menu-notice-badge"
            class="side-menu-badge"
            hidden
          >
            0
          </span>
        </a>

        <div class="side-menu-divider"></div>

        <a
          class="side-menu-link"
          href="member-profile.html"
        >
          会員情報
        </a>

        <a
          class="side-menu-link"
          href="settings.html"
        >
          設定
        </a>

        <a
          class="side-menu-link"
          href="guide.html"
        >
          仕様ガイド
        </a>

        <div class="side-menu-divider"></div>

        <button
          type="button"
          class="
            side-menu-button
            side-menu-logout
          "
          id="side-menu-logout"
        >
          ログアウト
        </button>

      </nav>

    </aside>
  `;

  document.body.insertAdjacentHTML(
    "afterbegin",
    menuHtml
  );
}


/* ========================================
   イベント設定
======================================== */

function setupSideMenuEvents() {

  const toggleButton =
    document.getElementById(
      "side-menu-toggle"
    );

  const closeButton =
    document.getElementById(
      "side-menu-close"
    );

  const overlay =
    document.getElementById(
      "side-menu-overlay"
    );

  const logoutButton =
    document.getElementById(
      "side-menu-logout"
    );

  toggleButton?.addEventListener(
    "click",
    openSideMenu
  );

  closeButton?.addEventListener(
    "click",
    closeSideMenu
  );

  overlay?.addEventListener(
    "click",
    closeSideMenu
  );

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key ===
        "Escape"
      ) {
        closeSideMenu();
      }

    }
  );

  logoutButton?.addEventListener(
    "click",
    logout
  );
}


/* ========================================
   メニューを開く
======================================== */

function openSideMenu() {

  const menu =
    document.getElementById(
      "side-menu"
    );

  const overlay =
    document.getElementById(
      "side-menu-overlay"
    );

  const toggleButton =
    document.getElementById(
      "side-menu-toggle"
    );

  menu?.classList.add(
    "is-open"
  );

  overlay?.classList.add(
    "is-open"
  );

  document.body.classList.add(
    "side-menu-open"
  );

  menu?.setAttribute(
    "aria-hidden",
    "false"
  );

  toggleButton?.setAttribute(
    "aria-expanded",
    "true"
  );
}


/* ========================================
   メニューを閉じる
======================================== */

function closeSideMenu() {

  const menu =
    document.getElementById(
      "side-menu"
    );

  const overlay =
    document.getElementById(
      "side-menu-overlay"
    );

  const toggleButton =
    document.getElementById(
      "side-menu-toggle"
    );

  menu?.classList.remove(
    "is-open"
  );

  overlay?.classList.remove(
    "is-open"
  );

  document.body.classList.remove(
    "side-menu-open"
  );

  menu?.setAttribute(
    "aria-hidden",
    "true"
  );

  toggleButton?.setAttribute(
    "aria-expanded",
    "false"
  );
}


/* ========================================
   現在ページ強調
======================================== */

function highlightCurrentPage() {

  const currentPage =
    window.location.pathname
      .split("/")
      .pop() ||
    "index.html";

  const currentSearch =
    window.location.search;

  const links =
    document.querySelectorAll(
      ".side-menu-link"
    );

  links.forEach(
    (link) => {

      const linkUrl =
        new URL(
          link.href,
          window.location.href
        );

      const linkPage =
        linkUrl.pathname
          .split("/")
          .pop();

      if (
        currentPage ===
          "trip-list.html" &&
        linkPage ===
          "trip-list.html"
      ) {

        if (
          linkUrl.search ===
          currentSearch
        ) {
          link.classList.add(
            "is-current"
          );
        }

        return;
      }

      if (
        linkPage ===
        currentPage
      ) {
        link.classList.add(
          "is-current"
        );
      }

    }
  );
}


/* ========================================
   バッジまとめて読込
======================================== */

async function loadSideMenuBadges() {

  if (
    typeof portalFetch !==
      "function" ||
    typeof getPortalMember !==
      "function"
  ) {
    return;
  }

  const loginMember =
    getPortalMember();

  if (
    !loginMember?.id
  ) {
    return;
  }

  await Promise.allSettled([

    loadSubmittedBadge(),

    loadApprovalWaitingBadge(),

    loadUnreadNoticeBadge(
      loginMember.id
    )

  ]);
}


/* ========================================
   提出済み件数
   ホームの提出済みカードと同じ
======================================== */

async function loadSubmittedBadge() {

  const badge =
    document.getElementById(
      "side-menu-submitted-badge"
    );

  if (!badge) {
    return;
  }

  try {

    const response =
      await portalFetch(
        "/rest/v1/trips" +
        "?select=id" +
        "&status=in.(approved,descended,cancelled)"
      );

    if (!response.ok) {
      throw new Error(
        "提出済み件数を取得できませんでした。"
      );
    }

    const trips =
      await response.json();

    const count =
      Array.isArray(trips)
        ? trips.length
        : 0;

    setSideMenuBadge(
      badge,
      count
    );

  } catch (error) {

    console.error(
      "サイドメニュー提出済み件数取得エラー:",
      error
    );

  }
}


/* ========================================
   承認待ち件数
======================================== */

async function loadApprovalWaitingBadge() {

  const badge =
    document.getElementById(
      "side-menu-approval-badge"
    );

  if (!badge) {
    return;
  }

  try {

    const response =
      await portalFetch(
        "/rest/v1/trips" +
        "?select=id" +
        "&status=eq.submitted"
      );

    if (!response.ok) {
      throw new Error(
        "承認待ち件数を取得できませんでした。"
      );
    }

    const trips =
      await response.json();

    const count =
      Array.isArray(trips)
        ? trips.length
        : 0;

    setSideMenuBadge(
      badge,
      count
    );

  } catch (error) {

    console.error(
      "サイドメニュー承認待ち件数取得エラー:",
      error
    );

  }
}


/* ========================================
   お知らせ未読件数
   ホームと同じ判定方法
======================================== */

async function loadUnreadNoticeBadge(
  memberId
) {

  const badge =
    document.getElementById(
      "side-menu-notice-badge"
    );

  if (!badge) {
    return;
  }

  try {

    const noticeResponse =
      await portalFetch(
        "/rest/v1/notices" +
        "?select=id" +
        "&is_published=eq.true"
      );

    if (!noticeResponse.ok) {
      throw new Error(
        "お知らせを取得できませんでした。"
      );
    }

    const notices =
      await noticeResponse.json();

    const readResponse =
      await portalFetch(
        "/rest/v1/notice_reads" +
        "?select=notice_id" +
        `&member_id=eq.${memberId}`
      );

    if (!readResponse.ok) {
      throw new Error(
        "既読情報を取得できませんでした。"
      );
    }

    const reads =
      await readResponse.json();

    const readIds =
      new Set(
        reads.map(
          row =>
            row.notice_id
        )
      );

    const unreadCount =
      notices.filter(
        notice =>
          !readIds.has(
            notice.id
          )
      ).length;

    setSideMenuBadge(
      badge,
      unreadCount
    );

  } catch (error) {

    console.error(
      "サイドメニュー未読お知らせ件数取得エラー:",
      error
    );

  }
}


/* ========================================
   バッジ表示
======================================== */

function setSideMenuBadge(
  badge,
  count
) {

  const safeCount =
    Math.max(
      0,
      Number(count) || 0
    );

  if (
    safeCount === 0
  ) {

    badge.hidden =
      true;

    badge.textContent =
      "0";

    return;
  }

  badge.textContent =
    safeCount > 99
      ? "99+"
      : String(
          safeCount
        );

  badge.hidden =
    false;
}


/* ========================================
   ログアウト
======================================== */

function logout() {

  if (
    typeof logoutPortal ===
    "function"
  ) {

    logoutPortal();

    return;
  }

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