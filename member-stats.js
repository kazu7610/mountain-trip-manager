/* =========================================
   ポンコツ倶楽部
   個人実績
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    if (!requirePortalLogin()) {
      return;
    }

    await setupMemberStats();
  }
);


/* =========================================
   初期設定
========================================= */

async function setupMemberStats() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const memberId =
    Number(
      params.get("member")
    );

  if (
    !Number.isInteger(memberId) ||
    memberId <= 0
  ) {
    alert(
      "会員が選択されていません。"
    );

    location.href =
      "annual-stats.html";

    return;
  }

  const yearSelect =
    document.getElementById(
      "stats-year-select"
    );

  createFiscalYearOptions(
    yearSelect
  );

  await loadMemberName(
    memberId
  );

  yearSelect.addEventListener(
    "change",
    async () => {
      await loadMemberStats(
        memberId
      );
    }
  );

  await loadMemberStats(
    memberId
  );
}


/* =========================================
   現在年度
========================================= */

function getCurrentFiscalYear() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    now.getMonth() + 1;

  return month >= 4
    ? year
    : year - 1;
}


/* =========================================
   年度プルダウン
========================================= */

function createFiscalYearOptions(
  yearSelect
) {
  const currentYear =
    getCurrentFiscalYear();

  yearSelect.innerHTML = "";

  for (
    let year = currentYear;
    year >= 2021;
    year--
  ) {
    const option =
      document.createElement(
        "option"
      );

    option.value =
      String(year);

    option.textContent =
      `${year}年度`;

    yearSelect.appendChild(
      option
    );
  }

  yearSelect.value =
    String(currentYear);
}


/* =========================================
   年度範囲
========================================= */

function getFiscalYearRange(
  fiscalYear
) {
  return {
    start:
      `${fiscalYear}-04-01`,

    end:
      `${fiscalYear + 1}-03-31`
  };
}


/* =========================================
   会員名
========================================= */

async function loadMemberName(
  memberId
) {
  try {
    const response =
      await portalFetch(
        "/rest/v1/members" +
        "?select=id,name" +
        `&id=eq.${memberId}`
      );

    if (!response.ok) {
      throw new Error(
        "会員情報を取得できませんでした。"
      );
    }

    const members =
      await response.json();

    const member =
      members[0];

    const nameElement =
      document.getElementById(
        "member-name"
      );

    nameElement.textContent =
      member?.name ||
      "氏名不明";

  } catch (error) {
    console.error(error);
  }
}


/* =========================================
   個人実績
========================================= */

async function loadMemberStats(
  memberId
) {
  const yearSelect =
    document.getElementById(
      "stats-year-select"
    );

  const fiscalYear =
    Number(
      yearSelect.value
    );

  const range =
    getFiscalYearRange(
      fiscalYear
    );

  showLoading();

  try {
    const memberTripResponse =
      await portalFetch(
        "/rest/v1/trip_members" +
        "?select=trip_id" +
        `&member_id=eq.${memberId}`
      );

    if (!memberTripResponse.ok) {
      throw new Error(
        "参加山行を取得できませんでした。"
      );
    }

    const memberTrips =
      await memberTripResponse.json();

    const tripIds =
      memberTrips
        .map(
          (row) => row.trip_id
        );

    if (tripIds.length === 0) {
      renderMemberStats(
        []
      );

      return;
    }

    const tripResponse =
      await portalFetch(
        "/rest/v1/trips" +
        "?select=id,entry_date,descent_date,mountain_area,genre,status" +
        `&id=in.(${tripIds.join(",")})` +
        "&status=eq.completed" +
        `&entry_date=gte.${range.start}` +
        `&entry_date=lte.${range.end}` +
        "&order=entry_date.asc"
      );

    if (!tripResponse.ok) {
      const errorText =
        await tripResponse.text();

      throw new Error(
        "個人実績を取得できませんでした。" +
        ` ${tripResponse.status} ${errorText}`
      );
    }

    const trips =
      await tripResponse.json();

    renderMemberStats(
      trips
    );

  } catch (error) {
    console.error(error);

    showError();
  }
}


/* =========================================
   集計表示
========================================= */

function renderMemberStats(
  trips
) {
  renderTripCount(
    trips
  );

  renderTripDays(
    trips
  );

  renderMonthlyStats(
    trips
  );

  renderDurationStats(
    trips
  );

  renderAreaStats(
    trips
  );

  renderGenreStats(
    trips
  );
}


/* =========================================
   山行回数
========================================= */

function renderTripCount(
  trips
) {
  const element =
    document.getElementById(
      "member-trip-count"
    );

  element.innerHTML =
    `${trips.length}<span>回</span>`;
}


/* =========================================
   入山日数
========================================= */

function renderTripDays(
  trips
) {
  const totalDays =
    trips.reduce(
      (total, trip) =>
        total +
        calculateTripDays(
          trip.entry_date,
          trip.descent_date
        ),
      0
    );

  const element =
    document.getElementById(
      "member-trip-days"
    );

  element.innerHTML =
    `${totalDays}<span>日</span>`;
}


/* =========================================
   月別
========================================= */

function renderMonthlyStats(
  trips
) {
  const container =
    document.getElementById(
      "monthly-stats"
    );

  const months =
    [
      4, 5, 6, 7, 8, 9,
      10, 11, 12, 1, 2, 3
    ];

  const counts = {};

  months.forEach(
    (month) => {
      counts[month] = 0;
    }
  );

  trips.forEach(
    (trip) => {
      const month =
        getDateMonth(
          trip.entry_date
        );

      if (
        month &&
        counts[month] !== undefined
      ) {
        counts[month] += 1;
      }
    }
  );

  container.innerHTML =
    months
      .map(
        (month) =>
          createStatsRow(
            `${month}月`,
            `${counts[month]}回`
          )
      )
      .join("");
}


/* =========================================
   形態別
========================================= */

function renderDurationStats(
  trips
) {
  const container =
    document.getElementById(
      "duration-stats"
    );

  const counts = {};

  trips.forEach(
    (trip) => {
      const days =
        calculateTripDays(
          trip.entry_date,
          trip.descent_date
        );

      const label =
        createDurationLabel(
          days
        );

      counts[label] =
        (counts[label] || 0) + 1;
    }
  );

  renderCountMap(
    container,
    counts
  );
}


/* =========================================
   山域別
========================================= */

function renderAreaStats(
  trips
) {
  const container =
    document.getElementById(
      "area-stats"
    );

  const counts = {};

  trips.forEach(
    (trip) => {
      const area =
        String(
          trip.mountain_area ||
          "未設定"
        ).trim();

      counts[area] =
        (counts[area] || 0) + 1;
    }
  );

  renderCountMap(
    container,
    counts
  );
}


/* =========================================
   スタイル別
========================================= */

function renderGenreStats(
  trips
) {
  const container =
    document.getElementById(
      "style-stats"
    );

  const counts = {};

  trips.forEach(
    (trip) => {
      const genre =
        String(
          trip.genre ||
          "未設定"
        ).trim();

      counts[genre] =
        (counts[genre] || 0) + 1;
    }
  );

  renderCountMap(
    container,
    counts
  );
}


/* =========================================
   入山日数計算
========================================= */

function calculateTripDays(
  entryDate,
  descentDate
) {
  if (
    !entryDate ||
    !descentDate
  ) {
    return 1;
  }

  const entryParts =
    entryDate
      .split("-")
      .map(Number);

  const descentParts =
    descentDate
      .split("-")
      .map(Number);

  const entry =
    Date.UTC(
      entryParts[0],
      entryParts[1] - 1,
      entryParts[2]
    );

  const descent =
    Date.UTC(
      descentParts[0],
      descentParts[1] - 1,
      descentParts[2]
    );

  const difference =
    Math.floor(
      (descent - entry) /
      86400000
    );

  return Math.max(
    1,
    difference + 1
  );
}


/* =========================================
   形態名
========================================= */

function createDurationLabel(
  days
) {
  if (days <= 1) {
    return "日帰り";
  }

  return `${days - 1}泊${days}日`;
}


/* =========================================
   日付から月
========================================= */

function getDateMonth(
  value
) {
  if (!value) {
    return null;
  }

  const parts =
    value
      .split("-")
      .map(Number);

  return parts[1] || null;
}


/* =========================================
   集計表示共通
========================================= */

function renderCountMap(
  container,
  counts
) {
  const entries =
    Object.entries(counts)
      .sort(
        (a, b) => {
          if (b[1] !== a[1]) {
            return b[1] - a[1];
          }

          return a[0].localeCompare(
            b[0],
            "ja"
          );
        }
      );

  if (entries.length === 0) {
    container.innerHTML =
      createStatsRow(
        "実績なし",
        "0回"
      );

    return;
  }

  container.innerHTML =
    entries
      .map(
        ([label, count]) =>
          createStatsRow(
            label,
            `${count}回`
          )
      )
      .join("");
}


/* =========================================
   1行表示
========================================= */

function createStatsRow(
  label,
  value
) {
  return `
    <div class="stats-row">

      <span class="stats-label">
        ${escapeHtml(label)}
      </span>

      <span class="stats-value">
        ${escapeHtml(value)}
      </span>

    </div>
  `;
}


/* =========================================
   読み込み表示
========================================= */

function showLoading() {
  const ids =
    [
      "monthly-stats",
      "duration-stats",
      "area-stats",
      "style-stats"
    ];

  ids.forEach(
    (id) => {
      const element =
        document.getElementById(id);

      if (element) {
        element.textContent =
          "読み込み中...";
      }
    }
  );
}


/* =========================================
   エラー表示
========================================= */

function showError() {
  const ids =
    [
      "monthly-stats",
      "duration-stats",
      "area-stats",
      "style-stats"
    ];

  ids.forEach(
    (id) => {
      const element =
        document.getElementById(id);

      if (element) {
        element.textContent =
          "実績を読み込めませんでした。";
      }
    }
  );
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