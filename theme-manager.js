/* 会員ごとの着せ替え。認証やサーバーのデータは変更しない。 */
(() => {
  "use strict";

  const themes = ["standard", "spring", "summer", "autumn"];

  function storageKey() {
    try {
      const member = JSON.parse(localStorage.getItem("ponkotsu_member"));
      return member?.id != null ? `ponkotsu_theme_${member.id}` : null;
    } catch {
      return null;
    }
  }

  function getTheme() {
    try {
      const key = storageKey();
      const saved = key ? localStorage.getItem(key) : null;
      return themes.includes(saved) ? saved : "standard";
    } catch {
      return "standard";
    }
  }

  function apply() {
    const theme = getTheme();
    const standard = theme === "standard";
    document.documentElement.dataset.theme = theme;
    let darkMode = false;
    try {
      darkMode = localStorage.getItem("ponkotsu_dark_mode") === "true";
    } catch { /* 保存領域が使えない場合は標準の明るい表示 */ }
    document.documentElement.classList.toggle(
      "ponkotsu-dark-mode", standard && darkMode
    );

    const select = document.getElementById("theme-select");
    if (select) select.value = theme;
    const toggle = document.getElementById("dark-mode-toggle");
    if (toggle) {
      toggle.disabled = !standard;
      toggle.checked = darkMode;
    }
    const description = document.getElementById("dark-mode-description");
    if (description) {
      description.textContent = standard
        ? "暗い配色で表示"
        : "ダークモードは標準テーマのみ利用できます";
    }
  }

  function setTheme(theme) {
    if (!themes.includes(theme)) return;
    const key = storageKey();
    if (!key) throw new Error("会員情報を確認できません。");
    localStorage.setItem(key, theme);
    apply();
  }

  window.PortalTheme = { getTheme, setTheme, apply };
  apply();

  document.addEventListener("DOMContentLoaded", () => {
    apply();
    document.getElementById("theme-select")?.addEventListener("change", (event) => {
      try {
        setTheme(event.target.value);
      } catch {
        apply();
        alert("テーマを保存できませんでした。ブラウザの保存設定を確認してください。");
      }
    });
  });
  window.addEventListener("pageshow", apply);
  window.addEventListener("storage", (event) => {
    if (event.key === null || event.key === "ponkotsu_member" ||
        event.key === "ponkotsu_dark_mode" || event.key === storageKey()) apply();
  });
})();
