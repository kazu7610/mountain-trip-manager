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

    await loadPdfActions(
  trip.id
);

    await loadPdfEmergencyContacts(
  trip.id
);

    await loadPdfMeals(
  trip.id
);

    await loadPdfEquipment(
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

 <div class="pdf-header-club-information">

  <div class="pdf-header-club-name">
    ポンコツ倶楽部　
    <span class="pdf-header-representative">
      代表者 鈴木和弘
    </span>
  </div>

  <div>
    住所 〒452-0946　
    愛知県清須市廻間3-5-3
  </div>

  <div>
    電話 052-401-7610　
    <span class="pdf-header-mobile">
      携帯 090-9331-1080
    </span>
  </div>

</div>

</header>

    <section class="pdf-top-grid">

  <div class="pdf-section">

    <div class="pdf-basic-heading-row">

  <h2 class="pdf-section-title">
    山行基本情報
  </h2>

  <div class="pdf-plan-dates">

    <span>
      提出日
      ${trip.submitted_at
        ? escapePdfHtml(
            formatPdfDate(
              String(
                trip.submitted_at
              ).slice(0, 10)
            )
          )
        : "未設定"}
    </span>

    <span>
      受理日
      ${trip.approved_at
        ? escapePdfHtml(
            formatPdfDate(
              String(
                trip.approved_at
              ).slice(0, 10)
            )
          )
        : "未設定"}
    </span>

  </div>

</div>

<div class="pdf-basic-grid pdf-basic-grid-half">

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

  </div>

  <div class="pdf-section pdf-club-section">

  <h2 class="pdf-section-title">
  緊急連絡先
</h2>

  <div class="pdf-basic-grid pdf-club-contact-grid">

    ${createPdfRow(
      "氏名",
      trip.club_emergency_name
    )}

    ${createPdfRow(
      "電話番号",
      trip.club_emergency_phone
    )}

  </div>

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

      ${
  trip.plan_special_notes
    ? `
        <div class="pdf-action-special-note">
          <strong>※特記事項：</strong>
          ${escapePdfHtml(
            trip.plan_special_notes
          )}
        </div>
      `
    : ""
}

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
   共同装備を読み込む
========================================= */

async function loadPdfEquipment(
  tripId
) {
  const equipmentElement =
    document.getElementById(
      "pdf-equipment"
    );

  if (!equipmentElement) {
    return;
  }

  try {
    const response =
      await portalFetch(
        "/rest/v1/trip_shared_equipment" +
        "?select=*" +
        `&trip_id=eq.${encodeURIComponent(
          tripId
        )}` +
        "&order=equipment_order.asc"
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "共同装備の取得に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    const rows =
      await response.json();

    renderPdfEquipment(
      equipmentElement,
      rows
    );

  } catch (error) {
    console.error(error);

    equipmentElement.innerHTML =
      "共同装備を読み込めませんでした。";
  }
}

/* =========================================
   共同装備を表示
========================================= */

function renderPdfEquipment(
  equipmentElement,
  rows
) {
  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    equipmentElement.innerHTML =
      "共同装備は登録されていません。";

    return;
  }

  const climbingRows =
    rows.filter(
      (row) =>
        row.equipment_category ===
        "登攀"
    );

  const otherRows =
    rows.filter(
      (row) =>
        row.equipment_category !==
        "登攀"
    );

  equipmentElement.innerHTML = `
    <div class="pdf-equipment-split">

      <div class="pdf-equipment-group">

        <div class="pdf-equipment-group-title">
          登攀装備
        </div>

        ${createPdfEquipmentTable(
          climbingRows
        )}

      </div>

      <div class="pdf-equipment-group">

        <div class="pdf-equipment-group-title">
          共同装備一覧
        </div>

        ${createPdfEquipmentTable(
          otherRows
        )}

      </div>

    </div>
  `;
}

/* =========================================
   共同装備を表示
========================================= */

function renderPdfEquipment(
  equipmentElement,
  rows
) {
  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    equipmentElement.innerHTML =
      "共同装備は登録されていません。";

    return;
  }

  const climbingRows =
    rows.filter(
      (row) =>
        row.equipment_category ===
        "登攀"
    );

  const otherRows =
    rows.filter(
      (row) =>
        row.equipment_category !==
        "登攀"
    );

  equipmentElement.innerHTML = `
    <div class="pdf-equipment-split">

      <div class="pdf-equipment-group">

        <div class="pdf-equipment-group-title">
          共同装備一覧
        </div>

        ${createPdfEquipmentTable(
          otherRows
        )}

      </div>

      <div class="pdf-equipment-group">

        <div class="pdf-equipment-group-title">
          登攀装備
        </div>

        ${createPdfEquipmentTable(
          climbingRows
        )}

      </div>

    </div>
  `;
}

/* =========================================
   共同装備の表を作る
========================================= */

function createPdfEquipmentTable(
  rows
) {
  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    return `
      <div class="pdf-equipment-empty">
        登録なし
      </div>
    `;
  }

  return `
    <div class="pdf-equipment-table">

      <div class="pdf-equipment-header">
        装備名
      </div>

      <div class="pdf-equipment-header">
        規格
      </div>

      <div class="pdf-equipment-header">
        数量
      </div>

      <div class="pdf-equipment-header">
        担当
      </div>

      ${rows
        .map(
          (row) => `
            <div class="pdf-equipment-cell">
              ${escapePdfHtml(
                row.equipment_name ||
                ""
              )}
            </div>

            <div class="pdf-equipment-cell">
              ${escapePdfHtml(
                row.equipment_spec ||
                ""
              )}
            </div>

            <div class="pdf-equipment-cell">
              ${escapePdfHtml(
                row.quantity ?? ""
              )}
            </div>

            <div class="pdf-equipment-cell">
              ${escapePdfHtml(
                formatPdfEquipmentPersons(
                  row.person_in_charge
                )
              )}
            </div>
          `
        )
        .join("")}

    </div>
  `;
}

/* =========================================
   共同装備担当者を苗字表示
========================================= */

function formatPdfEquipmentPersons(
  personText
) {
  const persons =
    String(
      personText ||
      ""
    )
      .split("｜")
      .map(
        (person) =>
          person.trim()
      )
      .filter(Boolean)
      .map(
        (person) => {
          if (person === "各自") {
            return person;
          }

          return person
            .split(/[\s　]+/)
            .filter(Boolean)[0] ||
            person;
        }
      );

  return Array.from(
    new Set(persons)
  ).join("・");
}

/* =========================================
   食事計画を読み込む
========================================= */

async function loadPdfMeals(
  tripId
) {
  const mealsElement =
    document.getElementById(
      "pdf-meals"
    );

  if (!mealsElement) {
    return;
  }

  try {
    const response =
      await portalFetch(
        "/rest/v1/trip_meal_plans" +
        "?select=*" +
        `&trip_id=eq.${encodeURIComponent(
          tripId
        )}` +
        "&order=meal_date.asc,meal_order.asc"
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "食事計画の取得に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    const rows =
      await response.json();

    renderPdfMeals(
      mealsElement,
      rows
    );

  } catch (error) {
    console.error(error);

    mealsElement.innerHTML =
      "食事計画を読み込めませんでした。";
  }
}

/* =========================================
   食事計画を表示
========================================= */

function renderPdfMeals(
  mealsElement,
  rows
) {
  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    mealsElement.innerHTML =
      "食事計画は登録されていません。";

    return;
  }

  const mealTypes = [
    {
      key: "breakfast",
      label: "朝食"
    },
    {
      key: "dinner",
      label: "夕食"
    },
    {
      key: "action_food",
      label: "行動食"
    },
    {
      key: "emergency_food",
      label: "非常食"
    }
  ];

  const summaryRows =
    mealTypes.map(
      (mealType) => {
        const matchingRows =
          rows.filter(
            (row) =>
              row.meal_type ===
              mealType.key
          );

        const activeRows =
          matchingRows.filter(
            (row) =>
              row.is_none !== true
          );

        const isAllNone =
          matchingRows.length > 0 &&
          activeRows.length === 0;

        const contents =
          Array.from(
            new Set(
              activeRows
                .map(
                  (row) =>
                    String(
                      row.meal_content ||
                      ""
                    ).trim()
                )
                .filter(Boolean)
            )
          );

        const persons =
          Array.from(
            new Set(
              activeRows
                .map(
                  (row) =>
                    getPdfMealPersonName(
                      row.person_in_charge
                    )
                )
                .filter(Boolean)
            )
          );

        const totalCount =
          activeRows.reduce(
            (total, row) =>
              total +
              Number(
                row.meal_count ||
                0
              ),
            0
          );

        return {
          label:
            mealType.label,

          content:
            isAllNone
              ? "無"
              : contents.join("・"),

          person:
            isAllNone
              ? ""
              : persons.join("・"),

          count:
            isAllNone
              ? ""
              : totalCount
        };
      }
    );

  mealsElement.innerHTML = `
    <div class="pdf-meal-table">

      <div class="pdf-meal-header">
        区分
      </div>

      <div class="pdf-meal-header">
        内容
      </div>

      <div class="pdf-meal-header">
        担当
      </div>

      <div class="pdf-meal-header">
        回数
      </div>

      ${summaryRows
        .map(
          (row) => `
            <div class="pdf-meal-cell">
              ${escapePdfHtml(
                row.label
              )}
            </div>

            <div class="pdf-meal-cell pdf-meal-content">
              ${escapePdfHtml(
                row.content
              )}
            </div>

            <div class="pdf-meal-cell">
              ${escapePdfHtml(
                row.person
              )}
            </div>

            <div class="pdf-meal-cell">
              ${escapePdfHtml(
                row.count
              )}
            </div>
          `
        )
        .join("")}

    </div>
  `;
}

/* =========================================
   食事担当者を苗字だけにする
========================================= */

function getPdfMealPersonName(
  personName
) {
  const name =
    String(
      personName ||
      ""
    ).trim();

  if (!name) {
    return "";
  }

  if (name === "各自") {
    return "各自";
  }

  return name
    .split(/[\s　]+/)
    .filter(Boolean)[0] ||
    name;
}

/* =========================================
   緊急時連絡先を読み込む
========================================= */

async function loadPdfEmergencyContacts(
  tripId
) {
  const emergencyElement =
    document.getElementById(
      "pdf-emergency-contacts"
    );

  if (!emergencyElement) {
    return;
  }

  try {
    const response =
      await portalFetch(
        "/rest/v1/trip_emergency_contacts" +
        "?select=*" +
        `&trip_id=eq.${encodeURIComponent(
          tripId
        )}` +
        "&order=contact_order.asc"
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "緊急時連絡先の取得に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    const rows =
      await response.json();

    renderPdfEmergencyContacts(
      emergencyElement,
      rows
    );

  } catch (error) {
    console.error(error);

    emergencyElement.innerHTML =
      "緊急時連絡先を読み込めませんでした。";
  }
}

/* =========================================
   緊急時連絡先を表示
========================================= */

function renderPdfEmergencyContacts(
  emergencyElement,
  rows
) {
  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    emergencyElement.innerHTML =
      "緊急時連絡先は登録されていません。";

    return;
  }

  emergencyElement.innerHTML = `
    <div class="pdf-emergency-table">

      <div class="pdf-emergency-header">
        種別
      </div>

      <div class="pdf-emergency-header">
        名称
      </div>

      <div class="pdf-emergency-header">
        電話番号
      </div>

      <div class="pdf-emergency-header">
        備考
      </div>

      ${rows
        .map(
          (row) => `
            <div class="pdf-emergency-cell">
              ${escapePdfHtml(
                row.contact_type ||
                ""
              )}
            </div>

            <div class="pdf-emergency-cell">
              ${escapePdfHtml(
                row.contact_name ||
                ""
              )}
            </div>

            <div class="pdf-emergency-cell">
              ${escapePdfHtml(
                row.phone_number ||
                ""
              )}
            </div>

            <div class="pdf-emergency-cell pdf-emergency-note">
              ${escapePdfHtml(
                row.notes ||
                ""
              )}
            </div>
          `
        )
        .join("")}

    </div>
  `;
}

/* =========================================
   行動予定を読み込む
========================================= */

async function loadPdfActions(
  tripId
) {
  const actionsElement =
    document.getElementById(
      "pdf-actions"
    );

  if (!actionsElement) {
    return;
  }

  try {
    const response =
      await portalFetch(
        "/rest/v1/trip_plan_actions" +
        "?select=*" +
        `&trip_id=eq.${encodeURIComponent(
          tripId
        )}` +
        "&order=plan_date.asc,action_order.asc"
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "行動予定の取得に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    const rows =
      await response.json();

    renderPdfActions(
      actionsElement,
      rows
    );

  } catch (error) {
    console.error(error);

    actionsElement.innerHTML =
      "行動予定を読み込めませんでした。";
  }
}

/* =========================================
   行動予定を表示
========================================= */

function renderPdfActions(
  actionsElement,
  rows
) {
  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    actionsElement.innerHTML =
      "行動予定は登録されていません。";

    return;
  }

  const groupedActions =
    new Map();

  rows.forEach(
    (row) => {
      const planDate =
        row.plan_date ||
        "";

      if (
        !groupedActions.has(
          planDate
        )
      ) {
        groupedActions.set(
          planDate,
          []
        );
      }

      groupedActions
        .get(planDate)
        .push(row);
    }
  );

  actionsElement.innerHTML =
    Array.from(
      groupedActions.entries()
    )
      .map(
        ([planDate, dayRows]) => {
          const actionText =
            dayRows
              .map(
                (row) => {
                  const time =
                    row.action_time
                      ? formatPdfTime(
                          row.action_time
                        )
                      : "";

                  const text =
                    row.action_text ||
                    "";

                  return `
                    <span class="pdf-action-item">

                      <span class="pdf-action-item-time">
                        ${escapePdfHtml(
                          time
                        )}
                      </span>

                      <span class="pdf-action-item-text">
                        ${escapePdfHtml(
                          text
                        )}
                      </span>

                    </span>
                  `;
                }
              )
              .join("");

          return `
            <div class="pdf-action-day">

              <div class="pdf-action-date">
                ${escapePdfHtml(
                  formatPdfDate(
                    planDate
                  )
                )}
              </div>

              <div class="pdf-action-content">
                ${actionText}
              </div>

            </div>
          `;
        }
      )
      .join("");
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
    const memberResponse =
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

    if (!memberResponse.ok) {
      const errorText =
        await memberResponse.text();

      throw new Error(
        "参加者情報の取得に失敗しました。" +
        ` ${memberResponse.status} ${errorText}`
      );
    }

    const memberRows =
      await memberResponse.json();

    const members =
      memberRows
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

    const guestResponse =
      await portalFetch(
        "/rest/v1/trip_guest_members" +
        "?select=*" +
        `&trip_id=eq.${encodeURIComponent(
          tripId
        )}` +
        "&order=guest_order.asc,id.asc"
      );

    if (!guestResponse.ok) {
      const errorText =
        await guestResponse.text();

      throw new Error(
        "会員外参加者の取得に失敗しました。" +
        ` ${guestResponse.status} ${errorText}`
      );
    }

    const guestRows =
      await guestResponse.json();

    const guestMembers =
      guestRows.map(
        (row) => ({
          isLeader:
            false,

          roles:
            Array.isArray(
              row.roles
            )
              ? row.roles
              : [],

          name:
            row.name ||
            "氏名不明",

          birthDate:
            row.birth_date ||
            "",

          gender:
            row.gender ||
            "",

          bloodType:
            row.blood_type ||
            "",

          address:
            row.address ||
            "",

          mobilePhone:
            row.mobile_phone ||
            "",

          emergencyName:
            row.emergency_name ||
            "",

          emergencyRelation:
            "",

          emergencyPhone:
            row.emergency_phone ||
            "",

          insurance:
            row.insurance ||
            ""
        })
      );

    renderPdfMembers(
      membersElement,
      [
        ...members,
        ...guestMembers
      ]
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