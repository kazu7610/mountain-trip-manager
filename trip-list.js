/* =========================================
   ポンコツ倶楽部
   全員用・山行届一覧画面
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    if (!requirePortalLogin()) {
      return;
    }

    loadTripList();
  }
);

/* =========================================
   URLから表示種類を取得
========================================= */

function getListStatus() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const status =
    params.get("status");

  if (status === "submitted") {
    return "submitted";
  }

  return "active";
}

/* =========================================
   山行届一覧を読み込む
========================================= */

async function loadTripList() {
  const listTitle =
    document.getElementById(
      "list-title"
    );

  const listDescription =
    document.getElementById(
      "list-description"
    );

  const tripList =
    document.getElementById(
      "trip-list"
    );

  if (
    !listTitle ||
    !listDescription ||
    !tripList
  ) {
    console.error(
      "山行届一覧の表示場所が見つかりません。"
    );

    return;
  }

  const listStatus =
    getListStatus();

  setPageText(
    listTitle,
    listDescription,
    listStatus
  );

  try {
    const query =
      createTripQuery(
        listStatus
      );

    const response =
      await portalFetch(
        query
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "山行届一覧の取得に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    const trips =
      await response.json();

    if (
      !Array.isArray(trips) ||
      trips.length === 0
    ) {
      tripList.innerHTML = `
        <div class="empty-card">
          ${escapeHtml(
            getEmptyMessage(
              listStatus
            )
          )}
        </div>
      `;

      return;
    }

    tripList.innerHTML = "";

    for (const trip of trips) {
      const members =
        await loadTripMembers(
          trip.id
        );

      const card =
        createTripCard(
          trip,
          members
        );

      tripList.appendChild(
        card
      );
    }

  } catch (error) {
    console.error(error);

    tripList.innerHTML = `
      <div class="error-card">
        山行届一覧を読み込めませんでした。
      </div>
    `;
  }
}

/* =========================================
   画面タイトルを切り替える
========================================= */

function setPageText(
  titleElement,
  descriptionElement,
  listStatus
) {
  if (
    listStatus === "submitted"
  ) {
    titleElement.textContent =
      "承認待ちの山行届";

    descriptionElement.textContent =
      "管理者の承認を待っている山行届です。全会員が閲覧できます。";

    return;
  }

  titleElement.textContent =
    "提出済みの山行届";

  descriptionElement.textContent =
    "承認済み・山行中・下山連絡済み・中止済みの山行届です。";
}

/* =========================================
   Supabase検索条件
========================================= */

function createTripQuery(
  listStatus
) {
  if (
    listStatus === "submitted"
  ) {
    return (
      "/rest/v1/trips" +
      "?select=*" +
      "&status=eq.submitted" +
      "&order=entry_date.asc,descent_time.asc"
    );
  }

  return (
    "/rest/v1/trips" +
    "?select=*" +
    "&status=in.(approved,descended,cancelled)" +
    "&order=entry_date.asc,descent_time.asc"
  );
}

/* =========================================
   データなしの文言
========================================= */

function getEmptyMessage(
  listStatus
) {
  if (
    listStatus === "submitted"
  ) {
    return (
      "現在、承認待ちの山行届はありません。"
    );
  }

  return (
    "現在、表示する山行届はありません。"
  );
}

/* =========================================
   参加者を取得
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
      name:
        row.members?.name ||
        "不明",

      isLeader:
        row.is_leader === true
    })
  );
}

/* =========================================
   山行届カードを作成
========================================= */

function createTripCard(
  trip,
  members
) {
  const card =
    document.createElement(
      "article"
    );

  const statusInfo =
    getStatusInformation(
      trip.status
    );

  card.className =
    `trip-card ${statusInfo.cardClass}`;

  const memberText =
    createMemberText(
      members,
      trip.outside_member_count
    );

  const cancelMessage =
    trip.status === "cancelled"
      ? `
        <div class="cancel-message">
          この山行は中止になりました
        </div>
      `
      : "";

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
        class="status-badge ${statusInfo.badgeClass}"
      >
        ${escapeHtml(
          statusInfo.label
        )}
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

    ${cancelMessage}

    <button
      class="detail-button"
      type="button"
      onclick="location.href='trip-detail.html?id=${trip.id}'"
    >
      詳細を見る
    </button>
  `;

  return card;
}

/* =========================================
   ステータス表示
========================================= */

function getStatusInformation(
  status
) {
  const statusMap = {
    submitted: {
      label:
        "承認待ち",

      cardClass:
        "submitted-card",

      badgeClass:
        "status-submitted"
    },

    approved: {
      label:
        "承認済み",

      cardClass:
        "approved-card",

      badgeClass:
        "status-approved"
    },

    descended: {
      label:
        "無事下山",

      cardClass:
        "descended-card",

      badgeClass:
        "status-descended"
    },

    cancelled: {
      label:
        "中止",

      cardClass:
        "cancelled-card",

      badgeClass:
        "status-cancelled"
    }
  };

  return (
    statusMap[status] || {
      label:
        status || "不明",

      cardClass:
        "approved-card",

      badgeClass:
        "status-approved"
    }
  );
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
          .map(
            (member) =>
              member.isLeader
                ? `${member.name}（代表）`
                : member.name
          )
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
      year:
        "numeric",

      month:
        "long",

      day:
        "numeric",

      weekday:
        "short"
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