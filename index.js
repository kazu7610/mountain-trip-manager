/* =========================================
   ポンコツ倶楽部
   ホーム画面
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    if (!requirePortalLogin()) {
      return;
    }

    initializeHomeLogin();
    setupPullToRefresh();
    refreshHomeData();
  }
);

/* =========================================
   ホーム画面の情報をまとめて更新
========================================= */

async function refreshHomeData() {
  await Promise.all([
    loadDraftTrips(),
    loadRevisionTrips(),
    loadRejectedChangeRequests(),
    loadAdminChangeRequestNotice(),
    loadApprovalWaitingCount(),
    loadSubmittedCount(),
    loadHomeTrips()
  ]);
}

function showPullRefreshStatus(
  message,
  isError = false
) {
  const statusElement =
    document.getElementById(
      "pull-refresh-status"
    );

  if (!statusElement) {
    return;
  }

  statusElement.textContent =
    message;

  statusElement.hidden =
    false;

  statusElement.style.color =
    isError
      ? "#bd3838"
      : "#176a99";
}

function hidePullRefreshStatus() {
  const statusElement =
    document.getElementById(
      "pull-refresh-status"
    );

  if (!statusElement) {
    return;
  }

  statusElement.hidden =
    true;
}

/* =========================================
   下に引っ張って更新
========================================= */

let pullStartY = 0;
let pullCurrentY = 0;
let isPulling = false;
let isRefreshingHome = false;

function setupPullToRefresh() {
  document.addEventListener(
    "touchstart",
    (event) => {
      if (
        window.scrollY !== 0 ||
        event.touches.length !== 1 ||
        isRefreshingHome
      ) {
        return;
      }

      pullStartY =
        event.touches[0].clientY;

      pullCurrentY =
        pullStartY;

      isPulling = true;
    },
    {
      passive: true
    }
  );

  document.addEventListener(
    "touchmove",
    (event) => {
      if (
        !isPulling ||
        event.touches.length !== 1
      ) {
        return;
      }

      pullCurrentY =
        event.touches[0].clientY;

      if (
        pullCurrentY <
        pullStartY
      ) {
        isPulling = false;
      }
    },
    {
      passive: true
    }
  );

  document.addEventListener(
    "touchend",
    async () => {
      if (!isPulling) {
        return;
      }

      const pullDistance =
        pullCurrentY -
        pullStartY;

      isPulling = false;
      pullStartY = 0;
      pullCurrentY = 0;

      if (pullDistance < 80) {
        return;
      }

      

      isRefreshingHome = true;

showPullRefreshStatus(
  "最新情報を取得中…"
);

try {
  await refreshHomeData();

  showPullRefreshStatus(
    "最新情報に更新しました"
  );

  setTimeout(
    hidePullRefreshStatus,
    1800
  );

} catch (error) {
  console.error(
    "ホーム画面の更新に失敗しました。",
    error
  );

  showPullRefreshStatus(
    "通信に失敗しました。現在の表示を残しています。",
    true
  );

  setTimeout(
    hidePullRefreshStatus,
    3000
  );

} finally {
  isRefreshingHome = false;
}
    }
  );
}

/* =========================================
   ホーム画面のログイン表示
========================================= */

async function initializeHomeLogin() {
  const member =
    getPortalMember();

  const userNameElement =
    document.getElementById(
      "login-user-name"
    );

  const logoutButton =
    document.getElementById(
      "logout-button"
    );

  const adminButton =
    document.getElementById(
      "admin-button"
    );

  const notificationButton =
    document.getElementById(
      "enable-notification-button"
    );

  const notificationEnabledStatus =
    document.getElementById(
      "notification-enabled-status"
    );

  if (!member) {
    window.location.href =
      "login.html";

    return;
  }

  if (userNameElement) {
    userNameElement.textContent =
      `${member.name} さん`;
  }

  if (logoutButton) {
    logoutButton.addEventListener(
      "click",
      logoutPortal
    );
  }

  if (adminButton) {
    adminButton.hidden =
      ![
  "super_admin",
  "admin"
].includes(
  member.role
);
  }

  if (
    !notificationButton ||
    !notificationEnabledStatus
  ) {
    console.error(
      "通知表示の要素が見つかりません。"
    );

    return;
  }

  notificationButton.addEventListener(
    "click",
    async () => {
      const enabled =
        await enablePushNotifications(
          notificationButton
        );

      if (enabled) {
        notificationButton.hidden =
          true;

        notificationEnabledStatus.hidden =
          false;
      }
    }
  );

  try {
    const isEnabled =
      await isPushNotificationEnabled();

    if (isEnabled) {
      notificationButton.hidden =
        true;

      notificationEnabledStatus.hidden =
        false;

    } else {
      notificationButton.hidden =
        false;

      notificationButton.disabled =
        false;

      notificationButton.textContent =
        "🔔 通知を有効にする";

      notificationEnabledStatus.hidden =
        true;
    }

  } catch (error) {
    console.error(
      "通知状態を確認できませんでした。",
      error
    );

    notificationButton.hidden =
      false;

    notificationButton.disabled =
      false;

    notificationButton.textContent =
      "🔔 通知を有効にする";

    notificationEnabledStatus.hidden =
      true;
  }
}

/* =========================================
   管理者向け変更申請通知
========================================= */

async function loadAdminChangeRequestNotice() {
  const section =
    document.getElementById(
      "admin-change-request-section"
    );

  if (!section) {
    return;
  }

  const member =
    getPortalMember();

  if (
    ![
  "super_admin",
  "admin"
].includes(
  member?.role
)
  ) {
    section.hidden = true;

    return;
  }

  try {
    const response =
      await portalFetch(
        "/rest/v1/trip_requests" +
        "?select=id" +
        "&request_type=eq.change" +
        "&status=eq.pending" +
        "&limit=1"
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "変更申請の確認に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    const requests =
      await response.json();

    section.hidden =
      requests.length === 0;

  } catch (error) {
    console.error(
      "変更申請通知を読み込めませんでした。",
      error
    );

    section.hidden = true;
  }
}

/* =========================================
   修正依頼の山行届を取得
========================================= */

async function loadRevisionTrips() {
  const revisionSection =
    document.getElementById(
      "revision-section"
    );

  const revisionTripList =
    document.getElementById(
      "revision-trip-list"
    );

  const member =
    getPortalMember();

  if (
    !revisionSection ||
    !revisionTripList ||
    !member?.authUserId
  ) {
    return;
  }

  try {
    const response =
      await portalFetch(
        "/rest/v1/trips" +
        "?select=*" +
        "&status=eq.revision_required" +
        `&submitted_by=eq.${member.authUserId}` +
        "&order=submitted_at.desc"
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "修正依頼の取得に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    const trips =
      await response.json();

    if (
      !Array.isArray(trips) ||
      trips.length === 0
    ) {
      revisionSection.hidden = true;
      revisionTripList.innerHTML = "";

      return;
    }

    revisionSection.hidden = false;
    revisionTripList.innerHTML = "";

    trips.forEach((trip) => {
      const card =
        createRevisionTripCard(
          trip
        );

      revisionTripList.appendChild(
        card
      );
    });

  } catch (error) {
    console.error(error);

    throw error;
  }
}

/* =========================================
   修正依頼カードを作成
========================================= */

function createRevisionTripCard(
  trip
) {
  const card =
    document.createElement(
      "article"
    );

  card.className =
    "trip-card revision-card";

      const revisionMessage =
    trip.revision_reason ===
    "change_approved"
      ? "変更内容を確認しました。再度提出をお願いします。"
      : "変更内容を確認しました。再度提出をお願いします。";

  card.innerHTML = `
    <div class="compact-title-row">

      <h3 class="trip-title">
        ${escapeHtml(
          trip.mountain_area
        )}
        ${escapeHtml(
          trip.mountain_name
        )}
      </h3>

      <span class="status-badge status-revision">
        修正依頼
      </span>

    </div>

    <p class="trip-info">
      <strong>入山日：</strong>
      ${formatShortDate(
        trip.entry_date
      )}
    </p>

    <p class="trip-info">
      <strong>ルート：</strong>
      ${escapeHtml(
        trip.route
      )}
    </p>

    <p class="trip-info">
      ${escapeHtml(
        revisionMessage
      )}
    </p>

    <div class="button-row">

      <button
        class="detail-button"
        type="button"
        onclick="location.href='trip-form.html?edit=${trip.id}'"
      >
        修正する
      </button>

    </div>
  `;

  return card;
}

/* =========================================
   承認待ち件数を取得
========================================= */

async function loadApprovalWaitingCount() {
  const countElement =
    document.getElementById(
      "approval-waiting-count"
    );

  if (!countElement) {
    console.error(
      "承認待ち件数の表示場所が見つかりません。"
    );

    return;
  }

  try {
    const response = await portalFetch(
      "/rest/v1/trips" +
      "?select=id" +
      "&status=eq.submitted",
      {
        headers: {
          Prefer: "count=exact"
        }
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "承認待ち件数の取得に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    const contentRange =
      response.headers.get(
        "content-range"
      );

    let count = 0;

    if (contentRange) {
      const countText =
        contentRange.split("/")[1];

      if (countText !== "*") {
        count =
          Number(countText) || 0;
      }
    } else {
      const rows =
        await response.json();

      count =
        Array.isArray(rows)
          ? rows.length
          : 0;
    }

    countElement.innerHTML =
  `${count}<span>件</span>`;

  } catch (error) {
    console.error(error);

    throw error;
  }
}

/* =========================================
   ホーム用山行一覧を読み込む
========================================= */

async function loadHomeTrips() {
  const cancelledTripSection =
    document.getElementById(
      "cancelled-trip-section"
    );

  const cancelledTripList =
    document.getElementById(
      "cancelled-trip-list"
    );

  const recruitingSection =
    document.getElementById(
      "recruiting-section"
    );

  const recruitingTripList =
    document.getElementById(
      "recruiting-trip-list"
    );

  const todayTripList =
    document.getElementById(
      "today-trip-list"
    );

  const todayDescentList =
    document.getElementById(
      "today-descent-list"
    );

  if (
    !cancelledTripSection ||
    !cancelledTripList ||
    !recruitingSection ||
    !recruitingTripList ||
    !todayTripList ||
    !todayDescentList
  ) {
    console.error(
      "ホーム画面の山行表示場所が見つかりません。"
    );

    return;
  }

  try {
    const today =
      getTodayString();

    const loginMember =
      getPortalMember();

      const detailedPlanTripIds =
  await loadDetailedPlanTripIds();
  
    /*
     * 本日の山行・下山・中止のお知らせを取得
     */
    const response =
      await portalFetch(
        "/rest/v1/trips" +
        "?select=*" +
        "&status=in.(approved,descended,cancelled)" +
        `&entry_date=lte.${today}` +
        `&descent_date=gte.${today}` +
        "&order=descent_date.asc,descent_time.asc"
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "山行一覧の取得に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    const trips =
      await response.json();

    const cancelledTrips = [];
    const todayTrips = [];
    const todayDescents = [];

    for (const trip of trips) {
      const memberNames =
        await loadTripMemberNames(
          trip.id
        );

      const leaderName =
        getLeaderName(
          memberNames
        );

      const comments =
        await loadTripComments(
          trip.id
        );

      const isParticipant =
        memberNames.some(
          (member) =>
            member.memberId ===
            Number(loginMember?.id)
        );

      const item = {
  ...trip,
  memberNames,
  leaderName,
  isParticipant,
  comments,

  hasDetailedPlan:
    detailedPlanTripIds.has(
      Number(trip.id)
    )
};

      /*
       * 中止済みはホーム上部へ表示
       */
      if (
        trip.status === "cancelled"
      ) {
        cancelledTrips.push(item);

        continue;
      }

      /*
       * 承認済みは本日の山行へ表示
       */
      if (
        trip.status === "approved"
      ) {
        todayTrips.push(item);
      }

      /*
       * 下山日が今日の山行を表示
       */
      if (
        trip.descent_date === today
      ) {
        todayDescents.push(item);
      }
    }

    if (
      cancelledTrips.length > 0
    ) {
      cancelledTripSection.hidden =
        false;

      renderTodayTrips(
        cancelledTripList,
        cancelledTrips
      );
    } else {
      cancelledTripSection.hidden =
        true;

      cancelledTripList.innerHTML =
        "";
    }

    renderTodayTrips(
      todayTripList,
      todayTrips
    );

    renderTodayDescents(
      todayDescentList,
      todayDescents
    );

    /*
     * 募集中の承認済み山行を取得
     */
    const recruitingResponse =
      await portalFetch(
        "/rest/v1/trips" +
        "?select=*" +
        "&status=eq.approved" +
        "&is_recruiting=eq.true" +
        `&entry_date=gt.${today}` +
        "&order=entry_date.asc,descent_time.asc"
      );

    if (!recruitingResponse.ok) {
      const errorText =
        await recruitingResponse.text();

      throw new Error(
        "山行募集の取得に失敗しました。" +
        ` ${recruitingResponse.status} ${errorText}`
      );
    }

    const recruitingTrips =
      await recruitingResponse.json();

    if (
      recruitingTrips.length === 0
    ) {
      recruitingSection.hidden =
        true;

      recruitingTripList.innerHTML =
        "";

      return;
    }

    recruitingSection.hidden =
      false;

    recruitingTripList.innerHTML =
      "";

    for (
      const trip of recruitingTrips
    ) {

      trip.hasDetailedPlan =
  detailedPlanTripIds.has(
    Number(trip.id)
  );

      const memberNames =
        await loadTripMemberNames(
          trip.id
        );

      const leaderName =
        getLeaderName(
          memberNames
        );

      const applications =
        await loadTripApplications(
          trip.id
        );

      const isParticipant =
        memberNames.some(
          (member) =>
            member.memberId ===
            Number(loginMember?.id)
        );

      const myApplication =
        applications.find(
          (application) =>
            Number(
              application.member_id
            ) ===
            Number(loginMember?.id)
        );

      let applicationButtonHtml = "";

      if (isParticipant) {
        applicationButtonHtml = `
          <button
            class="detail-button"
            type="button"
            disabled
          >
            参加者として登録済み
          </button>
        `;
      } else if (myApplication) {
        applicationButtonHtml = `
          <button
            class="detail-button"
            type="button"
            onclick="cancelTripApplication(${trip.id})"
          >
            参加希望を取り消す
          </button>
        `;
      } else {
        applicationButtonHtml = `
          <button
            class="detail-button"
            type="button"
            onclick="submitTripApplication(${trip.id})"
          >
            参加を希望する
          </button>
        `;
      }

      const card =
        document.createElement(
          "article"
        );

      card.className =
        "trip-card recruiting";

      card.innerHTML = `
        <div class="compact-title-row">

          <h3 class="trip-title">
            ${escapeHtml(
              trip.mountain_area
            )}
            ${escapeHtml(
              trip.mountain_name
            )}
          </h3>

          <span class="trip-leader">
            ${escapeHtml(
              leaderName
            )}
          </span>

        </div>

        <div class="status-row">

          <span class="status-badge status-recruiting">
            参加者募集中
          </span>

          <span class="trip-date">
            ${formatTripPeriod(
              trip.entry_date,
              trip.descent_date
            )}
          </span>

        </div>

        <p class="trip-info">
          ${escapeHtml(
            trip.recruiting_message ||
            "募集コメントはありません。"
          )}
        </p>

        <p class="trip-info">
          参加希望
          <strong>
            ${applications.length}名
          </strong>
        </p>

        <div class="button-row">

          <button
            class="detail-button"
            type="button"
            onclick="location.href='trip-detail.html?id=${trip.id}'"
          >
            詳細を見る
          </button>

          ${applicationButtonHtml}

        </div>
      `;

      recruitingTripList.appendChild(
        card
      );
    }

 } catch (error) {
  console.error(
    "ホーム画面の山行情報を読み込めませんでした。",
    error
  );

  throw error;
}
}

/* =========================================
   詳細計画書がある山行IDを取得
========================================= */

async function loadDetailedPlanTripIds() {
  const response =
    await portalFetch(
      "/rest/v1/trip_plan_actions" +
      "?select=trip_id"
    );

  if (!response.ok) {
    console.error(
      "詳細計画書の有無を確認できませんでした。",
      await response.text()
    );

    return new Set();
  }

  const rows =
    await response.json();

  return new Set(
    rows.map(
      (row) =>
        Number(row.trip_id)
    )
  );
}

/* =========================================
   山行参加者を読み込む
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

  return rows
  .map(
    (row) => ({
      memberId:
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
    console.error(
      "参加希望者の取得に失敗しました。",
      await response.text()
    );

    return [];
  }

  return await response.json();
}

/* =========================================
   山行へ参加希望を登録
========================================= */

async function submitTripApplication(
  tripId
) {
  const loginMember =
    getPortalMember();


  if (!loginMember?.id) {
    alert(
      "ログイン情報を確認できません。もう一度ログインしてください。"
    );

    location.href =
      "login.html";

    return;
  }

  const confirmed =
    confirm(
      "この山行への参加を希望しますか？"
    );

  if (!confirmed) {
    return;
  }

  try {
    const response =
      await portalFetch(
        "/rest/v1/trip_applications",
        {
          method:
            "POST",

          headers: {
            Prefer:
              "return=minimal"
          },

          body:
            JSON.stringify({
              trip_id:
                Number(tripId),

              member_id:
                Number(loginMember.id),

              member_name:
                loginMember.name ||
                "氏名不明"
            })
        }
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "参加希望の登録に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

        /*
     * 参加希望を、
     * 本人以外の有効会員全員へ通知
     */
    try {
      await notifyAllMembersExceptSender({
        title:
          "山行への参加希望",

        body:
          `${loginMember.name}さんが山行への参加を希望しました。`,

        url:
          `/mountain-trip-manager/trip-detail.html?id=${tripId}`,

        badge:
          1
      });

    } catch (notificationError) {
      console.error(
        "参加希望のPush通知を送信できませんでした。",
        notificationError
      );
    }

    alert(
      "参加希望を登録しました。"
    );

    await loadHomeTrips();

  } catch (error) {
    console.error(error);

    alert(
      "参加希望を登録できませんでした。"
    );
  }
}

/* =========================================
   山行への参加希望を取り消す
========================================= */

async function cancelTripApplication(
  tripId
) {
  const loginMember =
    getPortalMember();

  if (!loginMember?.id) {
    alert(
      "ログイン情報を確認できません。もう一度ログインしてください。"
    );

    location.href =
      "login.html";

    return;
  }

  const confirmed =
    confirm(
      "この山行への参加希望を取り消しますか？"
    );

  if (!confirmed) {
    return;
  }

  try {
    const response =
      await portalFetch(
        "/rest/v1/trip_applications" +
        `?trip_id=eq.${Number(tripId)}` +
        `&member_id=eq.${Number(loginMember.id)}`,
        {
          method:
            "DELETE",

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
        "参加希望の取り消しに失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

        /*
     * 参加希望の取り消しを、
     * 本人以外の有効会員全員へ通知
     */
    try {
      await notifyAllMembersExceptSender({
        title:
          "山行参加希望の取り消し",

        body:
          `${loginMember.name}さんが参加希望を取り消しました。`,

        url:
          `/mountain-trip-manager/trip-detail.html?id=${tripId}`,

        badge:
          1
      });

    } catch (notificationError) {
      console.error(
        "参加希望取り消しのPush通知を送信できませんでした。",
        notificationError
      );
    }

    alert(
      "参加希望を取り消しました。"
    );

    await loadHomeTrips();

  } catch (error) {
    console.error(error);

    alert(
      "参加希望を取り消せませんでした。"
    );
  }
}

/* =========================================
   代表者名を決める
========================================= */

function getLeaderName(
  memberNames
) {
  const leader =
    memberNames.find(
      (member) =>
        member.isLeader
    );

  if (leader) {
    return leader.name;
  }

  return (
    memberNames[0]?.name ||
    "未設定"
  );
}

/* =========================================
   本日の山行を表示
========================================= */

function renderTodayTrips(
  container,
  trips
) {
  if (trips.length === 0) {
    container.innerHTML = `
      <div class="empty-message">
        本日の山行はありません。
      </div>
    `;

    return;
  }

  container.innerHTML = "";

  trips.forEach((trip) => {
    const card =
      createTodayTripCard(
        trip
      );

    container.appendChild(
      card
    );
  });
}

/* =========================================
   本日の下山を表示
========================================= */

function renderTodayDescents(
  container,
  trips
) {
  if (trips.length === 0) {
    container.innerHTML = `
      <div class="empty-message">
        本日の下山予定はありません。
      </div>
    `;

    return;
  }

  container.innerHTML = "";

  trips.forEach((trip) => {
    const card =
      createTodayDescentCard(
        trip
      );

    container.appendChild(
      card
    );
  });
}

/* =========================================
   本日の山行カード
========================================= */

function createTodayTripCard(
  trip
) {
  const card =
    document.createElement(
      "article"
    );

  const member =
    getPortalMember();

  const isAdmin =
  [
    "super_admin",
    "admin"
  ].includes(
    member?.role
  );

  const isCancelled =
    trip.status === "cancelled";

  const isOverdue =
    isTripOverdue(
      trip
    );

  card.className =
    isCancelled
      ? "trip-card cancelled"
      : "trip-card active";

  const statusHtml =
    isCancelled
      ? `
        <div class="cancelled-message">
          この山行は中止になりました
        </div>
      `
      : `
        <div class="status-row">

          <span class="status-badge status-active">
            山行中
          </span>

          <span class="trip-date">
            ${formatTripPeriod(
              trip.entry_date,
              trip.descent_date
            )}
          </span>

        </div>
      `;

  const overdueHtml =
    isOverdue
      ? `
        <div class="trip-alert-message">
          下山予定時刻が過ぎています
        </div>
      `
      : "";
  

  const comments =
  Array.isArray(
    trip.comments
  )
    ? trip.comments.filter(
        (comment) => {
          if (!trip.descended_at) {
            return true;
          }

          return (
            new Date(
              comment.created_at
            ) <
            new Date(
              trip.descended_at
            )
          );
        }
      )
    : [];

  const commentsHtml =
    comments
      .map(
        (comment) => {
          const commentDate =
  comment.created_at
    ? new Date(
        comment.created_at
      )
    : null;

const today =
  new Date();

const isToday =
  commentDate &&
  commentDate.getFullYear() ===
    today.getFullYear() &&
  commentDate.getMonth() ===
    today.getMonth() &&
  commentDate.getDate() ===
    today.getDate();

const commentTime =
  !commentDate
    ? "日時不明"
    : isToday
      ? commentDate.toLocaleTimeString(
          "ja-JP",
          {
            hour:
              "2-digit",
            minute:
              "2-digit"
          }
        )
      : `${commentDate.getMonth() + 1}/${commentDate.getDate()}`;

          return `
            <div class="trip-comment-message">
              ${escapeHtml(
                commentTime
              )}：
              ${escapeHtml(
                comment.message ||
                ""
              )}：
              ${escapeHtml(
                comment.member_name ||
                "氏名不明"
              )}
            </div>
          `;
        }
      )
      .join("");

  const commentButtonHtml =
    !isCancelled &&
    trip.status === "approved" &&
    trip.isParticipant
      ? `
        <button
          class="trip-comment-button"
          type="button"
        >
          状況を連絡
        </button>
      `
      : "";

        const adminCommentButtonHtml =
    !isCancelled &&
    trip.status === "approved" &&
    isAdmin
      ? `
        <button
          class="admin-comment-button"
          type="button"
        >
          管理者コメント
        </button>
      `
      : "";

  const completeButtonHtml =
    isCancelled &&
    isAdmin
      ? `
        <button
          class="cancel-complete-button"
          type="button"
        >
          確認して完了
        </button>
      `
      : "";

  card.innerHTML = `
    <div class="compact-title-row">

      <h3 class="trip-title">
        ${escapeHtml(
          trip.mountain_area
        )}
        ${escapeHtml(
          trip.mountain_name
        )}
      </h3>

      <span class="trip-leader">
        ${escapeHtml(
          trip.leaderName
        )}
      </span>

    </div>

    ${statusHtml}

    ${createDetailedPlanBadgeHtml(
  trip
)}

    ${overdueHtml}

    ${commentsHtml}

    <div class="button-row">

      <button
        class="detail-button"
        type="button"
        onclick="location.href='trip-detail.html?id=${trip.id}'"
      >
        詳細を見る
      </button>

      ${commentButtonHtml}
      ${adminCommentButtonHtml}
      ${completeButtonHtml}

    </div>
  `;

  const commentButton =
    card.querySelector(
      ".trip-comment-button"
    );

  if (commentButton) {
    commentButton.addEventListener(
      "click",
      () =>
        submitTripComment(
          trip.id,
          commentButton
        )
    );
  }

    const adminCommentButton =
    card.querySelector(
      ".admin-comment-button"
    );

  if (adminCommentButton) {
  adminCommentButton.addEventListener(
    "click",
    () =>
      submitTripComment(
        trip.id,
        adminCommentButton
      )
  );
}

  const completeButton =
    card.querySelector(
      ".cancel-complete-button"
    );

  if (completeButton) {
    completeButton.addEventListener(
      "click",
      () =>
        completeCancelledTrip(
          trip.id,
          completeButton
        )
    );
  }

  return card;
}

/* =========================================
   山行状況コメントを送信
========================================= */

async function submitTripComment(
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
      "山行中の状況を入力してください。\n\n例：下山が1時間ほど遅れる見込みです。"
    );

  if (message === null) {
    return;
  }

  const trimmedMessage =
    message.trim();

  if (!trimmedMessage) {
    alert(
      "状況を入力してください。"
    );

    return;
  }

  const confirmed =
    confirm(
      "この内容を全員に表示しますか？\n\n" +
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
    /*
      送信直前に、この山行の参加者か確認する
    */
    const memberResponse =
      await portalFetch(
        "/rest/v1/trip_members" +
        "?select=id" +
        `&trip_id=eq.${tripId}` +
        `&member_id=eq.${Number(member.id)}` +
        "&limit=1"
      );

    if (!memberResponse.ok) {
      const errorText =
        await memberResponse.text();

      throw new Error(
        "参加者情報の確認に失敗しました。" +
        ` ${memberResponse.status} ${errorText}`
      );
    }

    const memberRows =
      await memberResponse.json();

    if (
  memberRows.length === 0 &&
  ![
  "super_admin",
  "admin"
].includes(
  member.role
)
) {
      alert(
        "この山行の参加者ではないため、状況を連絡できません。"
      );

      await loadHomeTrips();

      return;
    }

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
                tripId,

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
        "状況連絡の保存に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

        /*
     * 状況連絡を、
     * 本人以外の有効会員全員へ通知
     */
    try {
      await notifyAllMembersExceptSender({
        title:
          "山行中の状況連絡",

        body:
          `${member.name}さん：${trimmedMessage}`,

        url:
          `/mountain-trip-manager/trip-detail.html?id=${tripId}`,

        badge:
          1
      });

    } catch (notificationError) {
      console.error(
        "状況連絡のPush通知を送信できませんでした。",
        notificationError
      );
    }

    alert(
      "状況を送信しました。"
    );

    await loadHomeTrips();

  } catch (error) {
    console.error(error);

    alert(
      "状況を送信できませんでした。"
    );

  } finally {
    commentButton.disabled =
      false;

    commentButton.textContent =
      "状況を連絡";
  }
}

/* =========================================
   下山後コメントを送信
========================================= */

async function submitDescentComment(
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
      "下山後のコメントを入力してください。\n\n例：お疲れさまでした！"
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
      "このコメントを全員に表示しますか？\n\n" +
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
          method:
            "POST",

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
      await notifyAllMembersExceptSender({
        title:
          "下山後コメント",

        body:
          `${member.name}さん：${trimmedMessage}`,

        url:
          `/mountain-trip-manager/trip-detail.html?id=${tripId}`,

        badge:
          1
      });

    } catch (notificationError) {
      console.error(
        "下山後コメントの通知を送信できませんでした。",
        notificationError
      );
    }

    alert(
      "コメントを送信しました。"
    );

    await loadHomeTrips();

  } catch (error) {
    console.error(error);

    alert(
      "コメントを送信できませんでした。"
    );

  } finally {
    commentButton.disabled =
      false;

    commentButton.textContent =
      "ひとこと";
  }
}

/* =========================================
   中止確認して完了
========================================= */

async function completeCancelledTrip(
  tripId,
  completeButton
) {
  const member =
    getPortalMember();

  if (
    ![
  "super_admin",
  "admin"
].includes(
  member?.role
)
  ) {
    alert(
      "管理者だけが完了処理できます。"
    );

    return;
  }

  const confirmed =
    confirm(
      "中止を確認し、この山行を完了にしますか？"
    );

  if (!confirmed) {
    return;
  }

  completeButton.disabled =
    true;

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

          body:
            JSON.stringify({
              status:
                "completed"
            })
        }
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "中止確認の完了処理に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    alert(
      "中止を確認し、山行を完了にしました。"
    );

    await loadHomeTrips();

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
   本日の下山カード
========================================= */

function createTodayDescentCard(
  trip
) {
  const card =
    document.createElement(
      "article"
    );

  const isDescended =
    trip.status ===
    "descended";

  const plannedDescent =
    new Date(
      `${trip.descent_date}T${trip.descent_time}`
    );

  const isOverdue =
    !isDescended &&
    !Number.isNaN(
      plannedDescent.getTime()
    ) &&
    new Date() > plannedDescent;

  card.className =
    isDescended
      ? "trip-card descent-completed"
      : isOverdue
        ? "trip-card descent descent-overdue"
        : "trip-card descent";

  const statusLabel =
    isDescended
      ? "無事下山"
      : "下山予定";

  const statusClass =
    isDescended
      ? "status-descended"
      : "status-descent";

  const timeText =
    isDescended
      ? ""
      : `
        <span class="trip-date">
          ${formatTime(
            trip.descent_time
          )}
        </span>
      `;

  const overdueHtml =
    isOverdue
      ? `
        <div class="descent-overdue-message">
          下山予定時刻が過ぎています
        </div>
      `
      : "";

     const comments =
  Array.isArray(
    trip.comments
  )
    ? trip.comments.filter(
        (comment) => {
          if (!trip.descended_at) {
            return false;
          }

          return (
            new Date(
              comment.created_at
            ) >
            new Date(
              trip.descended_at
            )
          );
        }
      )
    : [];

    const commentsHtml =
  comments
    .map(
      (comment) => {

const commentDate =
  comment.created_at
    ? new Date(
        comment.created_at
      )
    : null;

const today =
  new Date();

const isToday =
  commentDate &&
  commentDate.getFullYear() ===
    today.getFullYear() &&
  commentDate.getMonth() ===
    today.getMonth() &&
  commentDate.getDate() ===
    today.getDate();

const commentTime =
  !commentDate
    ? "日時不明"
    : isToday
      ? commentDate.toLocaleTimeString(
          "ja-JP",
          {
            hour:
              "2-digit",
            minute:
              "2-digit"
          }
        )
      : `${commentDate.getMonth() + 1}/${commentDate.getDate()}`;

        return `
          <div class="trip-comment-message">
            ${escapeHtml(
              commentTime
            )}：
            ${escapeHtml(
              comment.message ||
              ""
            )}：
            ${escapeHtml(
              comment.member_name ||
              "氏名不明"
            )}
          </div>
        `;
      }
    )
    .join(""); 

  const descentCommentButtonHtml =
    isDescended
      ? `
        <button
          class="descent-comment-button"
          type="button"
        >
          ひとこと
        </button>
      `
      : "";

  card.innerHTML = `
    <div class="compact-title-row">

      <h3 class="trip-title">
        ${escapeHtml(
          trip.mountain_area
        )}
        ${escapeHtml(
          trip.mountain_name
        )}
      </h3>

      <span class="trip-leader">
        ${escapeHtml(
          trip.leaderName
        )}
      </span>

    </div>

    ${createDetailedPlanBadgeHtml(
  trip
)}

    <div class="status-row">

      <span class="status-badge ${statusClass}">
        ${statusLabel}
      </span>

      ${timeText}

    </div>

    ${overdueHtml}
    ${commentsHtml}

    <div class="button-row">

      <button
        class="detail-button"
        type="button"
        onclick="location.href='trip-detail.html?id=${trip.id}'"
      >
        詳細を見る
      </button>

      ${descentCommentButtonHtml}

    </div>

    ${createDetailedPlanBadgeHtml(
  trip
)}
  `;

  const descentCommentButton =
    card.querySelector(
      ".descent-comment-button"
    );

  if (descentCommentButton) {
    descentCommentButton.addEventListener(
      "click",
      () =>
        submitDescentComment(
          trip.id,
          descentCommentButton
        )
    );
  }

  return card;
}

/* =========================================
   今日の日付
========================================= */

function getTodayString() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return (
    `${year}-${month}-${day}`
  );
}

/* =========================================
   山行期間表示
========================================= */

function formatTripPeriod(
  entryDate,
  descentDate
) {
  if (
    !entryDate ||
    !descentDate
  ) {
    return "期間未設定";
  }

  const entry =
    formatShortDate(
      entryDate
    );

  const descent =
    formatShortDate(
      descentDate
    );

  if (
    entryDate === descentDate
  ) {
    return entry;
  }

  return (
    `${entry}〜${descent}`
  );
}

/* =========================================
   下山予定時刻を過ぎているか確認
========================================= */

function isTripOverdue(
  trip
) {
  if (
    trip.status !== "approved" ||
    !trip.descent_date ||
    !trip.descent_time
  ) {
    return false;
  }

  const descentDateTime =
    new Date(
      `${trip.descent_date}T${trip.descent_time}`
    );

  if (
    Number.isNaN(
      descentDateTime.getTime()
    )
  ) {
    return false;
  }

  return (
    new Date().getTime() >
    descentDateTime.getTime()
  );
}

/* =========================================
   月日表示
========================================= */

function formatShortDate(
  value
) {
  const date =
    new Date(
      `${value}T00:00:00`
    );

  return new Intl
    .DateTimeFormat(
      "ja-JP",
      {
        month: "numeric",
        day: "numeric"
      }
    )
    .format(date);
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
   詳細計画書あり表示
========================================= */

function createDetailedPlanBadgeHtml(
  trip
) {
  if (
    trip.hasDetailedPlan !== true
  ) {
    return "";
  }

  return `
    <span
      class="status-badge"
      style="
        color: #5d4b00;
        background: #fff1b8;
      "
    >
      📄 計画書あり
    </span>
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

/* =========================================
   提出済み件数を取得
========================================= */

async function loadSubmittedCount() {
  const countElement =
    document.getElementById(
      "submitted-count"
    );

  if (!countElement) {
    return;
  }

  try {
    const response =
      await portalFetch(
        "/rest/v1/trips" +
        "?select=id" +
        "&status=in.(approved,descended,cancelled)"
      );

    if (!response.ok) {
      throw new Error(
        await response.text()
      );
    }

    const trips =
      await response.json();

    countElement.innerHTML =
      `${trips.length}<span>件</span>`;

  } catch (error) {
    console.error(
      "提出済み件数の取得に失敗しました。",
      error
    );

    throw error;
  }
}

/* =========================================
   却下された変更申請を表示
   提出者またはリーダーだけに表示
========================================= */

async function loadRejectedChangeRequests() {
  const section =
    document.getElementById(
      "rejected-request-section"
    );

  const list =
    document.getElementById(
      "rejected-request-list"
    );

  if (!section || !list) {
    return;
  }

  const session =
    getPortalAuthSession();

  const member =
    getPortalMember();

  const authUserId =
    session?.user?.id;

  const memberId =
    Number(member?.id);

  if (!authUserId || !memberId) {
    section.hidden = true;
    return;
  }

  try {
    /*
     * 自分がリーダーになっている
     * 山行IDを取得
     */
    const leaderResponse =
      await portalFetch(
        "/rest/v1/trip_members" +
        "?select=trip_id" +
        `&member_id=eq.${memberId}` +
        "&is_leader=eq.true"
      );

    if (!leaderResponse.ok) {
      throw new Error(
        await leaderResponse.text()
      );
    }

    const leaderRows =
      await leaderResponse.json();

    const leaderTripIds =
      leaderRows.map(
        (row) =>
          Number(row.trip_id)
      );

    /*
     * 却下された変更申請を取得
     */
    const requestResponse =
      await portalFetch(
        "/rest/v1/trip_requests" +
        "?select=*,trips(*)" +
        "&request_type=eq.change" +
        "&status=eq.rejected" +
        "&order=reviewed_at.desc"
      );

    if (!requestResponse.ok) {
      throw new Error(
        await requestResponse.text()
      );
    }

    const requests =
      await requestResponse.json();

    /*
     * 提出者本人または
     * 山行リーダーだけに絞る
     */
    const visibleRequests =
      requests.filter(
        (request) => {
          const isRequester =
            request.requested_by ===
            authUserId;

          const isLeader =
            leaderTripIds.includes(
              Number(request.trip_id)
            );

          return (
            isRequester ||
            isLeader
          );
        }
      );

    if (
      visibleRequests.length === 0
    ) {
      section.hidden = true;
      list.innerHTML = "";
      return;
    }

    section.hidden = false;
    list.innerHTML = "";

    visibleRequests.forEach(
  (request) => {
    const trip =
      request.trips || {};

    const note =
      request.proposed_data?.note ||    
      "変更内容の記載なし";

    const card =
      document.createElement(
        "article"
      );

    card.className =
      "trip-card rejected-request-card";

    card.innerHTML = `
      <h3 class="trip-title">
        ${escapeHtml(
          trip.mountain_area || ""
        )}
        ${escapeHtml(
          trip.mountain_name || ""
        )}
      </h3>

      <div class="rejected-request-message">
        変更申請は却下されました
      </div>

      <p class="trip-info">
        <strong>申請内容：</strong>
        ${escapeHtml(note)}
      </p>

      <div class="button-row">

        <button
          class="detail-button"
          type="button"
          onclick="location.href='trip-detail.html?id=${request.trip_id}'"
        >
          山行届を確認する
        </button>

        <button
          class="close-rejected-button"
          type="button"
        >
          確認して閉じる
        </button>

      </div>
    `;

    const closeButton =
      card.querySelector(
        ".close-rejected-button"
      );

    closeButton.addEventListener(
      "click",
      () =>
        acknowledgeRejectedRequest(
          request.id,
          closeButton
        )
    );

    list.appendChild(card);
  }
);

  } catch (error) {
    console.error(
      "却下された変更申請を読み込めませんでした。",
      error
    );

    section.hidden = true;
  }
}

/* =========================================
   却下通知を確認済みにする
========================================= */

async function acknowledgeRejectedRequest(
  requestId,
  closeButton
) {
  const confirmed =
    confirm(
      "この通知を確認済みにして閉じますか？"
    );

  if (!confirmed) {
    return;
  }

  closeButton.disabled = true;
  closeButton.textContent =
    "処理中...";

  try {
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
              status:
                "acknowledged"
            })
        }
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "通知の更新に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    await loadRejectedChangeRequests();

  } catch (error) {
    console.error(error);

    alert(
      "通知を閉じられませんでした。"
    );

    closeButton.disabled = false;
    closeButton.textContent =
      "確認して閉じる";
  }
}

/* =========================================
   自分の下書き山行届を表示
========================================= */

async function loadDraftTrips() {
  const section =
    document.getElementById(
      "draft-section"
    );

  const list =
    document.getElementById(
      "draft-trip-list"
    );

  if (!section || !list) {
    return;
  }

  const session =
    getPortalAuthSession();

  const authUserId =
    session?.user?.id;

  if (!authUserId) {
    section.hidden = true;
    return;
  }

  try {
    const response =
      await portalFetch(
        "/rest/v1/trips" +
        "?select=*" +
        "&status=eq.draft" +
        `&submitted_by=eq.${authUserId}` +
        "&order=created_at.desc"
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "下書きの取得に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    const trips =
      await response.json();

    if (
      !Array.isArray(trips) ||
      trips.length === 0
    ) {
      section.hidden = true;
      list.innerHTML = "";
      return;
    }

    section.hidden = false;
    list.innerHTML = "";

    trips.forEach(
      (trip) => {
        const card =
          document.createElement(
            "article"
          );

        card.className =
          "trip-card draft-card";

        const mountainTitle =
          [
            trip.mountain_area,
            trip.mountain_name
          ]
            .filter(Boolean)
            .join(" ");

        card.innerHTML = `
          <h3 class="trip-title">
            ${escapeHtml(
              mountainTitle ||
              "山名未入力"
            )}
          </h3>

          <p class="trip-info">
            <strong>入山日：</strong>
            ${
              trip.entry_date
  ? escapeHtml(
      trip.entry_date
    )
  : "未入力"
            }
          </p>

          <p class="trip-info">
            <strong>ルート：</strong>
            ${escapeHtml(
              trip.route ||
              "未入力"
            )}
          </p>

          <div class="button-row draft-button-row">

  <button
    class="detail-button"
    type="button"
    onclick="location.href='trip-form.html?edit=${trip.id}'"
  >
    続きを編集する
  </button>

  <button
    class="delete-draft-button"
    type="button"
  >
    下書きを削除
  </button>

</div>
        `;

        const deleteButton =
  card.querySelector(
    ".delete-draft-button"
  );

deleteButton.addEventListener(
  "click",
  () =>
    deleteDraftTrip(
      trip.id,
      deleteButton
    )
);

        list.appendChild(card);
      }
    );

  } catch (error) {
    console.error(
      "下書きを読み込めませんでした。",
      error
    );

    section.hidden = true;
  }
}

/* =========================================
   下書きを削除
========================================= */

async function deleteDraftTrip(
  tripId,
  deleteButton
) {
  const confirmed =
    confirm(
      "この下書きを削除しますか？"
    );

  if (!confirmed) {
    return;
  }

  deleteButton.disabled =
    true;

  deleteButton.textContent =
    "削除中...";

  try {
    const memberDeleteResponse =
      await portalFetch(
        `/rest/v1/trip_members?trip_id=eq.${tripId}`,
        {
          method: "DELETE",

          headers: {
            Prefer:
              "return=minimal"
          }
        }
      );

    if (!memberDeleteResponse.ok) {
      const errorText =
        await memberDeleteResponse.text();

      throw new Error(
        "参加者情報を削除できませんでした。" +
        ` ${memberDeleteResponse.status} ${errorText}`
      );
    }

    const tripDeleteResponse =
      await portalFetch(
        `/rest/v1/trips?id=eq.${tripId}&status=eq.draft`,
        {
          method: "DELETE",

          headers: {
            Prefer:
              "return=minimal"
          }
        }
      );

    if (!tripDeleteResponse.ok) {
      const errorText =
        await tripDeleteResponse.text();

      throw new Error(
        "下書きを削除できませんでした。" +
        ` ${tripDeleteResponse.status} ${errorText}`
      );
    }

    alert(
      "下書きを削除しました。"
    );

    await loadDraftTrips();

  } catch (error) {
    console.error(error);

    alert(
      "下書きを削除できませんでした。"
    );

    deleteButton.disabled =
      false;

    deleteButton.textContent =
      "下書きを削除";
  }
}