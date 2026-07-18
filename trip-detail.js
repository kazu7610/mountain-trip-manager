/* =========================================
   ポンコツ倶楽部
   山行詳細画面
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadTripDetail();
  }
);

/* =========================================
   URLから山行IDを取得
========================================= */

function getTripId() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const tripId =
    Number(params.get("id"));

  if (
    !Number.isInteger(tripId) ||
    tripId <= 0
  ) {
    return null;
  }

  return tripId;
}

/* =========================================
   山行詳細を読み込む
========================================= */

async function loadTripDetail() {
  const detailContainer =
    document.getElementById("trip-detail");

  if (!detailContainer) {
    console.error(
      "山行詳細の表示場所が見つかりません。"
    );

    return;
  }

  const tripId = getTripId();

  if (!tripId) {
    showError(
      detailContainer,
      "山行IDが指定されていません。"
    );

    return;
  }

  try {
    const tripResponse =
      await portalFetch(
        "/rest/v1/trips" +
        "?select=*" +
        `&id=eq.${tripId}`
      );

    if (!tripResponse.ok) {
      const errorText =
        await tripResponse.text();

      throw new Error(
        "山行情報の取得に失敗しました。" +
        ` ${tripResponse.status} ${errorText}`
      );
    }

    const trips =
      await tripResponse.json();

    const trip = trips[0];

    if (!trip) {
      showError(
        detailContainer,
        "指定された山行が見つかりません。"
      );

      return;
    }

    const members =
      await loadTripMembers(tripId);

    renderTripDetail(
      detailContainer,
      trip,
      members
    );

  } catch (error) {
    console.error(error);

    showError(
      detailContainer,
      "山行情報を読み込めませんでした。"
    );
  }
}

/* =========================================
   参加者を読み込む
========================================= */

async function loadTripMembers(tripId) {
  const response =
    await portalFetch(
      "/rest/v1/trip_members" +
      "?select=is_leader,members(name)" +
      `&trip_id=eq.${tripId}` +
      "&order=id.asc"
    );

  if (!response.ok) {
    console.error(
      "参加者の取得に失敗しました。",
      await response.text()
    );

    return [];
  }

  const rows = await response.json();

  return rows
    .map((row) => ({
      name:
        row.members?.name || "不明",
      isLeader:
        row.is_leader === true
    }));
}

/* =========================================
   詳細を表示
========================================= */

function renderTripDetail(
  container,
  trip,
  members
) {
  const memberHtml =
    createMemberHtml(
      members,
      trip.outside_member_count
    );

  container.innerHTML = `
    <article class="detail-card">

      <div class="detail-head">

        <p class="detail-area">
          ${escapeHtml(trip.mountain_area)}
        </p>

        <h2 class="detail-title">
          ${escapeHtml(trip.mountain_name)}
        </h2>

        <span class="status-badge">
          ${escapeHtml(
            getStatusLabel(trip.status)
          )}
        </span>

      </div>

      <div class="detail-body">

        <section class="detail-row">
          <p class="detail-label">
            ルート
          </p>

          <p class="detail-value">
            ${escapeHtml(trip.route)}
          </p>
        </section>

        <section class="detail-row">
          <p class="detail-label">
            入山日
          </p>

          <p class="detail-value">
            ${formatDate(trip.entry_date)}
          </p>
        </section>

        <section class="detail-row">
          <p class="detail-label">
            下山予定
          </p>

          <p class="detail-value">
            ${formatDate(trip.descent_date)}
            ${formatTime(trip.descent_time)}
          </p>
        </section>

        <section class="detail-row">
          <p class="detail-label">
            参加者
          </p>

          <div class="member-list">
            ${memberHtml}
          </div>
        </section>

      </div>

    </article>

    <div class="button-row">

      <button
        class="home-button"
        type="button"
        onclick="location.href='index.html'"
      >
        ホームへ戻る
      </button>

      <button
        class="plan-button"
        type="button"
        disabled
      >
        計画書なし
      </button>

    </div>
  `;
}

/* =========================================
   参加者表示
========================================= */

function createMemberHtml(
  members,
  outsideMemberCount
) {
  const chips = [];

  members.forEach((member) => {
    const leaderText =
      member.isLeader
        ? "（代表）"
        : "";

    chips.push(`
      <span class="member-chip">
        ${escapeHtml(member.name)}
        ${leaderText}
      </span>
    `);
  });

  const outsideCount =
    Number(outsideMemberCount || 0);

  if (outsideCount > 0) {
    chips.push(`
      <span class="member-chip outside-chip">
        会員外 ${outsideCount}名
      </span>
    `);
  }

  if (chips.length === 0) {
    return `
      <span class="member-chip">
        参加者未登録
      </span>
    `;
  }

  return chips.join("");
}

/* =========================================
   状態表示
========================================= */

function getStatusLabel(status) {
  const labels = {
    draft: "下書き",
    submitted: "承認待ち",
    approved: "承認済み",
    revision_required: "修正依頼",
    cancelled: "中止",
    descended: "下山連絡済み",
    completed: "完了"
  };

  return labels[status] || status || "不明";
}

/* =========================================
   日付表示
========================================= */

function formatDate(value) {
  if (!value) {
    return "未設定";
  }

  const date =
    new Date(`${value}T00:00:00`);

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

/* =========================================
   時刻表示
========================================= */

function formatTime(value) {
  if (!value) {
    return "時刻未設定";
  }

  return String(value).slice(0, 5);
}

/* =========================================
   エラー表示
========================================= */

function showError(
  container,
  message
) {
  container.innerHTML = `
    <div class="error-card">
      ${escapeHtml(message)}
    </div>
  `;
}

/* =========================================
   HTML安全対策
========================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}