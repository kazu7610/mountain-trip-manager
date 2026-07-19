/* =========================================
   ポンコツ倶楽部
   山行詳細画面
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    if (!requirePortalLogin()) {
      return;
    }

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
    document.getElementById(
      "trip-detail"
    );

  if (!detailContainer) {
    console.error(
      "山行詳細の表示場所が見つかりません。"
    );

    return;
  }

  const tripId =
    getTripId();

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

    const trip =
      trips[0];

    if (!trip) {
      showError(
        detailContainer,
        "指定された山行が見つかりません。"
      );

      return;
    }

    const members =
      await loadTripMembers(
        tripId
      );

       const loginMember =
      getPortalMember();

    const isParticipant =
      members.some(
        (member) =>
          member.id ===
          Number(loginMember?.id)
      );

    const isLeader =
      members.some(
        (member) =>
          member.id ===
            Number(loginMember?.id) &&
          member.isLeader === true
      );

    const isSubmitter =
      Boolean(
        loginMember?.authUserId &&
        trip.submitted_by ===
          loginMember.authUserId
      );

    const pendingRequest =
      await loadPendingTripRequest(
        tripId
      );

    renderTripDetail(
      detailContainer,
      trip,
      members,
      isParticipant,
      isLeader,
      isSubmitter,
      pendingRequest
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

async function loadTripMembers(
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
      id:
        Number(row.member_id),

      name:
        row.members?.name ||
        "不明",

      isLeader:
        row.is_leader === true
    })
  );
}

/* =========================================
   申請中の変更・中止連絡を取得
========================================= */

async function loadPendingTripRequest(
  tripId
) {
  const response =
    await portalFetch(
      "/rest/v1/trip_requests" +
      "?select=id,request_type,status" +
      `&trip_id=eq.${tripId}` +
      "&status=eq.pending" +
      "&order=created_at.desc" +
      "&limit=1"
    );

  if (!response.ok) {
    console.error(
      "申請中データの取得に失敗しました。",
      await response.text()
    );

    return null;
  }

  const rows =
    await response.json();

  return rows[0] || null;
}

/* =========================================
   詳細を表示
========================================= */

function renderTripDetail(
  container,
  trip,
  members,
  isParticipant,
  isLeader,
  isSubmitter,
  pendingRequest
) {

  const memberHtml =
    createMemberHtml(
      members,
      trip.outside_member_count
    );

  const descentActionHtml =
    createDescentActionHtml(
      trip,
      isParticipant
    );

      const requestActionHtml =
    createRequestActionHtml(
      trip,
      isLeader,
      isSubmitter,
      pendingRequest
    );

  container.innerHTML = `
    <article class="detail-card">

      <div class="detail-head">

        <p class="detail-area">
          ${escapeHtml(
            trip.mountain_area
          )}
        </p>

        <h2 class="detail-title">
          ${escapeHtml(
            trip.mountain_name
          )}
        </h2>

        <span class="status-badge">
          ${escapeHtml(
            getStatusLabel(
              trip.status
            )
          )}
        </span>

      </div>

      <div class="detail-body">

        <section class="detail-row">

          <p class="detail-label">
            ルート
          </p>

          <p class="detail-value">
            ${escapeHtml(
              trip.route
            )}
          </p>

        </section>

        <section class="detail-row">

          <p class="detail-label">
            入山日
          </p>

          <p class="detail-value">
            ${formatDate(
              trip.entry_date
            )}
          </p>

        </section>

        <section class="detail-row">

          <p class="detail-label">
            下山予定
          </p>

          <p class="detail-value">
            ${formatDate(
              trip.descent_date
            )}
            ${formatTime(
              trip.descent_time
            )}
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

        ${descentActionHtml}

        ${requestActionHtml}

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

  const descentButton =
  document.getElementById(
    "descent-button"
  );

if (descentButton) {
  descentButton.onclick =
    () => reportDescent(
      trip.id,
      descentButton
    );
}

  const changeRequestButton =
    document.getElementById(
      "change-request-button"
    );

  const cancelRequestButton =
    document.getElementById(
      "cancel-request-button"
    );

  if (changeRequestButton) {
    changeRequestButton.addEventListener(
      "click",
      () => submitChangeRequest(
        trip.id,
        changeRequestButton,
        cancelRequestButton
      )
    );
  }

  if (cancelRequestButton) {
    cancelRequestButton.addEventListener(
      "click",
      () => submitCancelRequest(
        trip.id,
        changeRequestButton,
        cancelRequestButton
      )
    );
  }
}

/* =========================================
   変更・中止申請ボタン表示
========================================= */

function createRequestActionHtml(
  trip,
  isLeader,
  isSubmitter,
  pendingRequest
) {
  if (
    !isLeader &&
    !isSubmitter
  ) {
    return "";
  }

  /*
    承認待ち中は、管理者の承認を待たずに
    提出者またはリーダーが取り消せる
  */
  if (
    trip.status === "submitted"
  ) {
    return `
      <div class="request-button-row">

        <button
          id="cancel-request-button"
          class="cancel-request-button"
          type="button"
        >
          提出を取り消す
        </button>

      </div>
    `;
  }

  /*
    承認済み以外では、
    変更・中止申請ボタンを表示しない
  */
  if (
    trip.status !== "approved"
  ) {
    return "";
  }

  if (pendingRequest) {
    const requestLabel =
      pendingRequest.request_type ===
      "cancel"
        ? "中止申請"
        : "変更申請";

    return `
      <div class="descent-complete">
        ${requestLabel}を管理者が確認中です。
      </div>
    `;
  }

  return `
    <div class="request-button-row">

      <button
        id="change-request-button"
        class="change-request-button"
        type="button"
      >
        変更を申請
      </button>

      <button
        id="cancel-request-button"
        class="cancel-request-button"
        type="button"
      >
        山行を中止
      </button>

    </div>
  `;
}

/* =========================================
   下山ボタン表示
========================================= */

function createDescentActionHtml(
  trip,
  isParticipant
) {
  if (
    trip.status === "descended" ||
    trip.status === "completed"
  ) {
    return `
      <div class="descent-complete">
        下山連絡済み
        ${
          trip.descended_at
            ? `（${formatDateTime(
                trip.descended_at
              )}）`
            : ""
        }
      </div>
    `;
  }

  if (
    trip.status !== "approved"
  ) {
    return "";
  }

  if (!isParticipant) {
    return `
      <div class="descent-complete">
        下山連絡は、この山行の参加者のみ行えます。
      </div>
    `;
  }

  return `
    <button
      id="descent-button"
      class="descent-button"
      type="button"
    >
      下山しました
    </button>
  `;
}

/* =========================================
   変更申請
========================================= */

async function submitChangeRequest(
  tripId,
  changeButton,
  cancelButton
) {
  const loginMember =
    getPortalMember();

  const changeNote =
    prompt(
      "変更したい内容を入力してください。\n\n例：下山予定を17時から18時に変更"
    );

  if (changeNote === null) {
    return;
  }

  const trimmedNote =
    changeNote.trim();

  if (!trimmedNote) {
    alert(
      "変更したい内容を入力してください。"
    );

    return;
  }

  const confirmed =
    confirm(
      "この内容で変更申請を送信しますか？\n\n" +
      trimmedNote
    );

  if (!confirmed) {
    return;
  }

  setRequestButtonsDisabled(
    changeButton,
    cancelButton,
    true
  );

  changeButton.textContent =
    "申請中...";

  try {
    await createTripRequest({
      tripId,
      requestType: "change",
      requestedBy:
        loginMember?.authUserId,
      proposedData: {
        note: trimmedNote
      }
    });

    alert(
      "変更申請を管理者へ送信しました。"
    );

    await loadTripDetail();

  } catch (error) {
    console.error(error);

    alert(
      "変更申請を送信できませんでした。"
    );

    changeButton.textContent =
      "変更を申請";

    setRequestButtonsDisabled(
      changeButton,
      cancelButton,
      false
    );
  }
}

/* =========================================
   山行の中止・承認待ち取り消し
========================================= */

async function submitCancelRequest(
  tripId,
  changeButton,
  cancelButton
) {
  const loginMember =
    getPortalMember();

  if (
    !loginMember?.id ||
    !loginMember?.authUserId
  ) {
    alert(
      "ログイン情報を確認できません。"
    );

    location.href =
      "login.html";

    return;
  }

  setRequestButtonsDisabled(
    changeButton,
    cancelButton,
    true
  );

  try {
    /*
      ボタン表示後に状態や参加者が変わった場合に備えて、
      送信直前に現在の山行情報を確認する
    */
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
        "山行情報の確認に失敗しました。" +
        ` ${tripResponse.status} ${errorText}`
      );
    }

    const trips =
      await tripResponse.json();

    const trip =
      trips[0];

    if (!trip) {
      throw new Error(
        "対象の山行が見つかりません。"
      );
    }

    /*
      提出者またはリーダーか再確認する
    */
    const members =
      await loadTripMembers(
        tripId
      );

    const isLeader =
      members.some(
        (member) =>
          member.id ===
            Number(loginMember.id) &&
          member.isLeader === true
      );

    const isSubmitter =
      trip.submitted_by ===
      loginMember.authUserId;

    if (
      !isLeader &&
      !isSubmitter
    ) {
      alert(
        "提出者またはリーダーではないため、中止できません。"
      );

      await loadTripDetail();

      return;
    }

    /*
      submittedとapprovedだけ中止できる
    */
    if (
      trip.status !== "submitted" &&
      trip.status !== "approved"
    ) {
      alert(
        "現在の山行状態では中止できません。"
      );

      await loadTripDetail();

      return;
    }

    const confirmMessage =
      trip.status === "submitted"
        ? "この山行届の提出を取り消しますか？"
        : "この山行を中止しますか？";

    const confirmed =
      confirm(
        confirmMessage
      );

    if (!confirmed) {
      return;
    }

    cancelButton.textContent =
      trip.status === "submitted"
        ? "取り消し中..."
        : "中止処理中...";

    const cancelResponse =
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
                "cancelled"
            })
        }
      );

    if (!cancelResponse.ok) {
      const errorText =
        await cancelResponse.text();

      throw new Error(
        "山行の中止処理に失敗しました。" +
        ` ${cancelResponse.status} ${errorText}`
      );
    }

    const alertMessage =
      trip.status === "submitted"
        ? "山行届の提出を取り消しました。"
        : "山行を中止しました。";

    alert(
      alertMessage
    );

    location.href =
      "index.html";

  } catch (error) {
    console.error(error);

    alert(
      "中止処理を完了できませんでした。"
    );

    await loadTripDetail();

  } finally {
    setRequestButtonsDisabled(
      changeButton,
      cancelButton,
      false
    );
  }
}

/* =========================================
   trip_requestsへ申請保存
========================================= */

async function createTripRequest({
  tripId,
  requestType,
  requestedBy,
  proposedData
}) {
  const duplicateResponse =
    await portalFetch(
      "/rest/v1/trip_requests" +
      "?select=id" +
      `&trip_id=eq.${tripId}` +
      "&status=eq.pending" +
      "&limit=1"
    );

  if (!duplicateResponse.ok) {
    throw new Error(
      "申請状況を確認できませんでした。"
    );
  }

  const duplicateRows =
    await duplicateResponse.json();

  if (duplicateRows.length > 0) {
    throw new Error(
      "すでに確認中の申請があります。"
    );
  }

  const response =
    await portalFetch(
      "/rest/v1/trip_requests",
      {
        method: "POST",

        headers: {
          Prefer:
            "return=minimal"
        },

        body:
          JSON.stringify({
            trip_id:
              tripId,

            request_type:
              requestType,

            requested_by:
              requestedBy || null,

            status:
              "pending",

            proposed_data:
              proposedData
          })
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      "申請の保存に失敗しました。" +
      ` ${response.status} ${errorText}`
    );
  }
}

/* =========================================
   申請ボタン操作
========================================= */

function setRequestButtonsDisabled(
  changeButton,
  cancelButton,
  disabled
) {
  if (changeButton) {
    changeButton.disabled =
      disabled;
  }

  if (cancelButton) {
    cancelButton.disabled =
      disabled;
  }
}

/* =========================================
   下山連絡
========================================= */

async function reportDescent(
  tripId,
  button
) {


  /*
    ページ全体で下山処理の二重実行を防ぐ
  */
  if (
    window.descentProcessing === true
  ) {
    return;
  }

  window.descentProcessing =
    true;

  button.disabled =
    true;

  const originalText =
    button.textContent;

  try {
    const loginMember =
      getPortalMember();

    if (!loginMember?.id) {
      alert(
        "ログイン情報を確認できません。"
      );

      location.href =
        "login.html";

      return;
    }

    /*
      送信直前に参加者か確認する
    */
    const members =
      await loadTripMembers(
        tripId
      );

    const isParticipant =
      members.some(
        (member) =>
          member.id ===
          Number(loginMember.id)
      );

    if (!isParticipant) {
      alert(
        "この山行の参加者ではないため、下山連絡はできません。"
      );

      await loadTripDetail();

      return;
    }

    const confirmed =
      confirm(
        "全員無事に下山しましたか？"
      );

    if (!confirmed) {
      return;
    }

    button.textContent =
      "下山連絡を送信中...";

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
                "descended",

              descended_at:
                new Date()
                  .toISOString()
            })
        }
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "下山連絡に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    alert(
      "下山連絡を送信しました。"
    );

    await loadTripDetail();

  } catch (error) {
    console.error(error);

    alert(
      "下山連絡を送信できませんでした。"
    );

  } finally {
    window.descentProcessing =
      false;

    button.disabled =
      false;

    button.textContent =
      originalText;
  }
}

/* =========================================
   参加者表示
========================================= */

function createMemberHtml(
  members,
  outsideMemberCount
) {
  const chips = [];

  members.forEach(
    (member) => {
      const leaderText =
        member.isLeader
          ? "（代表）"
          : "";

      chips.push(`
        <span class="member-chip">
          ${escapeHtml(
            member.name
          )}
          ${leaderText}
        </span>
      `);
    }
  );

  const outsideCount =
    Number(
      outsideMemberCount || 0
    );

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

function getStatusLabel(
  status
) {
  const labels = {
    draft:
      "下書き",

    submitted:
      "承認待ち",

    approved:
      "承認済み",

    revision_required:
      "修正依頼",

    cancelled:
      "中止",

    descended:
      "下山連絡済み",

    completed:
      "完了"
  };

  return (
    labels[status] ||
    status ||
    "不明"
  );
}

/* =========================================
   日付表示
========================================= */

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

/* =========================================
   時刻表示
========================================= */

function formatTime(
  value
) {
  if (!value) {
    return "時刻未設定";
  }

  return String(value)
    .slice(0, 5);
}

/* =========================================
   日時表示
========================================= */

function formatDateTime(
  value
) {
  if (!value) {
    return "";
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