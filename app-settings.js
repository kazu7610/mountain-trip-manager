/* =========================================
   ポンコツ倶楽部
   共通表示設定
========================================= */


/* =========================================
   保存済み設定を適用
========================================= */

function applyPortalDisplaySettings() {

  const darkMode =
    localStorage.getItem(
      "ponkotsu_dark_mode"
    ) === "true";


  const fontSize =
    localStorage.getItem(
      "ponkotsu_font_size"
    ) || "normal";


  document.documentElement.classList.toggle(
    "ponkotsu-dark-mode",
    darkMode
  );


  document.documentElement.classList.toggle(
    "ponkotsu-large-font",
    fontSize === "large"
  );
}


/* =========================================
   初回適用
========================================= */

applyPortalDisplaySettings();


/* =========================================
   ページ表示後にも再適用
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    applyPortalDisplaySettings();
  }
);