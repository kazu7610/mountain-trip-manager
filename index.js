/* =========================================
   ポンコツ倶楽部
   ホーム画面
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadApprovalWaitingCount();
    loadHomeTrips();
  }
);

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
        "&status=in.(approved,descended)" +
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
       * 承認済みの山行だけ表示する。
       *
       * 下山連絡済みは表示しない。
       */
      if (
        trip.status === "approved"
      ) {
        todayTrips.push(item);
      }

      /*
       * 下山日が今日の山行は、
       * 本日の下山へ表示する。
       *
       * 下山連絡後も
       * 「無事下山」として残す。
       */
      if (
        trip.descent_date === today
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

  card.className =
    "trip-card active";

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