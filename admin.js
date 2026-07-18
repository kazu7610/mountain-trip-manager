/* =========================================
   ポンコツ倶楽部
   管理者・山行届承認画面
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadSubmittedTrips();
  }
);

/* =========================================
   承認待ち山行届を取得
========================================= */

async function loadSubmittedTrips() {
  const tripList =
    document.getElementById("trip-list");

  if (!tripList) {
    console.error(
      "山行届一覧の表示場所が見つかりません。"
    );

    return;
  }

  tripList.innerHTML = `
    <div class="loading-card">
      山行届を読み込んでいます...
    </div>
  `;

  try {
    const response = await portalFetch(
      "/rest/v1/trips" +
      "?select=*" +
      "&status=eq.submitted" +
      "&order=submitted_at.asc"
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "山行届の取得に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    const trips = await response.json();

    if (
      !Array.isArray(trips) ||
      trips.length === 0
    ) {
      tripList.innerHTML = `
        <div class="empty-card">
          現在、承認待ちの山行届はありません。
        </div>
      `;

      return;
    }

    const cards = [];

    for (const trip of trips) {
      const memberNames =
        await loadTripMemberNames(trip.id);

      cards.push(
        createTripCard(
          trip,
          memberNames
        )
      );
    }

    tripList.innerHTML = "";
    cards.forEach((card) => {
      tripList.appendChild(card);
    });

  } catch (error) {
    console.error(error);

    tripList.innerHTML = `
      <div class="error-card">
        山行届を読み込めませんでした。
      </div>
    `;
  }
}

/* =========================================
   山行参加者を取得
========================================= */

async function loadTripMemberNames(tripId) {
  const response = await portalFetch(
    "/rest/v1/trip_members" +
    "?select=member_id,members(name)" +
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
    .map((row) => row.members?.name)
    .filter(Boolean);
}

/* =========================================
   山行届カードを作成
========================================= */

function createTripCard(
  trip,
  memberNames
) {
  const card =
    document.createElement("article");

  card.className = "trip-card";

  const entryDate =
    formatDate(trip.entry_date);

  const descentDate =
    formatDate(trip.descent_date);

  const descentTime =
    formatTime(trip.descent_time);

  const memberText =
    memberNames.length > 0
      ? memberNames.join("・")
      : "会員参加者なし";

  const outsideText =
    Number(trip.outside_member_count) > 0
      ? `、会員外 ${trip.outside_member_count}名`
      : "";

  card.innerHTML = `
    <div class="trip-title-row">

      <h3 class="trip-title">
        ${escapeHtml(trip.mountain_area)}
        ${escapeHtml(trip.mountain_name)}
      </h3>

      <span class="status-badge">
        承認待ち
      </span>

    </div>

    <p class="trip-info">
      <strong>入山日：</strong>
      ${entryDate}
    </p>

    <p class="trip-info">
      <strong>下山予定：</strong>
      ${descentDate} ${descentTime}
    </p>

    <p class="trip-info">
      <strong>ルート：</strong>
      ${escapeHtml(trip.route)}
    </p>

    <p class="trip-info">
      <strong>参加者：</strong>
      ${escapeHtml(memberText)}
      ${escapeHtml(outsideText)}
    </p>

    <div class="button-row">

      <button
        class="reject-button"
        type="button"
        data-trip-id="${trip.id}"
      >
        修正依頼
      </button>

      <button
        class="approve-button"
        type="button"
        data-trip-id="${trip.id}"
      >
        承認する
      </button>

    </div>
  `;

  const approveButton =
    card.querySelector(".approve-button");

  const rejectButton =
    card.querySelector(".reject-button");

  approveButton.addEventListener(
    "click",
    () => approveTrip(
      trip.id,
      approveButton,
      rejectButton
    )
  );

  rejectButton.addEventListener(
    "click",
    () => requestRevision(
      trip.id,
      approveButton,
      rejectButton
    )
  );

  return card;
}

/* =========================================
   山行届を承認
========================================= */

async function approveTrip(
  tripId,
  approveButton,
  rejectButton
) {
  const confirmed = confirm(
    "この山行届を承認しますか？"
  );

  if (!confirmed) {
    return;
  }

  setButtonsDisabled(
    approveButton,
    rejectButton,
    true
  );

  approveButton.textContent = "承認中...";

  try {
    const response = await portalFetch(
      `/rest/v1/trips?id=eq.${tripId}`,
      {
        method: "PATCH",

        headers: {
          Prefer: "return=minimal"
        },

        body: JSON.stringify({
          status: "approved",
          approved_at:
            new Date().toISOString()
        })
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "承認に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    alert(
      "山行届を承認しました。"
    );

    await loadSubmittedTrips();

  } catch (error) {
    console.error(error);

    alert(
      "山行届を承認できませんでした。"
    );

    approveButton.textContent =
      "承認する";

    setButtonsDisabled(
      approveButton,
      rejectButton,
      false
    );
  }
}

/* =========================================
   修正依頼
========================================= */

async function requestRevision(
  tripId,
  approveButton,
  rejectButton
) {
  const confirmed = confirm(
    "この山行届を修正依頼に戻しますか？"
  );

  if (!confirmed) {
    return;
  }

  setButtonsDisabled(
    approveButton,
    rejectButton,
    true
  );

  rejectButton.textContent =
    "処理中...";

  try {
    const response = await portalFetch(
      `/rest/v1/trips?id=eq.${tripId}`,
      {
        method: "PATCH",

        headers: {
          Prefer: "return=minimal"
        },

        body: JSON.stringify({
          status: "revision_required"
        })
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "修正依頼への変更に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    alert(
      "山行届を修正依頼に戻しました。"
    );

    await loadSubmittedTrips();

  } catch (error) {
    console.error(error);

    alert(
      "修正依頼へ変更できませんでした。"
    );

    rejectButton.textContent =
      "修正依頼";

    setButtonsDisabled(
      approveButton,
      rejectButton,
      false
    );
  }
}

/* =========================================
   ボタン操作
========================================= */

function setButtonsDisabled(
  approveButton,
  rejectButton,
  disabled
) {
  approveButton.disabled = disabled;
  rejectButton.disabled = disabled;
}

/* =========================================
   日付表示
========================================= */

function formatDate(value) {
  if (!value) {
    return "未設定";
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  ).format(date);
}

/* =========================================
   時刻表示
========================================= */

function formatTime(value) {
  if (!value) {
    return "未設定";
  }

  return String(value).slice(0, 5);
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