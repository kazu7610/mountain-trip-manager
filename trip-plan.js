/* =========================================
   ポンコツ倶楽部
   詳細計画書
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    if (!requirePortalLogin()) {
      return;
    }

    loadDetailedPlanTrip();
  }
);

/* =========================================
   対象の山行IDを取得
========================================= */

function getDetailedPlanTripId() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const queryTripId =
    params.get("id");

  if (queryTripId) {
    return queryTripId;
  }

  return localStorage.getItem(
    "pendingDetailedPlanTripId"
  );
}

/* =========================================
   山行情報を読み込む
========================================= */

async function loadDetailedPlanTrip() {
  const tripId =
    getDetailedPlanTripId();

  if (!tripId) {
    alert(
      "詳細計画書の対象となる山行を確認できません。"
    );

    return;
  }

  const infoElement =
    document.getElementById(
      "plan-trip-info"
    );

  if (!infoElement) {
    console.error(
      "山行基本情報の表示場所が見つかりません。"
    );

    return;
  }

  infoElement.innerHTML = `
    <p class="placeholder">
      山行情報を読み込んでいます...
    </p>
  `;

  try {
    const response =
      await portalFetch(
        "/rest/v1/trips" +
        "?select=*" +
        `&id=eq.${tripId}` +
        "&limit=1"
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "山行情報の取得に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    const trips =
      await response.json();

    const trip =
      trips[0];

    if (!trip) {
      throw new Error(
        "対象の山行情報が見つかりません。"
      );
    }

    infoElement.innerHTML = `
      <p class="placeholder">
        <strong>山域：</strong>
        ${escapeHtml(
          trip.mountain_area || "未入力"
        )}
      </p>

      <p class="placeholder">
        <strong>山名：</strong>
        ${escapeHtml(
          trip.mountain_name || "未入力"
        )}
      </p>

      <p class="placeholder">
        <strong>ルート：</strong>
        ${escapeHtml(
          trip.route || "未入力"
        )}
      </p>

      <p class="placeholder">
        <strong>入山日：</strong>
        ${formatDate(
          trip.entry_date
        )}
      </p>

      <p class="placeholder">
        <strong>下山予定：</strong>
        ${formatDate(
          trip.descent_date
        )}
        ${formatTime(
          trip.descent_time
        )}
      </p>
    `;

  } catch (error) {
    console.error(error);

    infoElement.innerHTML = `
      <p class="placeholder">
        山行情報を読み込めませんでした。
      </p>
    `;
  }
}

function formatDate(
  value
) {
  if (!value) {
    return "未設定";
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short"
    }
  ).format(date);
}

function formatTime(
  value
) {
  if (!value) {
    return "時刻未設定";
  }

  return String(value)
    .slice(0, 5);
}

function escapeHtml(
  value
) {
  return String(value ?? "")
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

