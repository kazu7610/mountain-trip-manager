// ========================================
// ポンコツ倶楽部 共通スライドメニュー
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  createSideMenu();
  setupSideMenuEvents();
  highlightCurrentPage();
});

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

    <div class="side-menu-overlay" id="side-menu-overlay"></div>

    <aside class="side-menu" id="side-menu" aria-hidden="true">
      <div class="side-menu-header">
        <h2 class="side-menu-title">ポンコツ倶楽部</h2>

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
        <a class="side-menu-link" href="index.html">
          ホーム
        </a>

        <a class="side-menu-link" href="trip-form.html">
          山行届
        </a>

        <a class="side-menu-link" href="trip-list.html">
          山行一覧
        </a>

        <a class="side-menu-link" href="trip-history.html">
          山行履歴
        </a>

        <a class="side-menu-link" href="annual-stats.html">
          年間実績
        </a>

        <div class="side-menu-divider"></div>

        <a class="side-menu-link" href="member-profile.html">
          会員情報
        </a>

        <a class="side-menu-link" href="settings.html">
          設定
        </a>

        <a class="side-menu-link" href="guide.html">
          仕様ガイド
        </a>

        <div class="side-menu-divider"></div>

        <button
          type="button"
          class="side-menu-button side-menu-logout"
          id="side-menu-logout"
        >
          ログアウト
        </button>
      </nav>
    </aside>
  `;

  document.body.insertAdjacentHTML("afterbegin", menuHtml);
}

function setupSideMenuEvents() {
  const toggleButton = document.getElementById("side-menu-toggle");
  const closeButton = document.getElementById("side-menu-close");
  const overlay = document.getElementById("side-menu-overlay");
  const logoutButton = document.getElementById("side-menu-logout");

  toggleButton?.addEventListener("click", openSideMenu);
  closeButton?.addEventListener("click", closeSideMenu);
  overlay?.addEventListener("click", closeSideMenu);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSideMenu();
    }
  });

  logoutButton?.addEventListener("click", logout);
}

function openSideMenu() {
  const menu = document.getElementById("side-menu");
  const overlay = document.getElementById("side-menu-overlay");
  const toggleButton = document.getElementById("side-menu-toggle");

  menu?.classList.add("is-open");
  overlay?.classList.add("is-open");
  document.body.classList.add("side-menu-open");

  menu?.setAttribute("aria-hidden", "false");
  toggleButton?.setAttribute("aria-expanded", "true");
}

function closeSideMenu() {
  const menu = document.getElementById("side-menu");
  const overlay = document.getElementById("side-menu-overlay");
  const toggleButton = document.getElementById("side-menu-toggle");

  menu?.classList.remove("is-open");
  overlay?.classList.remove("is-open");
  document.body.classList.remove("side-menu-open");

  menu?.setAttribute("aria-hidden", "true");
  toggleButton?.setAttribute("aria-expanded", "false");
}

function highlightCurrentPage() {
  const currentPage =
    window.location.pathname.split("/").pop() || "index.html";

  const links = document.querySelectorAll(".side-menu-link");

  links.forEach((link) => {
    const href = link.getAttribute("href");

    if (href === currentPage) {
      link.classList.add("is-current");
    }
  });
}

async function logout() {
  try {
    if (
      window.supabaseClient &&
      window.supabaseClient.auth
    ) {
      await window.supabaseClient.auth.signOut();
    }

    window.location.href = "login.html";
  } catch (error) {
    console.error("ログアウトに失敗しました:", error);
    window.location.href = "login.html";
  }
}