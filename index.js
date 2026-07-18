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

    loadRevisionTrips();
    loadRejectedChangeRequests();
    loadApprovalWaitingCount();
    loadSubmittedCount();
    loadHomeTrips();
  }
);

/* =========================================
   ホーム画面のログイン表示
========================================= */

function initializeHomeLogin() {
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
      member.role !== "admin";
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

    revisionSection.hidden = false;

    revisionTripList.innerHTML = `
      <div class="error-message">
        修正依頼の山行届を読み込めませんでした。
      </div>
    `;
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

    countElement.innerHTML =
      `？<span>件</span>`;
  }
}

/* =========================================
   ホーム用山行一覧を読み込む
========================================= */

async function loadHomeTrips() {
  const todayTripList =
    document.getElementById(
      "today-trip-list"
    );

  const todayDescentList =
    document.getElementById(
      "today-descent-list"
    );

  if (
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

      const item = {
        ...trip,
        memberNames,
        leaderName
      };

      /*
       * 本日の山行には、
       * 承認済みと中止済みを表示する。
       *
       * 下山連絡済みは表示しない。
       */
      if (
        trip.status === "approved" ||
        trip.status === "cancelled"
      ) {
        todayTrips.push(item);
      }

      /*
       * 下山日が今日の山行は、
       * 本日の下山へ表示する。
       *
       * 中止済みは表示しない。
       */
      if (
        trip.descent_date === today &&
        trip.status !== "cancelled"
      ) {
        todayDescents.push(item);
      }
    }

    renderTodayTrips(
      todayTripList,
      todayTrips
    );

    renderTodayDescents(
      todayDescentList,
      todayDescents
    );

  } catch (error) {
    console.error(error);

    todayTripList.innerHTML = `
      <div class="error-message">
        本日の山行を読み込めませんでした。
      </div>
    `;

    todayDescentList.innerHTML = `
      <div class="error-message">
        本日の下山予定を読み込めませんでした。
      </div>
    `;
  }
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

  return rows.map((row) => ({
    name:
      row.members?.name ||
      "不明",

    isLeader:
      row.is_leader === true
  }));
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

  const isCancelled =
    trip.status === "cancelled";

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

    <div class="button-row">

      <button
        class="detail-button"
        type="button"
        onclick="location.href='trip-detail.html?id=${trip.id}'"
      >
        詳細を見る
      </button>

    </div>
  `;

  return card;
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

  card.className =
    isDescended
      ? "trip-card descent-completed"
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

    <div class="status-row">

      <span class="status-badge ${statusClass}">
        ${statusLabel}
      </span>

      ${timeText}

    </div>

    <div class="button-row">

      <button
        class="detail-button"
        type="button"
        onclick="location.href='trip-detail.html?id=${trip.id}'"
      >
        詳細を見る
      </button>

    </div>
  `;

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

    countElement.innerHTML =
      `－<span>件</span>`;
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