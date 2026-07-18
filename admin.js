/* =========================================
   ポンコツ倶楽部
   管理者・山行管理画面
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadAdminTrips();
  }
);

/* =========================================
   管理対象の山行を読み込む
========================================= */

async function loadAdminTrips() {
  const tripList =
    document.getElementById(
      "trip-list"
    );

  if (!tripList) {
    console.error(
      "山行届一覧の表示場所が見つかりません。"
    );

    return;
  }

  tripList.innerHTML = `
    <div class="loading-card">
      山行情報を読み込んでいます...
    </div>
  `;

  try {
    const response =
      await portalFetch(
        "/rest/v1/trips" +
        "?select=*" +
        "&status=in.(submitted,descended)" +
        "&order=created_at.asc"
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

    const submittedTrips =
      trips.filter(
        (trip) =>
          trip.status === "submitted"
      );

    const descendedTrips =
      trips.filter(
        (trip) =>
          trip.status === "descended"
      );

    tripList.innerHTML = "";

    const submittedSection =
      await createSubmittedSection(
        submittedTrips
      );

    const descendedSection =
      await createDescendedSection(
        descendedTrips
      );

    tripList.appendChild(
      submittedSection
    );

    tripList.appendChild(
      descendedSection
    );

  } catch (error) {
    console.error(error);

    tripList.innerHTML = `
      <div class="error-card">
        山行情報を読み込めませんでした。
      </div>
    `;
  }
}

/* =========================================
   承認待ち一覧を作成
========================================= */

async function createSubmittedSection(
  trips
) {
  const section =
    document.createElement(
      "section"
    );

  section.className =
    "admin-trip-section";

  section.innerHTML = `
    <h2 class="section-title">
      承認待ち
      <span class="section-count">
        ${trips.length}件
      </span>
    </h2>
  `;

  if (trips.length === 0) {
    section.insertAdjacentHTML(
      "beforeend",
      `
        <div class="empty-card">
          現在、承認待ちの山行届はありません。
        </div>
      `
    );

    return section;
  }

  for (const trip of trips) {
    const memberNames =
      await loadTripMemberNames(
        trip.id
      );

    const card =
      createSubmittedTripCard(
        trip,
        memberNames
      );

    section.appendChild(card);
  }

  return section;
}

/* =========================================
   下山確認待ち一覧を作成
========================================= */

async function createDescendedSection(
  trips
) {
  const section =
    document.createElement(
      "section"
    );

  section.className =
    "admin-trip-section";

  section.innerHTML = `
    <h2 class="section-title">
      下山確認待ち
      <span class="section-count">
        ${trips.length}件
      </span>
    </h2>
  `;

  if (trips.length === 0) {
    section.insertAdjacentHTML(
      "beforeend",
      `
        <div class="empty-card">
          現在、下山確認待ちの山行はありません。
        </div>
      `
    );

    return section;
  }

  for (const trip of trips) {
    const memberNames =
      await loadTripMemberNames(
        trip.id
      );

    const card =
      createDescendedTripCard(
        trip,
        memberNames
      );

    section.appendChild(card);
  }

  return section;
}

/* =========================================
   山行参加者を取得
========================================= */

async function loadTripMemberNames(
  tripId
) {
  const response =
    await portalFetch(
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

  const rows =
    await response.json();

  return rows
    .map(
      (row) =>
        row.members?.name
    )
    .filter(Boolean);
}

/* =========================================
   承認待ちカードを作成
========================================= */

function createSubmittedTripCard(
  trip,
  memberNames
) {
  const card =
    document.createElement(
      "article"
    );

  card.className =
    "trip-card";

  const memberText =
    createMemberText(
      memberNames,
      trip.outside_member_count
    );

  card.innerHTML = `
    <div class="trip-title-row">

      <h3 class="trip-title">
        ${escapeHtml(
          trip.mountain_area
        )}
        ${escapeHtml(
          trip.mountain_name
        )}
      </h3>

      <span class="status-badge">
        承認待ち
      </span>

    </div>

    <p class="trip-info">
      <strong>入山日：</strong>
      ${formatDate(
        trip.entry_date
      )}
    </p>

    <p class="trip-info">
      <strong>下山予定：</strong>
      ${formatDate(
        trip.descent_date
      )}
      ${formatTime(
        trip.descent_time
      )}
    </p>

    <p class="trip-info">
      <strong>ルート：</strong>
      ${escapeHtml(
        trip.route
      )}
    </p>

    <p class="trip-info">
      <strong>参加者：</strong>
      ${escapeHtml(
        memberText
      )}
    </p>

    <div class="button-row">

      <button
        class="reject-button"
        type="button"
      >
        修正依頼
      </button>

      <button
        class="approve-button"
        type="button"
      >
        承認する
      </button>

    </div>
  `;

  const approveButton =
    card.querySelector(
      ".approve-button"
    );

  const rejectButton =
    card.querySelector(
      ".reject-button"
    );

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
   下山確認待ちカードを作成
========================================= */

function createDescendedTripCard(
  trip,
  memberNames
) {
  const card =
    document.createElement(
      "article"
    );

  card.className =
    "trip-card descended-card";

  const memberText =
    createMemberText(
      memberNames,
      trip.outside_member_count
    );

  card.innerHTML = `
    <div class="trip-title-row">

      <h3 class="trip-title">
        ${escapeHtml(
          trip.mountain_area
        )}
        ${escapeHtml(
          trip.mountain_name
        )}
      </h3>

      <span class="status-badge">
        無事下山
      </span>

    </div>

    <p class="trip-info">
      <strong>入山日：</strong>
      ${formatDate(
        trip.entry_date
      )}
    </p>

    <p class="trip-info">
      <strong>下山予定：</strong>
      ${formatDate(
        trip.descent_date
      )}
      ${formatTime(
        trip.descent_time
      )}
    </p>

    <p class="trip-info">
      <strong>下山連絡：</strong>
      ${formatDateTime(
        trip.descended_at
      )}
    </p>

    <p class="trip-info">
      <strong>ルート：</strong>
      ${escapeHtml(
        trip.route
      )}
    </p>

    <p class="trip-info">
      <strong>参加者：</strong>
      ${escapeHtml(
        memberText
      )}
    </p>

    <div class="button-row">

      <button
        class="approve-button complete-button"
        type="button"
      >
        確認して完了
      </button>

    </div>
  `;

  const completeButton =
    card.querySelector(
      ".complete-button"
    );

  completeButton.addEventListener(
    "click",
    () => completeTrip(
      trip.id,
      completeButton
    )
  );

  return card;
}

/* =========================================
   参加者表示
========================================= */

function createMemberText(
  memberNames,
  outsideMemberCount
) {
  const memberText =
    memberNames.length > 0
      ? memberNames.join("・")
      : "会員参加者なし";

  const outsideCount =
    Number(
      outsideMemberCount || 0
    );

  if (outsideCount > 0) {
    return (
      `${memberText}、` +
      `会員外 ${outsideCount}名`
    );
  }

  return memberText;
}

/* =========================================
   山行届を承認
========================================= */

async function approveTrip(
  tripId,
  approveButton,
  rejectButton
) {
  const confirmed =
    confirm(
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

  approveButton.textContent =
    "承認中...";

  try {
    const response =
      await portalFetch(
        `/rest/v1/trips?id=eq.${tripId}`,
        {
          method: "PATCH",

          headers: {
            Prefer:
              "return=minimal"
          },

          body: JSON.stringify({
            status: "approved",
            approved_at:
              new Date()
                .toISOString()
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

    await loadAdminTrips();

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
  const confirmed =
    confirm(
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
    const response =
      await portalFetch(
        `/rest/v1/trips?id=eq.${tripId}`,
        {
          method: "PATCH",

          headers: {
            Prefer:
              "return=minimal"
          },

          body: JSON.stringify({
            status:
              "revision_required"
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

    await loadAdminTrips();

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
   下山確認して完了
========================================= */

async function completeTrip(
  tripId,
  completeButton
) {
  const confirmed =
    confirm(
      "下山を確認し、この山行を完了にしますか？"
    );

  if (!confirmed) {
    return;
  }

  completeButton.disabled = true;

  completeButton.textContent =
    "完了処理中...";

  try {
    const response =
      await portalFetch(
        `/rest/v1/trips?id=eq.${tripId}`,
        {
          method: "PATCH",

          headers: {
            Prefer:
              "return=minimal"
          },

          body: JSON.stringify({
            status: "completed"
          })
        }
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "完了処理に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    alert(
      "下山を確認し、山行を完了にしました。"
    );

    await loadAdminTrips();

  } catch (error) {
    console.error(error);

    alert(
      "山行を完了にできませんでした。"
    );

    completeButton.disabled = false;

    completeButton.textContent =
      "確認して完了";
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
  approveButton.disabled =
    disabled;

  rejectButton.disabled =
    disabled;
}

/* =========================================
   日付表示
========================================= */

function formatDate(value) {
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

  return String(value)
    .slice(0, 5);
}

/* =========================================
   日時表示
========================================= */

function formatDateTime(value) {
  if (!value) {
    return "日時不明";
  }

  const date =
    new Date(value);

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
}

/* =========================================
   HTML安全対策
========================================= */

function escapeHtml(value) {
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