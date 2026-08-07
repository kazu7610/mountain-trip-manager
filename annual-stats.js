/* =========================================
   ポンコツ倶楽部
   年間山行実績
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    if (!requirePortalLogin()) {
      return;
    }

    await setupAnnualStats();
  }
);


/* =========================================
   初期設定
========================================= */

async function setupAnnualStats() {
  const yearSelect =
    document.getElementById(
      "stats-year-select"
    );

  if (!yearSelect) {
    console.error(
      "年度選択欄が見つかりません。"
    );

    return;
  }

  createFiscalYearOptions(
    yearSelect
  );

  yearSelect.addEventListener(
    "change",
    async () => {
      await loadAnnualStats();
    }
  );

  await loadMemberOptions();

  await loadAnnualStats();
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
   年間実績を読み込む
========================================= */

async function loadAnnualStats() {
  const yearSelect =
    document.getElementById(
      "stats-year-select"
    );

  if (!yearSelect) {
    return;
  }

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
    const tripResponse =
      await portalFetch(
        "/rest/v1/trips" +
        "?select=id,entry_date,descent_date,mountain_area,genre" +
        "&status=eq.completed" +
        `&entry_date=gte.${range.start}` +
        `&entry_date=lte.${range.end}` +
        "&order=entry_date.asc"
      );

    if (!tripResponse.ok) {
      const errorText =
        await tripResponse.text();

      throw new Error(
        "年間山行実績を取得できませんでした。" +
        ` ${tripResponse.status} ${errorText}`
      );
    }

    const trips =
      await tripResponse.json();

    let tripMembers = [];

    if (trips.length > 0) {
      const tripIds =
        trips
          .map(
            (trip) => trip.id
          )
          .join(",");

      const memberResponse =
        await portalFetch(
          "/rest/v1/trip_members" +
          "?select=trip_id,member_id,members(name)" +
          `&trip_id=in.(${tripIds})`
        );

      if (!memberResponse.ok) {
        const errorText =
          await memberResponse.text();

        throw new Error(
          "山行参加者を取得できませんでした。" +
          ` ${memberResponse.status} ${errorText}`
        );
      }

      tripMembers =
        await memberResponse.json();
    }

    renderAnnualTripCount(
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

    renderMemberDaysStats(
      trips,
      tripMembers
    );

  } catch (error) {
    console.error(error);

    showStatsError();
  }
}


/* =========================================
   年間山行回数
========================================= */

function renderAnnualTripCount(
  trips
) {
  const element =
    document.getElementById(
      "annual-trip-count"
    );

  if (!element) {
    return;
  }

  element.innerHTML =
    `${trips.length}<span>回</span>`;
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

  if (!container) {
    return;
  }

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

  if (!container) {
    return;
  }

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

  const entries =
    Object.entries(counts)
      .sort(
        (a, b) =>
          getDurationSortValue(a[0]) -
          getDurationSortValue(b[0])
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
   山域別
========================================= */

function renderAreaStats(
  trips
) {
  const container =
    document.getElementById(
      "area-stats"
    );

  if (!container) {
    return;
  }

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
    counts,
    "回"
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

  if (!container) {
    return;
  }

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
    counts,
    "回"
  );
}


/* =========================================
   会員別 入山日数
========================================= */

function renderMemberDaysStats(
  trips,
  tripMembers
) {
  const container =
    document.getElementById(
      "member-days-stats"
    );

  if (!container) {
    return;
  }

  const tripDays = {};

  trips.forEach(
    (trip) => {
      tripDays[trip.id] =
        calculateTripDays(
          trip.entry_date,
          trip.descent_date
        );
    }
  );

  const memberDays = {};

  tripMembers.forEach(
    (row) => {
      const memberName =
        row.members?.name ||
        "氏名不明";

      const days =
        tripDays[row.trip_id] || 0;

      memberDays[memberName] =
        (memberDays[memberName] || 0) +
        days;
    }
  );

  const entries =
    Object.entries(memberDays)
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
        "0日"
      );

    return;
  }

  container.innerHTML =
    entries
      .map(
        ([name, days]) =>
          createStatsRow(
            name,
            `${days}日`
          )
      )
      .join("");
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
   形態並び替え用
========================================= */

function getDurationSortValue(
  label
) {
  if (label === "日帰り") {
    return 1;
  }

  const match =
    label.match(
      /(\d+)日/
    );

  return match
    ? Number(match[1])
    : 999;
}


/* =========================================
   日付から月を取得
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
   集計マップ表示
========================================= */

function renderCountMap(
  container,
  counts,
  unit
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
        `0${unit}`
      );

    return;
  }

  container.innerHTML =
    entries
      .map(
        ([label, count]) =>
          createStatsRow(
            label,
            `${count}${unit}`
          )
      )
      .join("");
}


/* =========================================
   集計1行
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
   会員プルダウン
========================================= */

async function loadMemberOptions() {
  const select =
    document.getElementById(
      "member-select"
    );

  if (!select) {
    return;
  }

  try {
    const response =
      await portalFetch(
        "/rest/v1/members" +
        "?select=id,name" +
        "&order=id.asc"
      );

    if (!response.ok) {
      throw new Error(
        "会員一覧を取得できませんでした。"
      );
    }

    const members =
      await response.json();

    select.innerHTML = `
      <option value="">
        会員を選択
      </option>
    `;

    members.forEach(
      (member) => {
        const option =
          document.createElement(
            "option"
          );

        option.value =
          String(member.id);

        option.textContent =
          member.name;

        select.appendChild(
          option
        );
      }
    );

  } catch (error) {
    console.error(error);
  }
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
      "style-stats",
      "member-days-stats"
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

function showStatsError() {
  const ids =
    [
      "monthly-stats",
      "duration-stats",
      "area-stats",
      "style-stats",
      "member-days-stats"
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

/* =========================================
   個人実績ページへ移動
========================================= */

const memberStatsButton =
  document.getElementById(
    "member-stats-button"
  );

if (memberStatsButton) {
  memberStatsButton.addEventListener(
    "click",
    () => {
      const memberSelect =
        document.getElementById(
          "member-select"
        );

      const memberId =
        Number(
          memberSelect?.value
        );

      if (
        !Number.isInteger(memberId) ||
        memberId <= 0
      ) {
        alert(
          "会員を選択してください。"
        );

        return;
      }

      location.href =
        `member-stats.html?member=${memberId}`;
    }
  );
}