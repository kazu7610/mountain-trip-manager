/* =========================================
   ポンコツ倶楽部
   山行履歴
========================================= */

let allHistoryTrips = [];


/* =========================================
   初期処理
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    if (!requirePortalLogin()) {
      return;
    }

    setupHistoryControls();
  }
);


/* =========================================
   検索・絞り込み準備
========================================= */

async function setupHistoryControls() {
  const yearSelect =
    document.getElementById(
      "history-year-select"
    );

  const monthSelect =
    document.getElementById(
      "history-month-select"
    );

  const searchInput =
    document.getElementById(
      "history-search-input"
    );

  if (
    !yearSelect ||
    !monthSelect ||
    !searchInput
  ) {
    console.error(
      "山行履歴の検索欄が見つかりません。"
    );

    return;
  }

  createFiscalYearOptions(
    yearSelect
  );

  yearSelect.addEventListener(
  "change",
  async () => {
    monthSelect.value = "";
    searchInput.value = "";

    await loadTripHistory();
  }
);

  monthSelect.addEventListener(
    "change",
    () => {
      applyHistoryFilter();
    }
  );

  searchInput.addEventListener(
    "input",
    () => {
      applyHistoryFilter();
    }
  );

  await loadTripHistory();
}


/* =========================================
   年度プルダウン作成
========================================= */

function createFiscalYearOptions(
  yearSelect
) {
  const currentFiscalYear =
    getCurrentFiscalYear();

  yearSelect.innerHTML = "";

  for (
    let year = currentFiscalYear;
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
    String(
      currentFiscalYear
    );
}


/* =========================================
   現在の年度を取得
   4月 ～ 翌年3月
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
   年度の開始日・終了日
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
   山行履歴を読み込む
========================================= */

async function loadTripHistory() {
  const yearSelect =
    document.getElementById(
      "history-year-select"
    );

  const historyList =
    document.querySelector(
      ".history-list"
    );

  if (
    !yearSelect ||
    !historyList
  ) {
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

  historyList.innerHTML = `
    <div class="history-empty">
      山行履歴を読み込んでいます...
    </div>
  `;

  try {
    const response =
      await portalFetch(
        "/rest/v1/trips" +
        "?select=id,entry_date,mountain_name,mountain_area,route,status" +
        "&status=in.(completed,cancelled)" +
        `&entry_date=gte.${range.start}` +
        `&entry_date=lte.${range.end}` +
        "&order=entry_date.desc"
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "山行履歴の取得に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    allHistoryTrips =
      await response.json();

    applyHistoryFilter();

  } catch (error) {
    console.error(error);

    allHistoryTrips = [];

    historyList.innerHTML = `
      <div class="history-empty">
        山行履歴を読み込めませんでした。
      </div>
    `;

    updateHistoryCount(
      fiscalYear,
      "",
      0
    );
  }
}


/* =========================================
   山行履歴を絞り込む
========================================= */

function applyHistoryFilter() {
  const yearSelect =
    document.getElementById(
      "history-year-select"
    );

  const monthSelect =
    document.getElementById(
      "history-month-select"
    );

  const searchInput =
    document.getElementById(
      "history-search-input"
    );

  const historyList =
    document.querySelector(
      ".history-list"
    );

  if (
    !yearSelect ||
    !monthSelect ||
    !searchInput ||
    !historyList
  ) {
    return;
  }

  const fiscalYear =
    Number(
      yearSelect.value
    );

  const selectedMonth =
    monthSelect.value;

  const keyword =
    searchInput.value
      .trim()
      .toLowerCase();

  const filteredTrips =
    allHistoryTrips.filter(
      (trip) => {
        const tripMonth =
          getHistoryMonth(
            trip.entry_date
          );

        const monthMatch =
          !selectedMonth ||
          tripMonth ===
            Number(selectedMonth);

        const searchText =
          [
            trip.mountain_name,
            trip.mountain_area,
            trip.route
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const keywordMatch =
          !keyword ||
          searchText.includes(
            keyword
          );

        return (
          monthMatch &&
          keywordMatch
        );
      }
    );

  updateHistoryCount(
    fiscalYear,
    selectedMonth,
    filteredTrips.length
  );

  renderTripHistory(
    historyList,
    filteredTrips
  );
}


/* =========================================
   件数表示
========================================= */

function updateHistoryCount(
  fiscalYear,
  selectedMonth,
  count
) {
  const historyCount =
    document.querySelector(
      ".history-count"
    );

  if (!historyCount) {
    return;
  }

  if (selectedMonth) {
    historyCount.textContent =
      `${fiscalYear}年度　${selectedMonth}月　${count}件`;

    return;
  }

  historyCount.textContent =
    `${fiscalYear}年度　${count}件`;
}


/* =========================================
   山行日の月を取得
========================================= */

function getHistoryMonth(
  value
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  return (
    date.getMonth() + 1
  );
}


/* =========================================
   山行履歴一覧を表示
========================================= */

function renderTripHistory(
  container,
  trips
) {
  if (
    !Array.isArray(trips) ||
    trips.length === 0
  ) {
    container.innerHTML = `
      <div class="history-empty">
        条件に合う山行履歴はありません。
      </div>
    `;

    return;
  }

  container.innerHTML =
    trips
      .map(
        (trip) => {
          const date =
            formatHistoryDate(
              trip.entry_date
            );

          const status =
            trip.status ===
            "cancelled"
              ? "CXL"
              : "DONE";

          return `
            <button
              type="button"
              class="history-trip-row"
              onclick="
                location.href=
                  'trip-history-detail.html?id=${trip.id}'
              "
            >

              <span class="history-trip-date">
                ${escapeHtml(date)}
              </span>

              <span class="history-trip-title">
                ${escapeHtml(
                  trip.mountain_name ||
                  "山名未設定"
                )}
                ${
                  trip.route
                    ? `｜${escapeHtml(
                        trip.route
                      )}`
                    : ""
                }
              </span>

              <span class="history-trip-status">
                ${status}
              </span>

              <span class="history-trip-arrow">
                〉
              </span>

            </button>
          `;
        }
      )
      .join("");
}


/* =========================================
   履歴用日付表示
========================================= */

function formatHistoryDate(
  value
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  return `${
    date.getMonth() + 1
  }/${date.getDate()}`;
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