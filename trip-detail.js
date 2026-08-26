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

    const applications =
      await loadTripApplications(
        tripId
      );

    const comments =
      await loadTripComments(
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

      const hasDetailedPlan =
  await checkDetailedPlanExists(
    tripId
  );


    renderTripDetail(
  detailContainer,
  trip,
  members,
  applications,
  comments,
  isParticipant,
  isLeader,
  isSubmitter,
  pendingRequest,
  hasDetailedPlan
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

  return rows
  .map(
    (row) => ({
      id:
        Number(row.member_id),

      name:
        row.members?.name ||
        "不明",

      isLeader:
        row.is_leader === true
    })
  )
  .sort(
    (a, b) =>
      Number(b.isLeader) -
      Number(a.isLeader)
  );
}

/* =========================================
   山行参加希望者を読み込む
========================================= */

async function loadTripApplications(
  tripId
) {
  const response =
    await portalFetch(
      "/rest/v1/trip_applications" +
      "?select=*" +
      `&trip_id=eq.${tripId}` +
      "&order=created_at.asc"
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      "参加希望者の取得に失敗しました。" +
      ` ${response.status} ${errorText}`
    );
  }

  return await response.json();
}

/* =========================================
   山行コメントを読み込む
========================================= */

async function loadTripComments(
  tripId
) {
  const response =
    await portalFetch(
      "/rest/v1/trip_comments" +
      "?select=*" +
      `&trip_id=eq.${tripId}` +
      "&order=created_at.asc"
    );

  if (!response.ok) {
    console.error(
      "山行コメントの取得に失敗しました。",
      await response.text()
    );

    return [];
  }

  return await response.json();
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
   詳細計画書の保存有無を確認
========================================= */

async function checkDetailedPlanExists(
  tripId
) {
  const response =
    await portalFetch(
      "/rest/v1/trip_plan_actions" +
      "?select=id" +
      `&trip_id=eq.${tripId}` +
      "&limit=1"
    );

  if (!response.ok) {
    console.error(
      "詳細計画書の確認に失敗しました。",
      await response.text()
    );

    return false;
  }

  const rows =
    await response.json();

  return rows.length > 0;
}


/* =========================================
   詳細を表示
========================================= */

function renderTripDetail(
  container,
  trip,
  members,
  applications,
  comments,
  isParticipant,
  isLeader,
  isSubmitter,
  pendingRequest,
  hasDetailedPlan
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

  const participantCommentButtonHtml =
  isParticipant &&
  trip.status === "approved"
    ? `
        <button
          id="participant-comment-button"
          class="participant-comment-button"
          type="button"
        >
          コメントを書く
        </button>
      `
    : "";  

   const today =
  new Date();

const entryDate =
  trip.entry_date
    ? new Date(`${trip.entry_date}T00:00:00`)
    : null;

const isBeforeEntryDate =
  entryDate &&
  today < entryDate;

const canEditDetailedPlan =
  isLeader &&
  isBeforeEntryDate;

const canOpenDetailedPlanPdf =
  hasDetailedPlan &&
  !canEditDetailedPlan;

const detailedPlanUrl =
  canEditDetailedPlan
    ? (
        "trip-plan.html?id=" +
        encodeURIComponent(
          trip.id
        )
      )
    : (
        "trip-plan-pdf.html?id=" +
        encodeURIComponent(
          trip.id
        )
      );
const detailedPlanButtonText =
  canEditDetailedPlan
    ? (
        hasDetailedPlan
          ? "詳細計画書を編集"
          : "詳細計画書を作成"
      )
    : "詳細計画書PDFを見る";
  let commentsHtml = "";

  const detailedPlanButtonHtml =
  canEditDetailedPlan ||
  canOpenDetailedPlanPdf
    ? `
        <div class="button-row">

          <button
            class="plan-button"
            type="button"
            onclick="location.href='${detailedPlanUrl}'"
          >
            ${detailedPlanButtonText}
          </button>

        </div>
      `
    : "";

if (
  Array.isArray(comments) &&
  comments.length > 0
) {
  const loginMember =
    getPortalMember();

  const canDeleteAllComments =
  loginMember?.role === "super_admin";

  commentsHtml = `
    <section class="detail-row">

      <p class="detail-label">
        コメント
      </p>

      <div class="trip-comment-list">

        ${comments
          .map(
            (comment) => {
              const canDeleteComment =
                canDeleteAllComments ||
                Number(comment.member_id) ===
                  Number(loginMember?.id);

              return `
                <div class="trip-comment-item">

                  <div class="trip-comment-name">
                    ${escapeHtml(
                      comment.member_name ||
                      "氏名不明"
                    )}
                  </div>

                  <div class="trip-comment-message">${escapeHtml(comment.message || "")}</div>

                  <div class="trip-comment-time">
                    ${formatCommentDate(
                      comment.created_at
                    )}
                  </div>

                  ${
                    canDeleteComment
                      ? `
                        <button
                          type="button"
                          class="comment-delete-button"
                          onclick="deleteTripComment(
                            ${Number(comment.id)},
                            ${Number(trip.id)}
                          )"
                        >
                          削除
                        </button>
                      `
                      : ""
                  }

                </div>
              `;
            }
          )
          .join("")}

      </div>

    </section>
  `;
}
  let recruitingHtml = "";

  if (trip.is_recruiting === true) {
    let applicationMemberHtml = "";

    if (
      Array.isArray(applications) &&
      applications.length > 0
    ) {
      applicationMemberHtml =
        applications
          .map(
            (application) => `
              <div class="member-item">
                ${escapeHtml(
                  application.member_name ||
                  "氏名不明"
                )}
              </div>
            `
          )
          .join("");
    } else {
      applicationMemberHtml = `
        <p class="detail-value">
          まだ参加希望者はいません。
        </p>
      `;
    }

    recruitingHtml = `
      <section class="detail-row">

        <p class="detail-label">
          山行募集
        </p>

        <p class="detail-value">
          ${escapeHtml(
            trip.recruiting_message ||
            "募集コメントはありません。"
          )}
        </p>

      </section>

      <section class="detail-row">

        <p class="detail-label">
          参加希望者
        </p>

        <p class="detail-value">
          ${applications.length}名
        </p>

        <div class="member-list">
          ${applicationMemberHtml}
        </div>

      </section>
    `;
  }

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

        ${recruitingHtml}
        ${commentsHtml}

      </div>

    </article>

    ${participantCommentButtonHtml}

${requestActionHtml}

${detailedPlanButtonHtml}

${descentActionHtml}

<div class="button-row">

  <button
    class="home-button"
    type="button"
    onclick="location.href='index.html'"
  >
    ホームへ戻る
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

  const participantCommentButton =
  document.getElementById(
    "participant-comment-button"
  );

if (participantCommentButton) {
  participantCommentButton.addEventListener(
    "click",
    () =>
      submitParticipantComment(
        trip.id,
        participantCommentButton
      )
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

async function submitParticipantComment(
  tripId,
  commentButton
) {
  const member =
    getPortalMember();

  if (
    !member?.id ||
    !member?.name
  ) {
    alert(
      "ログイン情報を確認できません。"
    );

    location.href =
      "login.html";

    return;
  }

  const message =
    prompt(
      "コメントを入力してください。\n\n例：ありがとうございます！行ってきます！"
    );

  if (message === null) {
    return;
  }

  const trimmedMessage =
    message.trim();

  if (!trimmedMessage) {
    alert(
      "コメントを入力してください。"
    );

    return;
  }

  const confirmed =
    confirm(
      "このコメントを投稿しますか？\n\n" +
      trimmedMessage
    );

  if (!confirmed) {
    return;
  }

  commentButton.disabled =
    true;

  commentButton.textContent =
    "送信中...";

  try {
    const response =
      await portalFetch(
        "/rest/v1/trip_comments",
        {
          method: "POST",

          headers: {
            Prefer:
              "return=minimal"
          },

          body:
            JSON.stringify({
              trip_id:
                Number(tripId),

              member_id:
                Number(member.id),

              member_name:
                member.name,

              message:
                trimmedMessage
            })
        }
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "コメントの保存に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    try {
  await notifyTripParticipantsAndAdmins({
    tripId,

    title:
      "山行コメント",

    body:
      `${member.name}さん：${trimmedMessage}`,

    url:
      `/mountain-trip-manager/trip-detail.html?id=${tripId}`,

    badge:
      1
  });

} catch (notificationError) {
  console.error(
    "山行コメントのPush通知を送信できませんでした。",
    notificationError
  );
}

    alert(
      "コメントを投稿しました。"
    );

    await loadTripDetail();

  } catch (error) {
    console.error(error);

    alert(
      "コメントを投稿できませんでした。"
    );

  } finally {
    commentButton.disabled =
      false;

    commentButton.textContent =
      "コメントを書く";
  }
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

        /*
     * 変更申請を、
     * 本人以外の有効会員全員へ通知
     */
    try {
      await notifyAllMembersExceptSender({
        title:
          "山行の変更申請",

        body:
          `${loginMember?.name || "会員"}さん：${trimmedNote}`,

        url:
          `/mountain-trip-manager/trip-detail.html?id=${tripId}`,

        badge:
          1
      });

    } catch (notificationError) {
      console.error(
        "変更申請のPush通知を送信できませんでした。",
        notificationError
      );
    }

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

            /*
     * 提出取り消し・山行中止を、
     * 本人以外の有効会員全員へ通知
     */
    try {
      await notifyAllMembersExceptSender({
        title:
          trip.status === "submitted"
            ? "山行届の提出が取り消されました"
            : "山行が中止されました",

        body:
          trip.status === "submitted"
            ? `${loginMember.name}さんが山行届の提出を取り消しました。`
            : `${loginMember.name}さんが山行を中止しました。`,

        url:
          `/mountain-trip-manager/trip-detail.html?id=${tripId}`,

        badge:
          1
      });

    } catch (notificationError) {
      console.error(
        "提出取り消し・山行中止のPush通知を送信できませんでした。",
        notificationError
      );
    }

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

        /*
     * 下山連絡を、
     * 本人以外の有効会員全員へ通知
     */
    try {
      await notifyAllMembersExceptSender({
        title:
          "下山連絡",

        body:
          `${loginMember.name}さんから無事下山の連絡がありました。`,

        url:
          `/mountain-trip-manager/trip-detail.html?id=${tripId}`,

        badge:
          1
      });

    } catch (notificationError) {
      console.error(
        "下山連絡のPush通知を送信できませんでした。",
        notificationError
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

async function deleteTripComment(
  commentId,
  tripId
) {
  const confirmed =
    confirm(
      "このコメントを削除しますか？"
    );

  if (!confirmed) {
    return;
  }

  try {
    const response =
      await portalFetch(
        `/rest/v1/trip_comments?id=eq.${commentId}`,
        {
          method: "DELETE",
          headers: {
            Prefer:
              "return=minimal"
          }
        }
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "コメント削除に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    await loadTripDetail();

  } catch (error) {
    console.error(error);

    alert(
      "コメントを削除できませんでした。"
    );
  }
}

/* =========================================
   コメント日時表示
========================================= */

function formatCommentDate(
  value
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  const now =
    new Date();

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return new Intl.DateTimeFormat(
      "ja-JP",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    ).format(date);
  }

  const isSameYear =
    date.getFullYear() === now.getFullYear();

  if (isSameYear) {
    return new Intl.DateTimeFormat(
      "ja-JP",
      {
        month: "numeric",
        day: "numeric"
      }
    ).format(date);
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric"
    }
  ).format(date);
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