/* =========================================
   ポンコツ倶楽部
   管理者・山行管理画面
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    if (!requirePortalLogin()) {
      return;
    }

    const member =
      getPortalMember();

    if (
      !member ||
      member.role !== "admin"
    ) {
      alert(
        "この画面は管理者専用です。"
      );

      location.href =
        "index.html";

      return;
    }

    loadAdminTrips();
  }
);

/* =========================================
   管理画面全体を読み込む
========================================= */

async function loadAdminTrips() {
  const tripList =
    document.getElementById(
      "trip-list"
    );

  if (!tripList) {
    console.error(
      "山行管理一覧の表示場所が見つかりません。"
    );

    return;
  }

  tripList.innerHTML = `
    <div class="loading-card">
      山行情報を読み込んでいます...
    </div>
  `;

  try {
    const [
      trips,
      requests
    ] = await Promise.all([
      loadManagementTrips(),
      loadPendingRequests()
    ]);

    /*
     * 新しく提出された山行届
     */
    const submittedTrips =
      trips.filter(
        (trip) =>
          trip.status ===
          "submitted"
      );

    /*
     * 下山連絡済みの山行
     */
    const descendedTrips =
      trips.filter(
        (trip) =>
          trip.status ===
          "descended"
      );

    /*
     * 中止が承認された山行
     */
    const cancelledTrips =
      trips.filter(
        (trip) =>
          trip.status ===
          "cancelled"
      );

    /*
     * 変更申請
     */
    const changeRequests =
      requests.filter(
        (request) =>
          request.request_type ===
          "change"
      );

    /*
     * 中止申請
     */
    const cancelRequests =
      requests.filter(
        (request) =>
          request.request_type ===
          "cancel"
      );

    tripList.innerHTML = "";

    const submittedSection =
      await createSubmittedSection(
        submittedTrips
      );

    const changeSection =
      await createRequestSection(
        changeRequests,
        "change"
      );

    const cancelSection =
      await createRequestSection(
        cancelRequests,
        "cancel"
      );

    const cancelledSection =
      await createCancelledSection(
        cancelledTrips
      );

    const descendedSection =
      await createDescendedSection(
        descendedTrips
      );

    tripList.appendChild(
      submittedSection
    );

    tripList.appendChild(
      changeSection
    );

    tripList.appendChild(
      cancelSection
    );

    tripList.appendChild(
      cancelledSection
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
   承認待ち・下山済み・中止済み山行を取得
========================================= */

async function loadManagementTrips() {
  const response =
    await portalFetch(
      "/rest/v1/trips" +
      "?select=*" +
      "&status=in.(submitted,descended,cancelled)" +
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

  return await response.json();
}

/* =========================================
   変更・中止申請を取得
========================================= */

async function loadPendingRequests() {
  const response =
    await portalFetch(
      "/rest/v1/trip_requests" +
      "?select=*" +
      "&status=eq.pending" +
      "&order=created_at.asc"
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      "変更・中止申請の取得に失敗しました。" +
      ` ${response.status} ${errorText}`
    );
  }

  return await response.json();
}

/* =========================================
   承認待ち一覧
========================================= */

async function createSubmittedSection(
  trips
) {
  const section =
    createSectionBase(
      "承認待ち",
      trips.length
    );

  if (trips.length === 0) {
    addEmptyCard(
      section,
      "現在、承認待ちの山行届はありません。"
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
   下山確認待ち一覧
========================================= */

async function createDescendedSection(
  trips
) {
  const section =
    createSectionBase(
      "下山確認待ち",
      trips.length
    );

  if (trips.length === 0) {
    addEmptyCard(
      section,
      "現在、下山確認待ちの山行はありません。"
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
   中止確認待ち一覧
========================================= */

async function createCancelledSection(
  trips
) {
  const section =
    createSectionBase(
      "中止確認待ち",
      trips.length
    );

  if (trips.length === 0) {
    addEmptyCard(
      section,
      "現在、中止確認待ちの山行はありません。"
    );

    return section;
  }

  for (const trip of trips) {
    const memberNames =
      await loadTripMemberNames(
        trip.id
      );

    const card =
      createCancelledTripCard(
        trip,
        memberNames
      );

    section.appendChild(card);
  }

  return section;
}

/* =========================================
   変更・中止申請一覧
========================================= */

async function createRequestSection(
  requests,
  requestType
) {
  const isChange =
    requestType === "change";

  const title =
    isChange
      ? "変更申請"
      : "中止申請";

  const emptyMessage =
    isChange
      ? "現在、確認待ちの変更申請はありません。"
      : "現在、確認待ちの中止申請はありません。";

  const section =
    createSectionBase(
      title,
      requests.length
    );

  if (requests.length === 0) {
    addEmptyCard(
      section,
      emptyMessage
    );

    return section;
  }

  for (const request of requests) {
    const trip =
      await loadTripById(
        request.trip_id
      );

    if (!trip) {
      continue;
    }

    const memberNames =
      await loadTripMemberNames(
        trip.id
      );

    const card =
      createRequestCard(
        request,
        trip,
        memberNames
      );

    section.appendChild(card);
  }

  return section;
}

/* =========================================
   共通セクション
========================================= */

function createSectionBase(
  title,
  count
) {
  const section =
    document.createElement(
      "section"
    );

  section.className =
    "admin-trip-section";

  section.innerHTML = `
    <h2 class="section-title">
      ${escapeHtml(title)}

      <span class="section-count">
        ${count}件
      </span>
    </h2>
  `;

  return section;
}

function addEmptyCard(
  section,
  message
) {
  section.insertAdjacentHTML(
    "beforeend",
    `
      <div class="empty-card">
        ${escapeHtml(message)}
      </div>
    `
  );
}

/* =========================================
   山行1件を取得
========================================= */

async function loadTripById(
  tripId
) {
  const response =
    await portalFetch(
      "/rest/v1/trips" +
      "?select=*" +
      `&id=eq.${tripId}`
    );

  if (!response.ok) {
    console.error(
      "申請対象の山行取得に失敗しました。",
      await response.text()
    );

    return null;
  }

  const trips =
    await response.json();

  return trips[0] || null;
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
      "?select=member_id,is_leader,members(name)" +
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

  return rows.map(
    (row) => ({
      name:
        row.members?.name ||
        "不明",

      isLeader:
        row.is_leader === true
    })
  );
}

/* =========================================
   承認待ちカード
========================================= */

function createSubmittedTripCard(
  trip,
  members
) {
  const card =
    document.createElement(
      "article"
    );

  card.className =
    "trip-card";

  const memberText =
    createMemberText(
      members,
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

    ${createTripInformationHtml(
      trip,
      memberText
    )}

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
   下山確認待ちカード
========================================= */

function createDescendedTripCard(
  trip,
  members
) {
  const card =
    document.createElement(
      "article"
    );

  card.className =
    "trip-card descended-card";

  const memberText =
    createMemberText(
      members,
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

      <span
        class="status-badge descended-badge"
      >
        無事下山
      </span>

    </div>

    ${createTripInformationHtml(
      trip,
      memberText
    )}

    <p class="trip-info">
      <strong>下山連絡：</strong>
      ${formatDateTime(
        trip.descended_at
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
   中止確認待ちカード
========================================= */

function createCancelledTripCard(
  trip,
  members
) {
  const card =
    document.createElement(
      "article"
    );

  card.className =
    "trip-card cancelled-card";

  const memberText =
    createMemberText(
      members,
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

      <span
        class="status-badge cancelled-badge"
      >
        中止
      </span>

    </div>

    ${createTripInformationHtml(
      trip,
      memberText
    )}

    <div class="cancelled-message">
      この山行は中止になりました
    </div>

    <div class="button-row">

      <button
        class="approve-button cancelled-complete-button"
        type="button"
      >
        確認して完了
      </button>

    </div>
  `;

  const completeButton =
    card.querySelector(
      ".cancelled-complete-button"
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
   変更・中止申請カード
========================================= */

function createRequestCard(
  request,
  trip,
  members
) {
  const isChange =
    request.request_type ===
    "change";

  const card =
    document.createElement(
      "article"
    );

  card.className =
    isChange
      ? "trip-card change-request-card"
      : "trip-card cancel-request-card";

  const badgeClass =
    isChange
      ? "change-request-badge"
      : "cancel-request-badge";

  const badgeText =
    isChange
      ? "変更申請"
      : "中止申請";

  const memberText =
    createMemberText(
      members,
      trip.outside_member_count
    );

  const requestNote =
    isChange
      ? (
          request.proposed_data?.note ||
          "変更内容の記載がありません。"
        )
      : "この山行を中止する申請です。";

  const noteClass =
    isChange
      ? "request-note"
      : "request-note cancel-note";

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

      <span
        class="status-badge ${badgeClass}"
      >
        ${badgeText}
      </span>

    </div>

    ${createTripInformationHtml(
      trip,
      memberText
    )}

    <div class="${noteClass}">
      ${
        isChange
          ? "<strong>変更希望内容</strong><br>"
          : ""
      }
      ${escapeHtml(requestNote)}
    </div>

    <p class="trip-info">
      <strong>申請日時：</strong>
      ${formatDateTime(
        request.created_at
      )}
    </p>

    <div class="button-row">

      <button
        class="reject-button request-reject-button"
        type="button"
      >
        却下する
      </button>

      <button
        class="approve-button request-approve-button"
        type="button"
      >
        承認する
      </button>

    </div>
  `;

  const approveButton =
    card.querySelector(
      ".request-approve-button"
    );

  const rejectButton =
    card.querySelector(
      ".request-reject-button"
    );

  approveButton.addEventListener(
    "click",
    () => approveTripRequest(
      request,
      trip,
      approveButton,
      rejectButton
    )
  );

  rejectButton.addEventListener(
    "click",
    () => rejectTripRequest(
      request,
      approveButton,
      rejectButton
    )
  );

  return card;
}

/* =========================================
   山行情報共通HTML
========================================= */

function createTripInformationHtml(
  trip,
  memberText
) {
  return `
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
  `;
}

/* =========================================
   参加者表示
========================================= */

function createMemberText(
  members,
  outsideMemberCount
) {
  const memberText =
    members.length > 0
      ? members
          .map((member) => {
            return member.isLeader
              ? `${member.name}（代表）`
              : member.name;
          })
          .join("・")
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
   通常の山行届を承認
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

          body:
            JSON.stringify({
              status:
                "approved",

              approved_at:
                new Date()
                  .toISOString()
            })
        }
      );

    if (!response.ok) {
      throw new Error(
        await response.text()
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
   通常の山行届を修正依頼
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

          body:
  JSON.stringify({
    status:
      "revision_required",

    revision_reason:
      "correction"
  })
        }
      );

    if (!response.ok) {
      throw new Error(
        await response.text()
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
   変更・中止申請を承認
========================================= */

async function approveTripRequest(
  request,
  trip,
  approveButton,
  rejectButton
) {
  const isChange =
    request.request_type ===
    "change";

  const confirmed =
    confirm(
      isChange
        ? "変更申請を承認し、提出者へ修正依頼として戻しますか？"
        : "中止申請を承認し、この山行を中止にしますか？"
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
    "承認処理中...";

  try {
    const newTripStatus =
      isChange
        ? "revision_required"
        : "cancelled";

    const revisionReason =
  isChange
    ? "change_approved"
    : null;    

    await updateTripStatus(
  trip.id,
  newTripStatus,
  revisionReason
);

    await updateRequestStatus(
      request.id,
      "approved"
    );

    alert(
      isChange
        ? "変更申請を承認しました。\n提出者のホームに修正依頼として表示されます。"
        : "中止申請を承認しました。"
    );

    await loadAdminTrips();

  } catch (error) {
    console.error(error);

    alert(
      isChange
        ? "変更申請を承認できませんでした。"
        : "中止申請を承認できませんでした。"
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
   変更・中止申請を却下
========================================= */

async function rejectTripRequest(
  request,
  approveButton,
  rejectButton
) {
  const isChange =
    request.request_type ===
    "change";

  const confirmed =
    confirm(
      isChange
        ? "この変更申請を却下しますか？"
        : "この中止申請を却下しますか？"
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
    "却下処理中...";

  try {
    await updateRequestStatus(
      request.id,
      "rejected"
    );

    alert(
      isChange
        ? "変更申請を却下しました。"
        : "中止申請を却下しました。"
    );

    await loadAdminTrips();

  } catch (error) {
    console.error(error);

    alert(
      "申請を却下できませんでした。"
    );

    rejectButton.textContent =
      "却下する";

    setButtonsDisabled(
      approveButton,
      rejectButton,
      false
    );
  }
}

/* =========================================
   山行ステータス更新
========================================= */

async function updateTripStatus(
  tripId,
  status,
  revisionReason = null
) {
  const response =
    await portalFetch(
      `/rest/v1/trips?id=eq.${tripId}`,
      {
        method: "PATCH",

        headers: {
          Prefer:
            "return=minimal"
        },

        body:
  JSON.stringify({
    status,
    revision_reason:
      revisionReason
  })
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      "山行状態の更新に失敗しました。" +
      ` ${response.status} ${errorText}`
    );
  }
}

/* =========================================
   申請ステータス更新
========================================= */

async function updateRequestStatus(
  requestId,
  status
) {
  const member =
    getPortalMember();

  const response =
    await portalFetch(
      `/rest/v1/trip_requests?id=eq.${requestId}`,
      {
        method: "PATCH",

        headers: {
          Prefer:
            "return=minimal"
        },

        body:
          JSON.stringify({
            status,

            reviewed_by:
              member?.authUserId ||
              null,

            reviewed_at:
              new Date()
                .toISOString()
          })
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      "申請状態の更新に失敗しました。" +
      ` ${response.status} ${errorText}`
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

  completeButton.disabled =
    true;

  completeButton.textContent =
    "完了処理中...";

  try {
    await updateTripStatus(
      tripId,
      "completed"
    );

    alert(
      "下山を確認し、山行を完了にしました。"
    );

    await loadAdminTrips();

  } catch (error) {
    console.error(error);

    alert(
      "山行を完了にできませんでした。"
    );

    completeButton.disabled =
      false;

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
  if (approveButton) {
    approveButton.disabled =
      disabled;
  }

  if (rejectButton) {
    rejectButton.disabled =
      disabled;
  }
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