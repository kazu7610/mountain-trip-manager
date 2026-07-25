/* =========================================
   ポンコツ倶楽部
   詳細計画書
========================================= */

let currentDetailedTrip = null;
let selectedEmergencyContacts = [];

document.addEventListener(
  "DOMContentLoaded",
  () => {
    if (!requirePortalLogin()) {
      return;
    }

    setupPlanButtons();
    loadDetailedPlanTrip();
  }
);

/* =========================================
   対象の山行IDを取得
========================================= */

function getDetailedPlanTripId() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const queryTripId =
    params.get("id");

  if (queryTripId) {
    return queryTripId;
  }

  return localStorage.getItem(
    "pendingDetailedPlanTripId"
  );
}

/* =========================================
   ボタン設定
========================================= */

function setupPlanButtons() {
  const saveButton =
    document.querySelector(
      ".secondary-button"
    );

  const pdfButton =
    document.querySelector(
      ".primary-button"
    );

  if (saveButton) {
    saveButton.addEventListener(
      "click",
      () =>
        saveDetailedPlan(
          saveButton
        )
    );
  }

  if (pdfButton) {
    pdfButton.addEventListener(
      "click",
      () => {
        alert(
          "PDF作成機能は、このあと作成します。"
        );
      }
    );
  }
}

/* =========================================
   山行情報を読み込む
========================================= */

async function loadDetailedPlanTrip() {
  const tripId =
    getDetailedPlanTripId();

  if (!tripId) {
    alert(
      "詳細計画書の対象となる山行を確認できません。"
    );

    location.href =
      "index.html";

    return;
  }

  const infoElement =
    document.getElementById(
      "plan-trip-info"
    );

  if (!infoElement) {
    console.error(
      "山行基本情報の表示場所が見つかりません。"
    );

    return;
  }

  infoElement.innerHTML = `
    <p class="placeholder">
      山行情報を読み込んでいます...
    </p>
  `;

  try {
    const response =
      await portalFetch(
        "/rest/v1/trips" +
        "?select=*" +
        `&id=eq.${tripId}` +
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
        "対象の山行情報が見つかりません。"
      );
    }

    currentDetailedTrip =
      trip;

    infoElement.innerHTML = `
      <p class="placeholder">
        <strong>山域：</strong>
        ${escapeHtml(
          trip.mountain_area ||
          "未入力"
        )}
      </p>

      <p class="placeholder">
        <strong>山名：</strong>
        ${escapeHtml(
          trip.mountain_name ||
          "未入力"
        )}
      </p>

      <p class="placeholder">
        <strong>ルート：</strong>
        ${escapeHtml(
          trip.route ||
          "未入力"
        )}
      </p>

      <p class="placeholder">
        <strong>入山日：</strong>
        ${formatDate(
          trip.entry_date
        )}
      </p>

      <p class="placeholder">
        <strong>下山予定：</strong>
        ${formatDate(
          trip.descent_date
        )}
        ${formatTime(
          trip.descent_time
        )}
      </p>
    `;

    await loadDetailedPlanMembers(
      trip.id
    );

    await loadDetailedPlanActions(
      trip
    );
    
    await loadDetailedPlanEmergencyContacts(
      trip
   );

   await loadDetailedPlanMeals(
      trip
    );

    await loadDetailedPlanEquipment(
      trip
    );

  } catch (error) {
    console.error(error);

    infoElement.innerHTML = `
      <p class="placeholder">
        山行情報を読み込めませんでした。
      </p>
    `;
  }
}

/* =========================================
   参加者を読み込む
========================================= */

async function loadDetailedPlanMembers(
  tripId
) {
  const membersElement =
    document.getElementById(
      "plan-members"
    );

  if (!membersElement) {
    console.error(
      "参加者情報の表示場所が見つかりません。"
    );

    return;
  }

  membersElement.innerHTML = `
    <p class="placeholder">
      参加者情報を読み込んでいます...
    </p>
  `;

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
        "id," +
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
        `&trip_id=eq.${tripId}` +
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
            tripMemberId:
              row.id,

            memberId:
              row.member_id,

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

            emergencyPhone:
              row.members?.emergency_phone ||
              "",

            emergencyName:
              row.members?.emergency_name ||
              "",

            emergencyRelation:
              row.members?.emergency_relation ||
              "",

            insurance:
              row.members?.insurance ||
              ""
          })
        )
        .sort(
          (a, b) =>
            Number(
              b.isLeader
            ) -
            Number(
              a.isLeader
            )
        );

    if (
      members.length === 0
    ) {
      membersElement.innerHTML = `
        <p class="placeholder">
          参加者は登録されていません。
        </p>
      `;

      return;
    }

    membersElement.innerHTML =
      members
        .map(
          (member, index) =>
            createDetailedMemberHtml(
              member,
              index
            )
        )
        .join("");

  } catch (error) {
    console.error(error);

    membersElement.innerHTML = `
      <p class="placeholder">
        参加者情報を読み込めませんでした。
      </p>
    `;
  }
}

/* =========================================
   参加者1名分の表示
========================================= */

function createDetailedMemberHtml(
  member,
  index
) {
  const age =
    calculateAge(
      member.birthDate
    );

  const birthAndAge =
    member.birthDate
      ? (
          formatDate(
            member.birthDate
          ) +
          (
            age === null
              ? ""
              : `（${age}歳）`
          )
        )
      : "未登録";

  const emergencyPerson =
    member.emergencyName
      ? (
          member.emergencyRelation
            ? (
                `${member.emergencyName}` +
                `（${member.emergencyRelation}）`
              )
            : member.emergencyName
        )
      : "未登録";

  const selectedRoles =
    new Set(
      member.roles
    );

  if (
    member.isLeader &&
    member.roles.length === 0
  ) {
    selectedRoles.add(
      "CL"
    );
  }

  return `
    <article
      class="plan-member-card"
      data-trip-member-id="${escapeHtml(
        member.tripMemberId
      )}"
      data-member-id="${escapeHtml(
        member.memberId
      )}"
    >

      <div class="plan-member-heading">

        <span class="plan-member-number">
          ${index + 1}
        </span>

        <strong class="plan-member-name">
          ${escapeHtml(
            member.name
          )}
        </strong>

        ${
          member.isLeader
            ? `
              <span class="plan-leader-badge">
                代表
              </span>
            `
            : ""
        }

      </div>

      <div class="plan-member-detail">

        <div class="plan-member-label">
          担当
        </div>

        <div class="plan-role-options">

          ${createRoleOptionHtml(
            "CL",
            selectedRoles
          )}

          ${createRoleOptionHtml(
            "SL",
            selectedRoles
          )}

          ${createRoleOptionHtml(
            "車出",
            selectedRoles
          )}

          ${createRoleOptionHtml(
            "食担",
            selectedRoles
          )}

        </div>

      </div>

      ${createMemberInformationRow(
        "生年月日・年齢",
        birthAndAge
      )}

      ${createMemberInformationRow(
        "性別",
        member.gender
      )}

      ${createMemberInformationRow(
        "血液型",
        member.bloodType
      )}

      ${createMemberInformationRow(
        "住所",
        member.address
      )}

      ${createMemberInformationRow(
        "携帯番号",
        member.mobilePhone
      )}

      ${createMemberInformationRow(
        "緊急連絡先電話番号",
        member.emergencyPhone
      )}

      ${createMemberInformationRow(
        "緊急連絡先氏名・続柄",
        emergencyPerson
      )}

      ${createMemberInformationRow(
        "保険の種類",
        member.insurance
      )}

    </article>
  `;
}

/* =========================================
   担当チェック欄
========================================= */

function createRoleOptionHtml(
  roleName,
  selectedRoles
) {
  const checked =
    selectedRoles.has(
      roleName
    )
      ? "checked"
      : "";

  return `
    <label class="plan-role-option">

      <input
        type="checkbox"
        class="plan-role-checkbox"
        value="${escapeHtml(
          roleName
        )}"
        ${checked}
      >

      ${escapeHtml(
        roleName
      )}

    </label>
  `;
}

/* =========================================
   個人情報1行分
========================================= */

function createMemberInformationRow(
  label,
  value
) {
  const displayValue =
    value
      ? value
      : "未登録";

  return `
    <div class="plan-member-detail">

      <div class="plan-member-label">
        ${escapeHtml(
          label
        )}
      </div>

      <div class="plan-member-value">
        ${escapeHtml(
          displayValue
        )}
      </div>

    </div>
  `;
}

/* =========================================
   食事計画を読み込む
========================================= */

async function loadDetailedPlanMeals(
  trip
) {
  const mealsElement =
    document.getElementById(
      "plan-meals"
    );

  if (!mealsElement) {
    console.error(
      "食事計画の表示場所が見つかりません。"
    );

    return;
  }

  mealsElement.innerHTML = `
    <p class="placeholder">
      食事計画を読み込んでいます...
    </p>
  `;

  try {
    const response =
      await portalFetch(
        "/rest/v1/trip_meal_plans" +
        "?select=*" +
        `&trip_id=eq.${trip.id}` +
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

    const savedRows =
      await response.json();

    const members =
      Array.from(
        document.querySelectorAll(
          ".plan-member-name"
        )
      )
        .map(
          (element) =>
            element.textContent.trim()
        )
        .filter(Boolean);

    const participantCount =
      members.length +
      Number(
        trip.outside_member_count ||
        0
      );

    const mealDays =
      createMealDays(
        trip,
        savedRows,
        participantCount
      );

    renderMealPlans(
      mealDays,
      members
    );

  } catch (error) {
    console.error(error);

    mealsElement.innerHTML = `
      <p class="placeholder">
        食事計画を読み込めませんでした。
      </p>
    `;
  }
}

/* =========================================
   食事計画を日付ごとにまとめる
========================================= */

function createMealDays(
  trip,
  savedRows,
  participantCount
) {
  const mealTypes = [
    "breakfast",
    "dinner",
    "action_food",
    "emergency_food"
  ];

  const savedMap =
    new Map();

  for (
    const row
    of savedRows
  ) {
    const key =
      `${row.meal_date}_${row.meal_type}`;

    savedMap.set(
      key,
      {
        mealDate:
          row.meal_date,

        mealType:
          row.meal_type,

        personCount:
          Number(
            row.person_count || 0
          ),

        mealCount:
          Number(
            row.meal_count || 0
          ),

        personInCharge:
          row.person_in_charge ||
          "",

        mealContent:
          row.meal_content ||
          "",

        isNone:
          row.is_none === true
      }
    );
  }

  const mealDays = [];

  let currentDate =
    trip.entry_date;

  while (
    currentDate <=
    trip.descent_date
  ) {
    const meals =
      mealTypes.map(
        (mealType) => {
          const key =
            `${currentDate}_${mealType}`;

          const savedMeal =
            savedMap.get(
              key
            );

          if (savedMeal) {
            return savedMeal;
          }

          const isIndividualMeal =
            mealType ===
              "action_food" ||
            mealType ===
              "emergency_food";

          return {
            mealDate:
              currentDate,

            mealType:
              mealType,

            personCount:
              participantCount,

            mealCount:
              mealType ===
              "action_food"
                ? 2
                : 1,

            personInCharge:
              isIndividualMeal
                ? "各自"
                : "",

            mealContent:
              "",

            isNone:
              false
          };
        }
      );

    mealDays.push({
      mealDate:
        currentDate,

      meals:
        meals
    });

    currentDate =
      addDaysToDateString(
        currentDate,
        1
      );
  }

  return mealDays;
}

/* =========================================
   食事計画を表示
========================================= */

function renderMealPlans(
  mealDays,
  members
) {
  const mealsElement =
    document.getElementById(
      "plan-meals"
    );

  if (!mealsElement) {
    return;
  }

  mealsElement.innerHTML = `
    ${mealDays
      .map(
        (mealDay) => `
          <article
            class="meal-day-card"
            data-meal-date="${escapeHtml(
              mealDay.mealDate
            )}"
          >

            <h3 class="meal-day-title">
              ${escapeHtml(
                formatShortDate(
                  mealDay.mealDate
                )
              )}
            </h3>

            ${mealDay.meals
              .map(
                (meal) =>
                  createMealItemHtml(
                    meal,
                    members
                  )
              )
              .join("")}

          </article>
        `
      )
      .join("")}

    <div class="meal-summary-box">

      <h3 class="meal-summary-title">
        今回の山行の合計食数
      </h3>

      <div id="meal-summary-list"></div>

    </div>
  `;

  setupMealPlanEvents();
  updateMealSummary();
}

/* =========================================
   食事1件分の入力欄
========================================= */

function createMealItemHtml(
  meal,
  members
) {
  const mealLabels = {
    breakfast:
      "朝食",

    dinner:
      "夕食",

    action_food:
      "行動食",

    emergency_food:
      "非常食"
  };

  const mealLabel =
    mealLabels[
      meal.mealType
    ] ||
    meal.mealType;

  const isRegularMeal =
    meal.mealType ===
      "breakfast" ||
    meal.mealType ===
      "dinner";

  const disabledText =
    meal.isNone
      ? "disabled"
      : "";

  const memberOptions =
    [
      '<option value="">担当者を選択</option>',

      `
        <option
          value="各自"
          ${
            meal.personInCharge ===
            "各自"
              ? "selected"
              : ""
          }
        >
          各自
        </option>
      `,

      ...members.map(
        (memberName) => `
          <option
            value="${escapeHtml(
              memberName
            )}"
            ${
              memberName ===
              meal.personInCharge
                ? "selected"
                : ""
            }
          >
            ${escapeHtml(
              memberName
            )}
          </option>
        `
      )
    ].join("");

  return `
    <div
      class="meal-item-card"
      data-meal-type="${escapeHtml(
        meal.mealType
      )}"
      data-meal-label="${escapeHtml(
        mealLabel
      )}"
    >

      <div class="meal-item-heading">

        <div class="meal-title-row">

          <div class="meal-type-label">
            ${escapeHtml(
              mealLabel
            )}
          </div>

          ${
            isRegularMeal
              ? `
                <label class="meal-none-label">

                  <input
                    class="meal-none-checkbox"
                    type="checkbox"
                    ${
                      meal.isNone
                        ? "checked"
                        : ""
                    }
                  >

                  無

                </label>
              `
              : ""
          }

        </div>

      </div>

      <div
        class="meal-input-grid ${
          isRegularMeal
            ? ""
            : "is-simple"
        }"
      >

        ${
          isRegularMeal
            ? `
              <label>

                <span class="meal-field-label">
                  内容
                </span>

                <input
                  class="meal-input meal-content-input"
                  type="text"
                  maxlength="100"
                  placeholder="例：パン・スープ"
                  value="${escapeHtml(
                    meal.mealContent
                  )}"
                  ${disabledText}
                >

              </label>
            `
            : ""
        }

        <label>

          <span class="meal-field-label">
            担当者
          </span>

          <select
            class="meal-select meal-person-select"
            ${disabledText}
          >
            ${memberOptions}
          </select>

        </label>

        <label>

          <span class="meal-field-label">
            人数
          </span>

          <input
            class="meal-input meal-person-count-input"
            type="number"
            min="0"
            max="99"
            inputmode="numeric"
            value="${escapeHtml(
              meal.personCount
            )}"
            ${disabledText}
          >

        </label>

        <label>

          <span class="meal-field-label">
            回数
          </span>

          <input
            class="meal-input meal-count-input"
            type="number"
            min="0"
            max="99"
            inputmode="numeric"
            value="${escapeHtml(
              meal.mealCount
            )}"
            ${disabledText}
          >

        </label>

      </div>

    </div>
  `;
}

/* =========================================
   食事計画の操作設定
========================================= */

function setupMealPlanEvents() {
  const mealCards =
    document.querySelectorAll(
      ".meal-item-card"
    );

  mealCards.forEach(
    (mealCard) => {
      const noneCheckbox =
        mealCard.querySelector(
          ".meal-none-checkbox"
        );

      if (noneCheckbox) {
        noneCheckbox.addEventListener(
          "change",
          () => {
            const disabled =
              noneCheckbox.checked;

            mealCard
              .querySelectorAll(
                ".meal-content-input," +
                ".meal-person-select," +
                ".meal-person-count-input," +
                ".meal-count-input"
              )
              .forEach(
                (input) => {
                  input.disabled =
                    disabled;
                }
              );

            if (disabled) {
              const contentInput =
                mealCard.querySelector(
                  ".meal-content-input"
                );

              const personSelect =
                mealCard.querySelector(
                  ".meal-person-select"
                );

              const personCountInput =
                mealCard.querySelector(
                  ".meal-person-count-input"
                );

              const mealCountInput =
                mealCard.querySelector(
                  ".meal-count-input"
                );

              if (contentInput) {
                contentInput.value =
                  "";
              }

              if (personSelect) {
                personSelect.value =
                  "";
              }

              if (personCountInput) {
                personCountInput.value =
                  "0";
              }

              if (mealCountInput) {
                mealCountInput.value =
                  "0";
              }
            }

            updateMealSummary();
          }
        );
      }

      mealCard
        .querySelectorAll(
          ".meal-content-input," +
          ".meal-person-select," +
          ".meal-person-count-input," +
          ".meal-count-input"
        )
        .forEach(
          (input) => {
            input.addEventListener(
              "input",
              updateMealSummary
            );

            input.addEventListener(
              "change",
              updateMealSummary
            );
          }
        );
    }
  );
}

/* =========================================
   食事計画の合計を表示
========================================= */

function updateMealSummary() {
  const summaryList =
    document.getElementById(
      "meal-summary-list"
    );

  if (!summaryList) {
    return;
  }

  const mealCards =
    Array.from(
      document.querySelectorAll(
        ".meal-item-card"
      )
    );

  const summaryMap =
    new Map();

  for (
    const mealCard
    of mealCards
  ) {
    const isNone =
      mealCard
        .querySelector(
          ".meal-none-checkbox"
        )
        ?.checked === true;

    if (isNone) {
      continue;
    }

    const mealLabel =
      mealCard.dataset.mealLabel ||
      "";

    const personInCharge =
      mealCard
        .querySelector(
          ".meal-person-select"
        )
        ?.value ||
      "未選択";

    const mealCount =
      Number(
        mealCard
          .querySelector(
            ".meal-count-input"
          )
          ?.value ||
        0
      );

    const summaryKey =
      `${mealLabel}_${personInCharge}`;

    const currentCount =
      summaryMap.get(
        summaryKey
      ) ||
      0;

    summaryMap.set(
      summaryKey,
      currentCount +
      mealCount
    );
  }

  const summaryOrder = [
    "朝食",
    "夕食",
    "行動食",
    "非常食"
  ];

  const summaryRows = [];

  for (
    const mealLabel
    of summaryOrder
  ) {
    const matchingRows =
      Array.from(
        summaryMap.entries()
      )
        .filter(
          ([key]) =>
            key.startsWith(
              `${mealLabel}_`
            )
        );

    if (
      matchingRows.length === 0
    ) {
      summaryRows.push(`
        <div class="meal-summary-row">

          <span class="meal-summary-label">
            ${escapeHtml(
              mealLabel
            )}
          </span>

          <span class="meal-summary-person">
            無
          </span>

          <span class="meal-summary-count">
            0回
          </span>

        </div>
      `);

      continue;
    }

    for (
      const [key, count]
      of matchingRows
    ) {
      const personInCharge =
        key.slice(
          mealLabel.length +
          1
        );

      summaryRows.push(`
        <div class="meal-summary-row">

          <span class="meal-summary-label">
            ${escapeHtml(
              mealLabel
            )}
          </span>

          <span class="meal-summary-person">
            ${escapeHtml(
              personInCharge
            )}
          </span>

          <span class="meal-summary-count">
            ${escapeHtml(
              count
            )}回
          </span>

        </div>
      `);
    }
  }

  summaryList.innerHTML =
    summaryRows.join("");
}


/* =========================================
   緊急時連絡先を読み込む
========================================= */

async function loadDetailedPlanEmergencyContacts(
  trip
) {
  const emergencyElement =
    document.getElementById(
      "plan-emergency-contacts"
    );

  if (!emergencyElement) {
    console.error(
      "緊急時連絡先の表示場所が見つかりません。"
    );

    return;
  }

  emergencyElement.innerHTML = `
    <p class="placeholder">
      緊急時連絡先を読み込んでいます...
    </p>
  `;

  try {
    const savedResponse =
      await portalFetch(
        "/rest/v1/trip_emergency_contacts" +
        "?select=*" +
        `&trip_id=eq.${trip.id}` +
        "&order=contact_order.asc"
      );

    if (!savedResponse.ok) {
      const errorText =
        await savedResponse.text();

      throw new Error(
        "保存済み緊急連絡先の取得に失敗しました。" +
        ` ${savedResponse.status} ${errorText}`
      );
    }

    const savedRows =
      await savedResponse.json();

    selectedEmergencyContacts =
      savedRows.map(
        (row) => ({
          emergencyContactId:
            row.emergency_contact_id,

          contactName:
            row.contact_name || "",

          phoneNumber:
            row.phone_number || "",

          contactType:
            row.contact_type || "",

          notes:
            row.notes || "",

          isManual:
            row.is_manual === true
        })
      );

    const candidateResponse =
      await portalFetch(
        "/rest/v1/emergency_contacts" +
        "?select=*" +
        "&order=prefecture.asc,mountain_area.asc"
      );

    if (!candidateResponse.ok) {
      const errorText =
        await candidateResponse.text();

      throw new Error(
        "緊急連絡先マスタの取得に失敗しました。" +
        ` ${candidateResponse.status} ${errorText}`
      );
    }

    const candidates =
      await candidateResponse.json();

    renderEmergencyContacts(
      trip,
      candidates
    );

  } catch (error) {
    console.error(error);

    emergencyElement.innerHTML = `
      <p class="placeholder">
        緊急時連絡先を読み込めませんでした。
      </p>
    `;
  }
}

/* =========================================
   緊急時連絡先を表示
========================================= */

function renderEmergencyContacts(
  trip,
  candidates
) {
  const emergencyElement =
    document.getElementById(
      "plan-emergency-contacts"
    );

  if (!emergencyElement) {
    return;
  }

  const initialKeyword =
    [
      trip.mountain_area,
      trip.mountain_name
    ]
      .filter(Boolean)
      .join(" ");

      const preferredPrefectures = [
  "三重県",
  "岐阜県",
  "長野県"
];

const allPrefectures =
  Array.from(
    new Set(
      candidates
        .map(
          (candidate) =>
            candidate.prefecture
        )
        .filter(Boolean)
    )
  );

const prefectures = [
  ...preferredPrefectures.filter(
    (prefecture) =>
      allPrefectures.includes(
        prefecture
      )
  ),

  ...allPrefectures
    .filter(
      (prefecture) =>
        !preferredPrefectures.includes(
          prefecture
        )
    )
    .sort()
];

const mountainAreas =
  Array.from(
    new Set(
      candidates
        .map(
          (candidate) =>
            candidate.mountain_area
        )
        .filter(Boolean)
    )
  )
    .sort();

const mountainAreaOptions =
  [
    '<option value="">山域を選択</option>',

    ...mountainAreas.map(
      (mountainArea) => `
        <option
          value="${escapeHtml(
            mountainArea
          )}"
          ${
            mountainArea ===
            trip.mountain_area
              ? "selected"
              : ""
          }
        >
          ${escapeHtml(
            mountainArea
          )}
        </option>
      `
    )
  ]
    .join("");


const contactTypes =
  Array.from(
    new Set(
      candidates
        .map(
          (candidate) =>
            candidate.contact_type
        )
        .filter(Boolean)
    )
  )
    .sort();

const prefectureOptions =
  [
    '<option value="">都道府県を選択</option>',

    ...prefectures.map(
      (prefecture) => `
        <option value="${escapeHtml(
          prefecture
        )}">
          ${escapeHtml(
            prefecture
          )}
        </option>
      `
    )
  ]
    .join("");

const contactTypeOptions =
  [
    '<option value="">種別を選択</option>',

    ...contactTypes.map(
      (contactType) => `
        <option value="${escapeHtml(
          contactType
        )}">
          ${escapeHtml(
            contactType
          )}
        </option>
      `
    )
  ]
    .join("");

  emergencyElement.innerHTML = `
    <div class="emergency-search-box">

     <label class="emergency-search-label">
  条件を選んで緊急時連絡先を検索
</label>

<div class="emergency-filter-grid">

  <label>

    <span class="emergency-filter-label">
      都道府県
    </span>

    <select
      id="emergency-prefecture-select"
      class="emergency-search-input"
    >
      ${prefectureOptions}
    </select>

  </label>

  <label>

  <span class="emergency-filter-label">
    山域
  </span>

  <select
    id="emergency-mountain-area-select"
    class="emergency-search-input"
  >
    ${mountainAreaOptions}
  </select>

</label>

<label>

  <span class="emergency-filter-label">
    山名
  </span>

  <input
    id="emergency-search-input"
    class="emergency-search-input"
    type="text"
    value="${escapeHtml(
      trip.mountain_name ||
      ""
    )}"
    placeholder="例：穂高岳、槍ヶ岳"
  >

</label>

  <label>

    <span class="emergency-filter-label">
      種別
    </span>

    <select
      id="emergency-contact-type-select"
      class="emergency-search-input"
    >
      ${contactTypeOptions}
    </select>

  </label>

  <button
    id="emergency-search-button"
    class="emergency-search-button"
    type="button"
  >
    検索
  </button>

</div>

      <div
        id="emergency-candidate-list"
        class="emergency-candidate-list"
      ></div>

    </div>

    <h3 class="emergency-selected-title">
      選択済み
    </h3>

    <div id="emergency-selected-list"></div>

    <div class="emergency-manual-box">

      <h3 class="emergency-manual-title">
        手入力で追加
      </h3>

      <div class="emergency-manual-grid">

        <input
          id="emergency-manual-name"
          class="emergency-manual-input"
          type="text"
          placeholder="名称"
        >

        <input
          id="emergency-manual-phone"
          class="emergency-manual-input"
          type="text"
          placeholder="電話番号"
        >

        <input
          id="emergency-manual-type"
          class="emergency-manual-input"
          type="text"
          placeholder="種別（警察・消防など）"
        >

        <input
          id="emergency-manual-note"
          class="emergency-manual-input"
          type="text"
          placeholder="備考"
        >

      </div>

      <button
        id="emergency-manual-add-button"
        class="emergency-manual-add-button"
        type="button"
      >
        手入力の連絡先を追加
      </button>

    </div>
  `;

  setupEmergencyContactEvents(
    candidates
  );

  renderSelectedEmergencyContacts();

  searchEmergencyContacts(
    candidates
  );
}

/* =========================================
   緊急時連絡先の操作設定
========================================= */

function setupEmergencyContactEvents(
  candidates
) {
  const searchButton =
    document.getElementById(
      "emergency-search-button"
    );

  const searchInput =
    document.getElementById(
      "emergency-search-input"
    );

  const manualAddButton =
    document.getElementById(
      "emergency-manual-add-button"
    );

  if (searchButton) {
    searchButton.addEventListener(
      "click",
      () =>
        searchEmergencyContacts(
          candidates
        )
    );
  }

  if (searchInput) {
    searchInput.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key ===
          "Enter"
        ) {
          event.preventDefault();

          searchEmergencyContacts(
            candidates
          );
        }
      }
    );
  }

  if (manualAddButton) {
    manualAddButton.addEventListener(
      "click",
      addManualEmergencyContact
    );
  }
}

/* =========================================
   緊急時連絡先を検索
========================================= */

function searchEmergencyContacts(
  candidates
) {
  const searchInput =
    document.getElementById(
      "emergency-search-input"
    );

  const prefectureSelect =
    document.getElementById(
      "emergency-prefecture-select"
    );

  const mountainAreaSelect =
    document.getElementById(
      "emergency-mountain-area-select"
    );

  const contactTypeSelect =
    document.getElementById(
      "emergency-contact-type-select"
    );

  const candidateList =
    document.getElementById(
      "emergency-candidate-list"
    );

  if (
    !searchInput ||
    !candidateList
  ) {
    return;
  }

  const keyword =
    searchInput.value
      .trim()
      .toLowerCase();

  const prefecture =
    prefectureSelect
      ?.value
      .trim() ||
    "";

  const mountainArea =
    mountainAreaSelect
      ?.value
      .trim() ||
    "";

  const contactType =
    contactTypeSelect
      ?.value
      .trim() ||
    "";

  let filteredCandidates =
    candidates.filter(
      (candidate) => {
        const areaText =
          [
            candidate.mountain_name_area,
            candidate.contact_name,
            candidate.notes
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const matchesKeyword =
          !keyword ||
          areaText.includes(
            keyword
          );

        const matchesPrefecture =
          !prefecture ||
          candidate.prefecture ===
          prefecture;

        const matchesMountainArea =
          !mountainArea ||
          candidate.mountain_area ===
          mountainArea;

        const matchesContactType =
          !contactType ||
          candidate.contact_type ===
          contactType;

        return (
          matchesKeyword &&
          matchesPrefecture &&
          matchesMountainArea &&
          matchesContactType
        );
      }
    );

  filteredCandidates =
    filteredCandidates.slice(
      0,
      20
    );

  renderEmergencyCandidateList(
    filteredCandidates
  );
}

/* =========================================
   緊急時連絡先の候補一覧を表示
========================================= */

function renderEmergencyCandidateList(
  candidates
) {
  const candidateList =
    document.getElementById(
      "emergency-candidate-list"
    );

  if (!candidateList) {
    return;
  }

  if (
    !Array.isArray(candidates) ||
    candidates.length === 0
  ) {
    candidateList.innerHTML = `
      <p class="placeholder">
        条件に合う緊急時連絡先が見つかりません。
      </p>
    `;

    return;
  }

  candidateList.innerHTML =
    candidates
      .map(
        (candidate) => {
          const alreadySelected =
            selectedEmergencyContacts.some(
              (selected) =>
                Number(
                  selected.emergencyContactId
                ) ===
                Number(
                  candidate.id
                )
            );

          return `
            <article class="emergency-candidate-card">

              <div class="emergency-candidate-heading">

                <div class="emergency-contact-name">
                  ${escapeHtml(
                    candidate.contact_name ||
                    "名称未登録"
                  )}
                </div>

                <span class="emergency-contact-type">
                  ${escapeHtml(
                    candidate.contact_type ||
                    "種別未登録"
                  )}
                </span>

              </div>

              <p class="emergency-contact-phone">
                ${escapeHtml(
                  candidate.phone_number ||
                  "電話番号未確認"
                )}
              </p>

              <p class="emergency-contact-area">
                ${escapeHtml(
                  [
                    candidate.prefecture,
                    candidate.mountain_area,
                    candidate.mountain_name_area
                  ]
                    .filter(Boolean)
                    .join("／")
                )}
              </p>

              ${
                candidate.notes
                  ? `
                    <p class="emergency-contact-note">
                      ${escapeHtml(
                        candidate.notes
                      )}
                    </p>
                  `
                  : ""
              }

              ${
                candidate.validity_status ===
                "要確認"
                  ? `
                    <div class="emergency-warning">
                      この連絡先は要確認です。山行前に最新情報を確認してください。
                    </div>
                  `
                  : ""
              }

              <button
                class="emergency-select-button"
                type="button"
                data-contact-id="${escapeHtml(
                  candidate.id
                )}"
                ${alreadySelected
                  ? "disabled"
                  : ""}
              >
                ${
                  alreadySelected
                    ? "選択済み"
                    : "この連絡先を選択"
                }
              </button>

            </article>
          `;
        }
      )
      .join("");

  const selectButtons =
    candidateList.querySelectorAll(
      ".emergency-select-button"
    );

  selectButtons.forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          const contactId =
            Number(
              button.dataset.contactId
            );

          const candidate =
            candidates.find(
              (item) =>
                Number(item.id) ===
                contactId
            );

          if (!candidate) {
            return;
          }

          addSelectedEmergencyContact(
            candidate
          );
        }
      );
    }
  );
}

/* =========================================
   緊急時連絡先を選択
========================================= */

function addSelectedEmergencyContact(
  candidate
) {
  const alreadySelected =
    selectedEmergencyContacts.some(
      (selected) =>
        Number(
          selected.emergencyContactId
        ) ===
        Number(
          candidate.id
        )
    );

  if (alreadySelected) {
    alert(
      "この緊急時連絡先はすでに選択されています。"
    );

    return;
  }

  selectedEmergencyContacts.push({
    emergencyContactId:
      candidate.id,

    contactName:
      candidate.contact_name ||
      "",

    phoneNumber:
      candidate.phone_number ||
      "",

    contactType:
      candidate.contact_type ||
      "",

    notes:
      candidate.notes ||
      "",

    isManual:
      false
  });

  renderSelectedEmergencyContacts();

  const searchInput =
    document.getElementById(
      "emergency-search-input"
    );

  if (
    searchInput &&
    currentDetailedTrip
  ) {
    const event =
      new KeyboardEvent(
        "keydown",
        {
          key:
            "Enter"
        }
      );

    searchInput.dispatchEvent(
      event
    );
  }
}

/* =========================================
   選択済み緊急時連絡先を表示
========================================= */

function renderSelectedEmergencyContacts() {
  const selectedList =
    document.getElementById(
      "emergency-selected-list"
    );

  if (!selectedList) {
    return;
  }

  if (
    selectedEmergencyContacts.length === 0
  ) {
    selectedList.innerHTML = `
      <p class="placeholder">
        緊急時連絡先はまだ選択されていません。
      </p>
    `;

    return;
  }

  selectedList.innerHTML =
    selectedEmergencyContacts
      .map(
        (contact, index) => `
          <article
            class="emergency-selected-card"
            data-contact-index="${index}"
          >

            <div class="emergency-selected-heading">

              <div>

                <div class="emergency-contact-name">
                  ${escapeHtml(
                    contact.contactName ||
                    "名称未登録"
                  )}
                </div>

                <p class="emergency-contact-phone">
                  ${escapeHtml(
                    contact.phoneNumber ||
                    "電話番号未確認"
                  )}
                </p>

              </div>

              <button
                class="emergency-remove-button"
                type="button"
                data-contact-index="${index}"
              >
                削除
              </button>

            </div>

            ${
              contact.contactType
                ? `
                  <p class="emergency-contact-area">
                    種別：
                    ${escapeHtml(
                      contact.contactType
                    )}
                  </p>
                `
                : ""
            }

            ${
              contact.notes
                ? `
                  <p class="emergency-contact-note">
                    ${escapeHtml(
                      contact.notes
                    )}
                  </p>
                `
                : ""
            }

            ${
              contact.isManual
                ? `
                  <div class="emergency-warning">
                    手入力で追加した連絡先です。
                  </div>
                `
                : ""
            }

          </article>
        `
      )
      .join("");

  const removeButtons =
    selectedList.querySelectorAll(
      ".emergency-remove-button"
    );

  removeButtons.forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          const index =
            Number(
              button.dataset.contactIndex
            );

          if (
            !Number.isInteger(index) ||
            index < 0
          ) {
            return;
          }

          selectedEmergencyContacts.splice(
            index,
            1
          );

          renderSelectedEmergencyContacts();

          const searchButton =
            document.getElementById(
              "emergency-search-button"
            );

          searchButton?.click();
        }
      );
    }
  );
}

/* =========================================
   緊急時連絡先を手入力で追加
========================================= */

function addManualEmergencyContact() {
  const nameInput =
    document.getElementById(
      "emergency-manual-name"
    );

  const phoneInput =
    document.getElementById(
      "emergency-manual-phone"
    );

  const typeInput =
    document.getElementById(
      "emergency-manual-type"
    );

  const noteInput =
    document.getElementById(
      "emergency-manual-note"
    );

  const contactName =
    nameInput?.value.trim() ||
    "";

  const phoneNumber =
    phoneInput?.value.trim() ||
    "";

  const contactType =
    typeInput?.value.trim() ||
    "";

  const notes =
    noteInput?.value.trim() ||
    "";

  if (!contactName) {
    alert(
      "緊急時連絡先の名称を入力してください。"
    );

    nameInput?.focus();

    return;
  }

  if (!phoneNumber) {
    alert(
      "電話番号を入力してください。"
    );

    phoneInput?.focus();

    return;
  }

  selectedEmergencyContacts.push({
    emergencyContactId:
      null,

    contactName:
      contactName,

    phoneNumber:
      phoneNumber,

    contactType:
      contactType,

    notes:
      notes,

    isManual:
      true
  });

  renderSelectedEmergencyContacts();

  if (nameInput) {
    nameInput.value =
      "";
  }

  if (phoneInput) {
    phoneInput.value =
      "";
  }

  if (typeInput) {
    typeInput.value =
      "";
  }

  if (noteInput) {
    noteInput.value =
      "";
  }

  nameInput?.focus();
}


/* =========================================
   行動予定を読み込む
========================================= */

async function loadDetailedPlanActions(
  trip
) {
  const actionsElement =
    document.getElementById(
      "plan-actions"
    );

  if (!actionsElement) {
    console.error(
      "行動予定の表示場所が見つかりません。"
    );

    return;
  }

  actionsElement.innerHTML = `
    <p class="placeholder">
      行動予定を読み込んでいます...
    </p>
  `;

  try {
    const response =
      await portalFetch(
        "/rest/v1/trip_plan_actions" +
        "?select=*" +
        `&trip_id=eq.${trip.id}` +
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

    const dayPlans =
      createDayPlansFromRows(
        rows,
        trip
      );

    renderActionDays(
      dayPlans,
      trip
    );

  } catch (error) {
    console.error(error);

    actionsElement.innerHTML = `
      <p class="placeholder">
        行動予定を読み込めませんでした。
      </p>
    `;
  }
}

/* =========================================
   保存データを日付ごとにまとめる
========================================= */

function createDayPlansFromRows(
  rows,
  trip
) {
  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    return [
      {
        planDate:
          trip.entry_date,

        dayStatus:
          null,

        actions: [
          {
            time:
              "",

            text:
              ""
          }
        ]
      }
    ];
  }

  const dayMap =
    new Map();

  for (
    const row
    of rows
  ) {
    if (
      !dayMap.has(
        row.plan_date
      )
    ) {
      dayMap.set(
        row.plan_date,
        {
          planDate:
            row.plan_date,

          dayStatus:
            row.day_status ||
            null,

          actions: []
        }
      );
    }

    const dayPlan =
      dayMap.get(
        row.plan_date
      );

    dayPlan.actions.push({
      time:
        formatTimeForInput(
          row.action_time
        ),

      text:
        row.action_text ||
        ""
    });

    if (
      row.day_status
    ) {
      dayPlan.dayStatus =
        row.day_status;
    }
  }

  const dayPlans =
    Array.from(
      dayMap.values()
    )
      .sort(
        (a, b) =>
          a.planDate.localeCompare(
            b.planDate
          )
      );

  const lastDay =
    dayPlans[
      dayPlans.length - 1
    ];

  if (
    lastDay &&
    lastDay.dayStatus === "day_end" &&
    lastDay.planDate <
      trip.descent_date
  ) {
    const nextDate =
      addDaysToDateString(
        lastDay.planDate,
        1
      );

    if (
      nextDate <=
      trip.descent_date
    ) {
      dayPlans.push({
        planDate:
          nextDate,

        dayStatus:
          null,

        actions: [
          {
            time:
              "",

            text:
              ""
          }
        ]
      });
    }
  }

  return dayPlans;
}

/* =========================================
   行動予定を表示
========================================= */

function renderActionDays(
  dayPlans,
  trip
) {
  const actionsElement =
    document.getElementById(
      "plan-actions"
    );

  if (!actionsElement) {
    return;
  }

  actionsElement.innerHTML =
    dayPlans
      .map(
        (dayPlan) =>
          createActionDayHtml(
            dayPlan,
            trip
          )
      )
      .join("");

  setupActionDayEvents(
    trip
  );
}

/* =========================================
   1日分の行動予定
========================================= */

function createActionDayHtml(
  dayPlan,
  trip
) {
  const isFinalDay =
    dayPlan.planDate ===
    trip.descent_date;

  const isCompleted =
    dayPlan.dayStatus ===
      "day_end" ||
    dayPlan.dayStatus ===
      "descent";

  const finishLabel =
    isFinalDay
      ? "下山"
      : "本日の予定終了";

  const finishClass =
    isFinalDay
      ? "is-descent"
      : "";

  const badgeText =
    isFinalDay
      ? "最終日"
      : "行動日";

  const actionRows =
    dayPlan.actions.length > 0
      ? dayPlan.actions
      : [
          {
            time:
              "",

            text:
              ""
          }
        ];

  return `
    <article
      class="plan-action-day ${
        isCompleted
          ? "is-completed"
          : ""
      }"
      data-plan-date="${escapeHtml(
        dayPlan.planDate
      )}"
      data-day-status="${escapeHtml(
        dayPlan.dayStatus ||
        ""
      )}"
    >

      <div class="plan-action-day-heading">

        <div class="plan-action-date">
          ${escapeHtml(
            formatShortDate(
              dayPlan.planDate
            )
          )}
        </div>

        <span class="plan-action-day-badge">
          ${badgeText}
        </span>

      </div>

      <div class="plan-action-list">

        ${actionRows
          .map(
            (action) =>
              createActionRowHtml(
                action,
                isCompleted
              )
          )
          .join("")}

      </div>

      ${
        isCompleted
          ? `
            <div class="plan-action-completed-message">
              ${
                dayPlan.dayStatus ===
                "descent"
                  ? "下山"
                  : "本日の予定終了"
              }
            </div>
          `
          : `
            <div class="plan-action-controls">

              <button
                class="plan-action-add-button"
                type="button"
              >
                ＋ 行動を追加
              </button>

              <button
                class="plan-action-finish-button ${finishClass}"
                type="button"
                data-finish-status="${
                  isFinalDay
                    ? "descent"
                    : "day_end"
                }"
              >
                ${finishLabel}
              </button>

            </div>
          `
      }

    </article>
  `;
}

/* =========================================
   時間＋内容の1行
========================================= */

function createActionRowHtml(
  action,
  disabled
) {
  const disabledText =
    disabled
      ? "disabled"
      : "";

  return `
    <div class="plan-action-row">

      <input
        class="plan-action-time"
        type="time"
        value="${escapeHtml(
          action.time ||
          ""
        )}"
        ${disabledText}
      >

      <input
        class="plan-action-text"
        type="text"
        maxlength="100"
        placeholder="行動内容を入力"
        value="${escapeHtml(
          action.text ||
          ""
        )}"
        ${disabledText}
      >

      <button
        class="plan-action-delete-button"
        type="button"
        aria-label="この行動を削除"
        ${disabledText}
      >
        ×
      </button>

    </div>
  `;
}

/* =========================================
   行動予定のボタン設定
========================================= */

function setupActionDayEvents(
  trip
) {
  const dayCards =
    document.querySelectorAll(
      ".plan-action-day"
    );

  dayCards.forEach(
    (dayCard) => {
      const addButton =
        dayCard.querySelector(
          ".plan-action-add-button"
        );

      const finishButton =
        dayCard.querySelector(
          ".plan-action-finish-button"
        );

      if (addButton) {
        addButton.addEventListener(
          "click",
          () =>
            addActionRow(
              dayCard
            )
        );
      }

      if (finishButton) {
        finishButton.addEventListener(
          "click",
          () =>
            finishActionDay(
              dayCard,
              trip
            )
        );
      }

      setupDeleteButtons(
        dayCard
      );
    }
  );
}

/* =========================================
   行動を1件追加
========================================= */

function addActionRow(
  dayCard
) {
  const actionList =
    dayCard.querySelector(
      ".plan-action-list"
    );

  if (!actionList) {
    return;
  }

  const currentRows =
    actionList.querySelectorAll(
      ".plan-action-row"
    );

  let inheritedTime =
    "";

  if (
    currentRows.length > 0
  ) {
    const lastTimeInput =
      currentRows[
        currentRows.length - 1
      ].querySelector(
        ".plan-action-time"
      );

    inheritedTime =
      lastTimeInput?.value ||
      "";
  }

  actionList.insertAdjacentHTML(
    "beforeend",
    createActionRowHtml(
      {
        time:
          inheritedTime,

        text:
          ""
      },
      false
    )
  );

  setupDeleteButtons(
    dayCard
  );

  const newRows =
    actionList.querySelectorAll(
      ".plan-action-row"
    );

  const lastRow =
    newRows[
      newRows.length - 1
    ];

  lastRow
    ?.querySelector(
      ".plan-action-text"
    )
    ?.focus();
}

/* =========================================
   行動を削除
========================================= */

function setupDeleteButtons(
  dayCard
) {
  const deleteButtons =
    dayCard.querySelectorAll(
      ".plan-action-delete-button"
    );

  deleteButtons.forEach(
    (button) => {
      if (
        button.dataset.ready ===
        "true"
      ) {
        return;
      }

      button.dataset.ready =
        "true";

      button.addEventListener(
        "click",
        () => {
          const actionList =
            dayCard.querySelector(
              ".plan-action-list"
            );

          const rows =
            actionList
              ?.querySelectorAll(
                ".plan-action-row"
              );

          if (
            !rows ||
            rows.length <= 1
          ) {
            alert(
              "行動予定は最低1行必要です。"
            );

            return;
          }

          button
            .closest(
              ".plan-action-row"
            )
            ?.remove();
        }
      );
    }
  );
}

/* =========================================
   1日の予定を終了
========================================= */

function finishActionDay(
  dayCard,
  trip
) {
  const rows =
    Array.from(
      dayCard.querySelectorAll(
        ".plan-action-row"
      )
    );

  const hasIncomplete =
    rows.some(
      (row) => {
        const time =
          row.querySelector(
            ".plan-action-time"
          )?.value.trim();

        const text =
          row.querySelector(
            ".plan-action-text"
          )?.value.trim();

        return (
          (time && !text) ||
          (!time && text)
        );
      }
    );

  if (hasIncomplete) {
    alert(
      "時間と行動内容を両方入力してください。"
    );

    return;
  }

  const hasAction =
    rows.some(
      (row) => {
        const time =
          row.querySelector(
            ".plan-action-time"
          )?.value.trim();

        const text =
          row.querySelector(
            ".plan-action-text"
          )?.value.trim();

        return Boolean(
          time &&
          text
        );
      }
    );

  if (!hasAction) {
    alert(
      "行動予定を1件以上入力してください。"
    );

    return;
  }

  const finishButton =
    dayCard.querySelector(
      ".plan-action-finish-button"
    );

  const finishStatus =
    finishButton
      ?.dataset
      .finishStatus;

  const message =
    finishStatus === "descent"
      ? "この日を「下山」として終了しますか？"
      : "この日の行動予定を終了して、翌日の入力へ進みますか？";

  if (
    !confirm(
      message
    )
  ) {
    return;
  }

  dayCard.dataset.dayStatus =
    finishStatus;

  dayCard.classList.add(
    "is-completed"
  );

  dayCard
    .querySelectorAll(
      "input, button"
    )
    .forEach(
      (element) => {
        element.disabled =
          true;
      }
    );

  const controls =
    dayCard.querySelector(
      ".plan-action-controls"
    );

  if (controls) {
    controls.remove();
  }

  dayCard.insertAdjacentHTML(
    "beforeend",
    `
      <div class="plan-action-completed-message">
        ${
          finishStatus ===
          "descent"
            ? "下山"
            : "本日の予定終了"
        }
      </div>
    `
  );

  if (
    finishStatus ===
    "day_end"
  ) {
    addNextActionDay(
      dayCard,
      trip
    );
  }
}

/* =========================================
   翌日の入力欄を追加
========================================= */

function addNextActionDay(
  currentDayCard,
  trip
) {
  const currentDate =
    currentDayCard.dataset.planDate;

  const nextDate =
    addDaysToDateString(
      currentDate,
      1
    );

  if (
    nextDate >
    trip.descent_date
  ) {
    return;
  }

  const existingDay =
    document.querySelector(
      `.plan-action-day[data-plan-date="${nextDate}"]`
    );

  if (existingDay) {
    existingDay.scrollIntoView({
      behavior:
        "smooth",

      block:
        "center"
    });

    return;
  }

  const actionsElement =
    document.getElementById(
      "plan-actions"
    );

  if (!actionsElement) {
    return;
  }

  actionsElement.insertAdjacentHTML(
    "beforeend",
    createActionDayHtml(
      {
        planDate:
          nextDate,

        dayStatus:
          null,

        actions: [
          {
            time:
              "",

            text:
              ""
          }
        ]
      },
      trip
    )
  );

  setupActionDayEvents(
    trip
  );

  const newDayCard =
    document.querySelector(
      `.plan-action-day[data-plan-date="${nextDate}"]`
    );

  newDayCard?.scrollIntoView({
    behavior:
      "smooth",

    block:
      "center"
  });
}

/* =========================================
   詳細計画書を一時保存
========================================= */

async function saveDetailedPlan(
  saveButton
) {
  const tripId =
    getDetailedPlanTripId();

  if (!tripId) {
    alert(
      "保存対象の山行を確認できません。"
    );

    return;
  }

  if (
    !validateActionPlans()
  ) {
    return;
  }

  const confirmed =
    confirm(
      "現在の詳細計画書を一時保存しますか？"
    );

  if (!confirmed) {
    return;
  }

  saveButton.disabled =
    true;

  saveButton.textContent =
    "保存中...";

  try {
    await saveDetailedPlanRoles(
      tripId
    );

    await saveDetailedPlanActions(
      tripId
    );

    await saveDetailedPlanEmergencyContacts(
      tripId
    );

    await saveDetailedPlanMeals(
      tripId
    );

    await saveDetailedPlanEquipment(
      tripId
    );

    alert(
      "詳細計画書を一時保存しました。"
    );

    if (
      currentDetailedTrip
    ) {
      await loadDetailedPlanMembers(
        tripId
      );

      await loadDetailedPlanEmergencyContacts(
      currentDetailedTrip
     );

      await loadDetailedPlanActions(
        currentDetailedTrip
      );

      await loadDetailedPlanMeals(
        currentDetailedTrip
      );

      await loadDetailedPlanEquipment(
        currentDetailedTrip
      );
    }

  } catch (error) {
    console.error(error);

    alert(
      "詳細計画書を保存できませんでした。"
    );

  } finally {
    saveButton.disabled =
      false;

    saveButton.textContent =
      "一時保存";
  }
}

/* =========================================
   担当を保存
========================================= */

async function saveDetailedPlanRoles(
  tripId
) {
  const memberCards =
    Array.from(
      document.querySelectorAll(
        ".plan-member-card"
      )
    );

  for (
    const card
    of memberCards
  ) {
    const tripMemberId =
      card.dataset
        .tripMemberId;

    if (!tripMemberId) {
      continue;
    }

    const roles =
      Array.from(
        card.querySelectorAll(
          ".plan-role-checkbox:checked"
        )
      )
        .map(
          (checkbox) =>
            checkbox.value
        );

    const response =
      await portalFetch(
        "/rest/v1/trip_members" +
        `?id=eq.${tripMemberId}` +
        `&trip_id=eq.${tripId}`,
        {
          method:
            "PATCH",

          headers: {
            Prefer:
              "return=minimal"
          },

          body:
            JSON.stringify({
              roles
            })
        }
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "担当の保存に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }
  }
}

/* =========================================
   行動予定を保存
========================================= */

async function saveDetailedPlanActions(
  tripId
) {
  const dayCards =
    Array.from(
      document.querySelectorAll(
        ".plan-action-day"
      )
    );

  const saveRows =
    [];

  for (
    const dayCard
    of dayCards
  ) {
    const planDate =
      dayCard.dataset
        .planDate;

    const dayStatus =
      dayCard.dataset
        .dayStatus ||
      null;

    const actionRows =
      Array.from(
        dayCard.querySelectorAll(
          ".plan-action-row"
        )
      );

    let actionOrder =
      1;

    for (
      const actionRow
      of actionRows
    ) {
      const actionTime =
        actionRow
          .querySelector(
            ".plan-action-time"
          )
          ?.value
          .trim() ||
        "";

      const actionText =
        actionRow
          .querySelector(
            ".plan-action-text"
          )
          ?.value
          .trim() ||
        "";

      if (
        !actionTime &&
        !actionText
      ) {
        continue;
      }

      saveRows.push({
        trip_id:
          Number(
            tripId
          ),

        plan_date:
          planDate,

        action_order:
          actionOrder,

        action_time:
          actionTime ||
          null,

        action_text:
          actionText,

        day_status:
          dayStatus
      });

      actionOrder +=
        1;
    }
  }

  const deleteResponse =
    await portalFetch(
      "/rest/v1/trip_plan_actions" +
      `?trip_id=eq.${tripId}`,
      {
        method:
          "DELETE",

        headers: {
          Prefer:
            "return=minimal"
        }
      }
    );

  if (
    !deleteResponse.ok
  ) {
    const errorText =
      await deleteResponse.text();

    throw new Error(
      "以前の行動予定を削除できませんでした。" +
      ` ${deleteResponse.status} ${errorText}`
    );
  }

  if (
    saveRows.length === 0
  ) {
    return;
  }

  const insertResponse =
    await portalFetch(
      "/rest/v1/trip_plan_actions",
      {
        method:
          "POST",

        headers: {
          Prefer:
            "return=minimal"
        },

        body:
          JSON.stringify(
            saveRows
          )
      }
    );

  if (
    !insertResponse.ok
  ) {
    const errorText =
      await insertResponse.text();

    throw new Error(
      "行動予定の保存に失敗しました。" +
      ` ${insertResponse.status} ${errorText}`
    );
  }
}

/* =========================================
   食事計画を保存
========================================= */

async function saveDetailedPlanMeals(
  tripId
) {
  const mealDayCards =
    Array.from(
      document.querySelectorAll(
        ".meal-day-card"
      )
    );

  const saveRows =
    [];

  for (
    const dayCard
    of mealDayCards
  ) {
    const mealDate =
      dayCard.dataset.mealDate;

    const mealCards =
      Array.from(
        dayCard.querySelectorAll(
          ".meal-item-card"
        )
      );

    let mealOrder =
      1;

    for (
      const mealCard
      of mealCards
    ) {
      const mealType =
        mealCard.dataset.mealType;

      const isNone =
        mealCard
          .querySelector(
            ".meal-none-checkbox"
          )
          ?.checked === true;

      const mealContent =
        mealCard
          .querySelector(
            ".meal-content-input"
          )
          ?.value
          .trim() ||
        "";

      const personInCharge =
        mealCard
          .querySelector(
            ".meal-person-select"
          )
          ?.value
          .trim() ||
        "";

      const personCount =
        Number(
          mealCard
            .querySelector(
              ".meal-person-count-input"
            )
            ?.value ||
          0
        );

      const mealCount =
        Number(
          mealCard
            .querySelector(
              ".meal-count-input"
            )
            ?.value ||
          0
        );

      saveRows.push({
        trip_id:
          Number(
            tripId
          ),

        meal_date:
          mealDate,

        meal_type:
          mealType,

        person_count:
          isNone
            ? 0
            : personCount,

        meal_count:
          isNone
            ? 0
            : mealCount,

        person_in_charge:
          isNone ||
          !personInCharge
            ? null
            : personInCharge,

        meal_content:
          isNone ||
          !mealContent
            ? null
            : mealContent,

        is_none:
          isNone,

        meal_order:
          mealOrder
      });

      mealOrder +=
        1;
    }
  }

  const deleteResponse =
    await portalFetch(
      "/rest/v1/trip_meal_plans" +
      `?trip_id=eq.${tripId}`,
      {
        method:
          "DELETE",

        headers: {
          Prefer:
            "return=minimal"
        }
      }
    );

  if (
    !deleteResponse.ok
  ) {
    const errorText =
      await deleteResponse.text();

    throw new Error(
      "以前の食事計画を削除できませんでした。" +
      ` ${deleteResponse.status} ${errorText}`
    );
  }

  if (
    saveRows.length === 0
  ) {
    return;
  }

  const insertResponse =
    await portalFetch(
      "/rest/v1/trip_meal_plans",
      {
        method:
          "POST",

        headers: {
          Prefer:
            "return=minimal"
        },

        body:
          JSON.stringify(
            saveRows
          )
      }
    );

  if (
    !insertResponse.ok
  ) {
    const errorText =
      await insertResponse.text();

    throw new Error(
      "食事計画の保存に失敗しました。" +
      ` ${insertResponse.status} ${errorText}`
    );
  }
}



/* =========================================
   緊急時連絡先を保存
========================================= */

async function saveDetailedPlanEmergencyContacts(
  tripId
) {
  const deleteResponse =
    await portalFetch(
      "/rest/v1/trip_emergency_contacts" +
      `?trip_id=eq.${tripId}`,
      {
        method:
          "DELETE",

        headers: {
          Prefer:
            "return=minimal"
        }
      }
    );

  if (!deleteResponse.ok) {
    const errorText =
      await deleteResponse.text();

    throw new Error(
      "以前の緊急時連絡先を削除できませんでした。" +
      ` ${deleteResponse.status} ${errorText}`
    );
  }

  if (
    selectedEmergencyContacts.length === 0
  ) {
    return;
  }

  const saveRows =
    selectedEmergencyContacts.map(
      (contact, index) => ({
        trip_id:
          Number(
            tripId
          ),

        emergency_contact_id:
          contact.emergencyContactId
            ? Number(
                contact.emergencyContactId
              )
            : null,

        contact_order:
          index + 1,

        contact_name:
          contact.contactName,

        phone_number:
          contact.phoneNumber ||
          null,

        contact_type:
          contact.contactType ||
          null,

        notes:
          contact.notes ||
          null,

        is_manual:
          contact.isManual === true
      })
    );

  const insertResponse =
    await portalFetch(
      "/rest/v1/trip_emergency_contacts",
      {
        method:
          "POST",

        headers: {
          Prefer:
            "return=minimal"
        },

        body:
          JSON.stringify(
            saveRows
          )
      }
    );

  if (!insertResponse.ok) {
    const errorText =
      await insertResponse.text();

    throw new Error(
      "緊急時連絡先の保存に失敗しました。" +
      ` ${insertResponse.status} ${errorText}`
    );
  }
}

/* =========================================
   行動予定の入力確認
========================================= */

function validateActionPlans() {
  const actionRows =
    Array.from(
      document.querySelectorAll(
        ".plan-action-row"
      )
    );

  for (
    const row
    of actionRows
  ) {
    const time =
      row
        .querySelector(
          ".plan-action-time"
        )
        ?.value
        .trim() ||
      "";

    const text =
      row
        .querySelector(
          ".plan-action-text"
        )
        ?.value
        .trim() ||
      "";

    if (
      (time && !text) ||
      (!time && text)
    ) {
      alert(
        "時間と行動内容を両方入力してください。"
      );

      row.scrollIntoView({
        behavior:
          "smooth",

        block:
          "center"
      });

      return false;
    }
  }

  return true;
}

/* =========================================
   日付に日数を追加
========================================= */

function addDaysToDateString(
  dateString,
  days
) {
  const date =
    new Date(
      `${dateString}T00:00:00`
    );

  date.setDate(
    date.getDate() +
    days
  );

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    ),
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    )
  ].join("-");
}

/* =========================================
   年齢計算
========================================= */

function calculateAge(
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

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "未設定";
  }

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
   行動予定の日付表示
========================================= */

function formatShortDate(
  value
) {
  if (!value) {
    return "日付未設定";
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
    return "日付未設定";
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
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
    .slice(
      0,
      5
    );
}

/* =========================================
   時刻入力用
========================================= */

function formatTimeForInput(
  value
) {
  if (!value) {
    return "";
  }

  return String(value)
    .slice(
      0,
      5
    );
}

/* =========================================
   HTML安全対策
========================================= */

function escapeHtml(
  value
) {
  return String(
    value ??
    ""
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