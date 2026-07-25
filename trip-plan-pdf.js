/* =========================================
   ポンコツ倶楽部
   詳細計画書 PDF
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    if (!requirePortalLogin()) {
      return;
    }

    setupPdfButton();
    loadPdfPlan();
  }
);

/* =========================================
   山行IDを取得
========================================= */

function getPdfTripId() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return params.get("id");
}

/* =========================================
   PDF保存ボタン
========================================= */

function setupPdfButton() {
  const printButton =
    document.getElementById(
      "print-pdf-button"
    );

  if (!printButton) {
    return;
  }

  printButton.addEventListener(
    "click",
    () => {
      window.print();
    }
  );
}

/* =========================================
   PDF用データを読み込む
========================================= */

async function loadPdfPlan() {
  const page =
    document.getElementById(
      "pdf-page"
    );

  const tripId =
    getPdfTripId();

  if (!page) {
    return;
  }

  if (!tripId) {
    page.innerHTML = `
      <p class="pdf-loading">
        山行情報を確認できませんでした。
      </p>
    `;

    return;
  }

  try {
    const response =
      await portalFetch(
        "/rest/v1/trips" +
        "?select=*" +
        `&id=eq.${encodeURIComponent(
          tripId
        )}` +
        "&limit=1"
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "山行情報の取得に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    const trips =
      await response.json();

    const trip =
      trips[0];

    if (!trip) {
      throw new Error(
        "対象の山行が見つかりません。"
      );
    }

    renderPdfPlan(
      page,
      trip
    );

    await loadPdfMembers(
      trip.id
    );

  } catch (error) {
    console.error(error);

    page.innerHTML = `
      <p class="pdf-loading">
        計画書を読み込めませんでした。
      </p>
    `;
  }
}

/* =========================================
   PDF画面を表示
========================================= */

function renderPdfPlan(
  page,
  trip
) {
  page.innerHTML = `
    <header class="pdf-document-header">

      <h1 class="pdf-document-title">
        山行計画書
      </h1>

      <p class="pdf-document-subtitle">
        ポンコツ倶楽部
      </p>

    </header>

    <section class="pdf-section">

      <h2 class="pdf-section-title">
        山行基本情報
      </h2>

      <div class="pdf-basic-grid">

        ${createPdfRow(
          "山域",
          trip.mountain_area
        )}

        ${createPdfRow(
          "山名",
          trip.mountain_name
        )}

        ${createPdfRow(
          "ルート",
          trip.route
        )}

        ${createPdfRow(
          "入山日",
          formatPdfDate(
            trip.entry_date
          )
        )}

        ${createPdfRow(
          "下山日",
          formatPdfDate(
            trip.descent_date
          )
        )}

        ${createPdfRow(
          "下山時刻",
          formatPdfTime(
            trip.descent_time
          )
        )}

      </div>

    </section>

    <section class="pdf-section">

      <h2 class="pdf-section-title">
        参加者
      </h2>

      <div id="pdf-members">
        読み込み中...
      </div>

    </section>

    <section class="pdf-section">

      <h2 class="pdf-section-title">
        行動予定
      </h2>

      <div id="pdf-actions">
        読み込み準備中
      </div>

    </section>

    <section class="pdf-bottom-grid">

      <div class="pdf-section">

        <h2 class="pdf-section-title">
          緊急時連絡先
        </h2>

        <div id="pdf-emergency-contacts">
          読み込み準備中
        </div>

      </div>

      <div class="pdf-section">

        <h2 class="pdf-section-title">
          食事計画
        </h2>

        <div id="pdf-meals">
          読み込み準備中
        </div>

      </div>

    </section>

    <section class="pdf-section">

      <h2 class="pdf-section-title">
        共同装備
      </h2>

      <div id="pdf-equipment">
        読み込み準備中
      </div>

    </section>
  `;
}

/* =========================================
   参加者を読み込む
========================================= */

async function loadPdfMembers(
  tripId
) {
  const membersElement =
    document.getElementById(
      "pdf-members"
    );

  if (!membersElement) {
    return;
  }

  try {
    const response =
      await portalFetch(
        "/rest/v1/trip_members" +
        "?select=" +
        "id," +
        "member_id," +
        "is_leader," +
        "roles," +
        "members(" +
        "name," +
        "gender," +
        "blood_type," +
        "birth_date," +
        "insurance," +
        "mobile_phone," +
        "address," +
        "emergency_name," +
        "emergency_relation," +
        "emergency_phone" +
        ")" +
        `&trip_id=eq.${encodeURIComponent(
          tripId
        )}` +
        "&order=id.asc"
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "参加者情報の取得に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    const rows =
      await response.json();

    const members =
      rows
        .map(
          (row) => ({
            isLeader:
              row.is_leader === true,

            roles:
              Array.isArray(
                row.roles
              )
                ? row.roles
                : [],

            name:
              row.members?.name ||
              "氏名不明",

            birthDate:
              row.members?.birth_date ||
              "",

            gender:
              row.members?.gender ||
              "",

            bloodType:
              row.members?.blood_type ||
              "",

            address:
              row.members?.address ||
              "",

            mobilePhone:
              row.members?.mobile_phone ||
              "",

            emergencyName:
              row.members?.emergency_name ||
              "",

            emergencyRelation:
              row.members?.emergency_relation ||
              "",

            emergencyPhone:
              row.members?.emergency_phone ||
              "",

            insurance:
              row.members?.insurance ||
              ""
          })
        )
        .sort(
          (a, b) =>
            Number(b.isLeader) -
            Number(a.isLeader)
        );

    renderPdfMembers(
      membersElement,
      members
    );

  } catch (error) {
    console.error(error);

    membersElement.innerHTML =
      "参加者情報を読み込めませんでした。";
  }
}

/* =========================================
   参加者を表示
========================================= */

function renderPdfMembers(
  membersElement,
  members
) {
  if (
    !Array.isArray(members) ||
    members.length === 0
  ) {
    membersElement.innerHTML =
      "参加者は登録されていません。";

    return;
  }

  membersElement.innerHTML = `
    <div class="pdf-member-table">

      <div class="pdf-member-header">
        担当
      </div>

      <div class="pdf-member-header">
        氏名
      </div>

      <div class="pdf-member-header">
        年齢
      </div>

      <div class="pdf-member-header">
        性別
      </div>

      <div class="pdf-member-header">
        血液型
      </div>

      <div class="pdf-member-header">
        住所
      </div>

      <div class="pdf-member-header">
        携帯番号
      </div>

      <div class="pdf-member-header">
        緊急連絡先
      </div>

      <div class="pdf-member-header">
        緊急電話
      </div>

      <div class="pdf-member-header">
        保険
      </div>

      ${members
        .map(
          (member) =>
            createPdfMemberRow(
              member
            )
        )
        .join("")}

    </div>
  `;
}

/* =========================================
   参加者1人分
========================================= */

function createPdfMemberRow(
  member
) {
  const roles =
    [...member.roles];

  if (
    member.isLeader &&
    !roles.includes("CL")
  ) {
    roles.unshift("CL");
  }

  const firstRole =
    roles[0] || "";

  const secondRole =
    roles[1] || "";

  const age =
    calculatePdfAge(
      member.birthDate
    );

  const emergencyPerson =
    [
      member.emergencyName,
      member.emergencyRelation
        ? `（${member.emergencyRelation}）`
        : ""
    ]
      .filter(Boolean)
      .join("");

  return `
    <div class="pdf-member-role">

      <div class="pdf-member-role-top">
        ${escapePdfHtml(
          firstRole
        )}
      </div>

      <div class="pdf-member-role-bottom">
        ${escapePdfHtml(
          secondRole
        )}
      </div>

    </div>

    <div class="pdf-member-cell pdf-member-name">
      ${escapePdfHtml(
        member.name
      )}
    </div>

    <div class="pdf-member-cell">
      ${escapePdfHtml(
        age === null
          ? ""
          : `${age}`
      )}
    </div>

    <div class="pdf-member-cell">
      ${escapePdfHtml(
        member.gender
      )}
    </div>

    <div class="pdf-member-cell">
      ${escapePdfHtml(
        member.bloodType
      )}
    </div>

    <div class="pdf-member-cell pdf-member-address">
      ${escapePdfHtml(
        member.address
      )}
    </div>

    <div class="pdf-member-cell">
      ${escapePdfHtml(
        member.mobilePhone
      )}
    </div>

    <div class="pdf-member-cell">
      ${escapePdfHtml(
        emergencyPerson
      )}
    </div>

    <div class="pdf-member-cell">
      ${escapePdfHtml(
        member.emergencyPhone
      )}
    </div>

    <div class="pdf-member-cell">
      ${escapePdfHtml(
        member.insurance
      )}
    </div>
  `;
}

/* =========================================
   年齢計算
========================================= */

function calculatePdfAge(
  birthDate
) {
  if (!birthDate) {
    return null;
  }

  const birth =
    new Date(
      `${birthDate}T00:00:00`
    );

  if (
    Number.isNaN(
      birth.getTime()
    )
  ) {
    return null;
  }

  const today =
    new Date();

  let age =
    today.getFullYear() -
    birth.getFullYear();

  const birthdayThisYear =
    new Date(
      today.getFullYear(),
      birth.getMonth(),
      birth.getDate()
    );

  if (
    today <
    birthdayThisYear
  ) {
    age -= 1;
  }

  return age;
}

/* =========================================
   基本情報1行
========================================= */

function createPdfRow(
  label,
  value
) {
  return `
    <div class="pdf-basic-label">
      ${escapePdfHtml(
        label
      )}
    </div>

    <div class="pdf-basic-value">
      ${escapePdfHtml(
        value ||
        "未入力"
      )}
    </div>
  `;
}

/* =========================================
   日付表示
========================================= */

function formatPdfDate(
  value
) {
  if (!value) {
    return "未設定";
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl
    .DateTimeFormat(
      "ja-JP",
      {
        year:
          "numeric",

        month:
          "numeric",

        day:
          "numeric"
      }
    )
    .format(date);
}

/* =========================================
   時刻表示
========================================= */

function formatPdfTime(
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

function escapePdfHtml(
  value
) {
  return String(
    value ?? ""
  )
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