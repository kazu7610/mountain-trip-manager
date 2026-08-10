/* =========================================
   ポンコツ倶楽部
   詳細計画書・共同装備
========================================= */

let selectedSharedEquipment = [];

/* =========================================
   共同装備マスタ
========================================= */

const sharedEquipmentMaster = {
  "テント・幕営": {
    "テント": {
      type: "select",
      options: [
        "1～2人用",
        "2～3人用",
        "4～5人用",
        "6人用",
        "8人用",
        "手入力"
      ]
    },

    "ツエルト": {
      type: "select",
      options: [
        "1～2人用",
        "2～3人用",
        "手入力"
      ]
    },

    "ランタン": {
      type: "select",
      options: [
        "一般",
        "手入力"
      ],
      defaultValue: "一般"
    }
  },

  "調理器具": {
    "コンロヘッド": {
      type: "select",
      options: [
        "一体型",
        "分離型",
        "手入力"
      ]
    },

    "ガス缶": {
      type: "select",
      options: [
        "一般",
        "冬季",
        "手入力"
      ]
    },

    "ヤカン": {
      type: "select",
      options: [
        "大",
        "中",
        "小",
        "手入力"
      ]
    },

    "コッヘル": {
      type: "select",
      options: [
        "大",
        "中",
        "小",
        "セット",
        "手入力"
      ]
    },

    "ベニア板": {
      type: "select",
      options: [
        "一般",
        "手入力"
      ],
      defaultValue: "一般"
    },

    "プラティパス": {
      type: "select",
      options: [
        "1L",
        "2L",
        "4L",
        "手入力"
      ]
    }
  },

  "登攀": {
    "ロープ": {
      type: "rope"
    }, 

    "支点セット": {
  type: "select",
  options: [
    "一般",
    "手入力"
  ],
  defaultValue: "一般"
},

"ビレイセット": {
  type: "select",
  options: [
    "一般",
    "手入力"
  ],
  defaultValue: "一般"
},

    "ヌンチャク": {
      type: "select",
      options: [
        "一般"
      ],
      defaultValue: "一般"
    },

    "アルヌン": {
      type: "select",
      options: [
        "60cm",
        "120cm",
        "180cm",
        "手入力"
      ]
    },

    "カム": {
      type: "select",
      options: [
        "0.3",
        "0.4",
        "0.5",
        "0.75",
        "1",
        "2",
        "3",
        "4",
        "セット",
        "手入力"
      ]
    },

    "自由入力": {
  type: "free"
},

    "アイススクリュー": {
      type: "select",
      options: [
        "10cm",
        "13cm",
        "16cm",
        "19cm",
        "22cm",
        "手入力"
      ]
    },

    "ハンマー": {
      type: "select",
      options: [
        "一般",
        "手入力"
      ],
      defaultValue: "一般"
    },

    "ハーケン類": {
      type: "piton"
    },

    "スコップ": {
      type: "select",
      options: [
        "一般",
        "手入力"
      ],
      defaultValue: "一般"
    },

    "スノーバー": {
      type: "select",
      options: [
        "50cm",
        "60cm",
        "手入力"
      ]
    }
  },

  "その他": {
    "無線機": {
      type: "select",
      options: [
        "アマチュア無線",
        "デジタル簡易無線",
        "特定小電力",
        "その他"
      ]
    },

    "自由入力": {
      type: "free"
    }
  }
};

/* =========================================
   共同装備を読み込む
========================================= */

async function loadDetailedPlanEquipment(
  trip
) {
  const equipmentElement =
    document.getElementById(
      "plan-equipment"
    );

  if (!equipmentElement) {
    return;
  }

  equipmentElement.innerHTML = `
    <p class="placeholder">
      共同装備を読み込んでいます...
    </p>
  `;

  try {
    const response =
      await portalFetch(
        "/rest/v1/trip_shared_equipment" +
        "?select=*" +
        `&trip_id=eq.${trip.id}` +
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

    selectedSharedEquipment =
      rows.map(
        (row) => ({
          category:
            row.equipment_category ||
            "",

          name:
            row.equipment_name ||
            "",

          spec:
            row.equipment_spec ||
            "",

          quantity:
            Number(
              row.quantity ||
              1
            ),

          personInCharge:
            row.person_in_charge ||
            ""
        })
      );

    renderSharedEquipment();

  } catch (error) {
    console.error(error);

    equipmentElement.innerHTML = `
      <p class="placeholder">
        共同装備を読み込めませんでした。
      </p>
    `;
  }
}

/* =========================================
   共同装備入力画面を表示
========================================= */

function renderSharedEquipment() {
  const equipmentElement =
    document.getElementById(
      "plan-equipment"
    );

  if (!equipmentElement) {
    return;
  }

  const members =
    getDetailedPlanMemberNames();

  const categoryOptions =
    Object.keys(
      sharedEquipmentMaster
    )
      .map(
        (category) => `
          <option
            value="${escapeHtml(
              category
            )}"
          >
            ${escapeHtml(
              category
            )}
          </option>
        `
      )
      .join("");

  const memberCheckboxes =
    [
      `
        <label class="equipment-person-option">

          <input
            class="equipment-person-checkbox"
            type="checkbox"
            value="各自"
          >

          各自

        </label>
      `,

      ...members.map(
        (memberName) => `
          <label class="equipment-person-option">

            <input
              class="equipment-person-checkbox"
              type="checkbox"
              value="${escapeHtml(
                memberName
              )}"
            >

            ${escapeHtml(
              memberName
            )}

          </label>
        `
      )
    ]
      .join("");

  equipmentElement.innerHTML = `
    <div class="equipment-entry-box">

      <div class="equipment-entry-grid">

        <label>

          <span class="equipment-field-label">
            カテゴリ
          </span>

          <select
            id="equipment-category-select"
            class="equipment-select"
          >
            ${categoryOptions}
          </select>

        </label>

        <label>

          <span class="equipment-field-label">
            装備名
          </span>

          <select
            id="equipment-name-select"
            class="equipment-select"
          ></select>

        </label>

        <div>

          <span class="equipment-field-label">
            規格
          </span>

          <div id="equipment-spec-area"></div>

        </div>

        <label>

          <span class="equipment-field-label">
            数量
          </span>

          <input
            id="equipment-quantity-input"
            class="equipment-input"
            type="number"
            min="1"
            max="99"
            inputmode="numeric"
            value="1"
          >

        </label>

        <div class="equipment-person-field">

          <span class="equipment-field-label">
            担当者（複数選択可）
          </span>

          <div
            id="equipment-person-options"
            class="equipment-person-options"
          >
            ${memberCheckboxes}
          </div>

        </div>

      </div>

      <button
        id="equipment-add-button"
        class="equipment-add-button"
        type="button"
      >
        ＋ 共同装備を追加
      </button>

    </div>

    <h3 class="equipment-list-title">
      追加済み共同装備
    </h3>

    <div
      id="equipment-list"
      class="equipment-list"
    ></div>

    <div class="equipment-holder-summary">

      <h3 class="equipment-list-title">
        氏名別の持ち物一覧
      </h3>

      <div id="equipment-holder-list"></div>

    </div>
  `;

  setupSharedEquipmentEvents();
  updateEquipmentNameOptions();
  renderSharedEquipmentList();
}

/* =========================================
   参加者名一覧を取得
========================================= */

function getDetailedPlanMemberNames() {
  const memberNames =
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

  const guestNames =
    Array.from(
      document.querySelectorAll(
        ".guest-name-input"
      )
    )
      .map(
        (input) =>
          input.value.trim()
      )
      .filter(Boolean);

  return Array.from(
    new Set([
      ...memberNames,
      ...guestNames
    ])
  );
}

/* =========================================
   共同装備の操作設定
========================================= */

function setupSharedEquipmentEvents() {
  const categorySelect =
    document.getElementById(
      "equipment-category-select"
    );

  const nameSelect =
    document.getElementById(
      "equipment-name-select"
    );

  const addButton =
    document.getElementById(
      "equipment-add-button"
    );

  categorySelect?.addEventListener(
    "change",
    updateEquipmentNameOptions
  );

  nameSelect?.addEventListener(
    "change",
    renderEquipmentSpecFields
  );

  addButton?.addEventListener(
    "click",
    addSharedEquipment
  );
}

/* =========================================
   装備名候補を更新
========================================= */

function updateEquipmentNameOptions() {
  const categorySelect =
    document.getElementById(
      "equipment-category-select"
    );

  const nameSelect =
    document.getElementById(
      "equipment-name-select"
    );

  if (
    !categorySelect ||
    !nameSelect
  ) {
    return;
  }

  const category =
    categorySelect.value;

  const equipmentNames =
    Object.keys(
      sharedEquipmentMaster[
        category
      ] ||
      {}
    );

  nameSelect.innerHTML =
    equipmentNames
      .map(
        (equipmentName) => `
          <option
            value="${escapeHtml(
              equipmentName
            )}"
          >
            ${escapeHtml(
              equipmentName
            )}
          </option>
        `
      )
      .join("");

  renderEquipmentSpecFields();
}

/* =========================================
   規格入力欄を表示
========================================= */

function renderEquipmentSpecFields() {
  const category =
    document.getElementById(
      "equipment-category-select"
    )?.value ||
    "";

  const equipmentName =
    document.getElementById(
      "equipment-name-select"
    )?.value ||
    "";

  const specArea =
    document.getElementById(
      "equipment-spec-area"
    );

  if (!specArea) {
    return;
  }

  const definition =
    sharedEquipmentMaster[
      category
    ]?.[
      equipmentName
    ];

  if (!definition) {
    specArea.innerHTML =
      "";

    return;
  }

  if (
    definition.type ===
    "rope"
  ) {
    renderRopeSpecFields(
      specArea
    );

    return;
  }

  if (
    definition.type ===
    "piton"
  ) {
    renderPitonSpecFields(
      specArea
    );

    return;
  }

  if (
    definition.type ===
    "free"
  ) {
    renderFreeEquipmentFields(
      specArea
    );

    return;
  }

  renderSelectSpecFields(
    specArea,
    definition
  );
}

/* =========================================
   ロープ規格
========================================= */

function renderRopeSpecFields(
  specArea
) {
  specArea.innerHTML = `
    <div class="equipment-spec-fields">

      <select
        id="equipment-rope-type"
        class="equipment-select"
      >
        <option value="シングル">
          シングル
        </option>

        <option value="ダブル">
          ダブル
        </option>

        <option value="手入力">
          手入力
        </option>
      </select>

      <select
        id="equipment-rope-length"
        class="equipment-select"
      >
        <option value="50m">
          50m
        </option>

        <option value="60m">
          60m
        </option>
      </select>

    </div>

    <input
      id="equipment-custom-spec"
      class="equipment-input"
      type="text"
      maxlength="100"
      placeholder="手入力の規格"
      style="display:none; margin-top:8px;"
    >
  `;

  document
    .getElementById(
      "equipment-rope-type"
    )
    ?.addEventListener(
      "change",
      updateRopeSpecMode
    );
}

/* =========================================
   ハーケン規格
========================================= */

function renderPitonSpecFields(
  specArea
) {
  specArea.innerHTML = `
    <div class="equipment-spec-fields">

      <select
        id="equipment-piton-material"
        class="equipment-select"
      >
        <option value="軟鉄">
          軟鉄
        </option>

        <option value="クロモリ">
          クロモリ
        </option>

        <option value="その他">
          その他
        </option>
      </select>

      <select
        id="equipment-piton-shape"
        class="equipment-select"
      >
        <option value="ナイフブレード">
          ナイフブレード
        </option>

        <option value="アングル">
          アングル
        </option>

        <option value="イボイノシシ">
          イボイノシシ
        </option>

        <option value="手入力">
          手入力
        </option>
      </select>

    </div>

    <input
      id="equipment-custom-spec"
      class="equipment-input"
      type="text"
      maxlength="100"
      placeholder="形を手入力"
      style="display:none; margin-top:8px;"
    >
  `;

  document
    .getElementById(
      "equipment-piton-shape"
    )
    ?.addEventListener(
      "change",
      updatePitonSpecMode
    );
}

/* =========================================
   自由入力装備
========================================= */

function renderFreeEquipmentFields(
  specArea
) {
  specArea.innerHTML = `
    <div class="equipment-spec-fields">

      <input
        id="equipment-custom-name"
        class="equipment-input"
        type="text"
        maxlength="100"
        placeholder="装備名を入力"
      >

      <input
        id="equipment-custom-spec"
        class="equipment-input"
        type="text"
        maxlength="100"
        placeholder="規格を入力"
      >

    </div>
  `;
}

/* =========================================
   通常規格
========================================= */

function renderSelectSpecFields(
  specArea,
  definition
) {
  const options =
    definition.options ||
    [];

  specArea.innerHTML = `
    <div class="equipment-spec-fields is-single">

      <select
        id="equipment-spec-select"
        class="equipment-select"
      >
        ${options
          .map(
            (option) => `
              <option
                value="${escapeHtml(
                  option
                )}"
                ${
                  option ===
                  definition.defaultValue
                    ? "selected"
                    : ""
                }
              >
                ${escapeHtml(
                  option
                )}
              </option>
            `
          )
          .join("")}
      </select>

    </div>

    <input
      id="equipment-custom-spec"
      class="equipment-input"
      type="text"
      maxlength="100"
      placeholder="規格を手入力"
      style="display:none; margin-top:8px;"
    >
  `;

  document
    .getElementById(
      "equipment-spec-select"
    )
    ?.addEventListener(
      "change",
      updateGenericSpecMode
    );

  updateGenericSpecMode();
}

/* =========================================
   規格手入力切替
========================================= */

function updateRopeSpecMode() {
  const ropeType =
    document.getElementById(
      "equipment-rope-type"
    );

  const ropeLength =
    document.getElementById(
      "equipment-rope-length"
    );

  const customInput =
    document.getElementById(
      "equipment-custom-spec"
    );

  const isCustom =
    ropeType?.value ===
    "手入力";

  if (ropeLength) {
    ropeLength.style.display =
      isCustom
        ? "none"
        : "";
  }

  if (customInput) {
    customInput.style.display =
      isCustom
        ? ""
        : "none";
  }
}

function updatePitonSpecMode() {
  const shapeSelect =
    document.getElementById(
      "equipment-piton-shape"
    );

  const customInput =
    document.getElementById(
      "equipment-custom-spec"
    );

  if (customInput) {
    customInput.style.display =
      shapeSelect?.value ===
      "手入力"
        ? ""
        : "none";
  }
}

function updateGenericSpecMode() {
  const specSelect =
    document.getElementById(
      "equipment-spec-select"
    );

  const customInput =
    document.getElementById(
      "equipment-custom-spec"
    );

  if (customInput) {
    customInput.style.display =
      specSelect?.value ===
      "手入力"
        ? ""
        : "none";
  }
}

/* =========================================
   共同装備を追加
========================================= */

function addSharedEquipment() {
  const category =
    document.getElementById(
      "equipment-category-select"
    )?.value ||
    "";

  let equipmentName =
    document.getElementById(
      "equipment-name-select"
    )?.value ||
    "";

  const quantity =
    Number(
      document.getElementById(
        "equipment-quantity-input"
      )?.value ||
      0
    );

  const selectedPersons =
    Array.from(
      document.querySelectorAll(
        ".equipment-person-checkbox:checked"
      )
    )
      .map(
        (checkbox) =>
          checkbox.value
      )
      .filter(Boolean);

  const personInCharge =
    selectedPersons.join(
      "｜"
    );

  const definition =
    sharedEquipmentMaster[
      category
    ]?.[
      equipmentName
    ];

  if (!definition) {
    alert(
      "装備名を選択してください。"
    );

    return;
  }

  let spec =
    "";

  if (
    definition.type ===
    "rope"
  ) {
    spec =
      getRopeSpec();

  } else if (
    definition.type ===
    "piton"
  ) {
    spec =
      getPitonSpec();

  } else if (
    definition.type ===
    "free"
  ) {
    equipmentName =
      document.getElementById(
        "equipment-custom-name"
      )?.value.trim() ||
      "";

    spec =
      document.getElementById(
        "equipment-custom-spec"
      )?.value.trim() ||
      "";

  } else {
    spec =
      getNormalEquipmentSpec();
  }

  if (!equipmentName) {
    alert(
      "装備名を入力してください。"
    );

    return;
  }

  if (!spec) {
    alert(
      "規格を選択または入力してください。"
    );

    return;
  }

  if (
    !Number.isInteger(
      quantity
    ) ||
    quantity < 1
  ) {
    alert(
      "数量は1以上で入力してください。"
    );

    return;
  }

  if (!personInCharge) {
    alert(
      "担当者を1人以上選択してください。"
    );

    return;
  }

  selectedSharedEquipment.push({
    category:
      category,

    name:
      equipmentName,

    spec:
      spec,

    quantity:
      quantity,

    personInCharge:
      personInCharge
  });

  renderSharedEquipmentList();
  clearEquipmentEntryAfterAdd();
}

/* =========================================
   規格を取得
========================================= */

function getRopeSpec() {
  const ropeType =
    document.getElementById(
      "equipment-rope-type"
    )?.value ||
    "";

  if (
    ropeType ===
    "手入力"
  ) {
    return document
      .getElementById(
        "equipment-custom-spec"
      )
      ?.value
      .trim() ||
      "";
  }

  const ropeLength =
    document.getElementById(
      "equipment-rope-length"
    )?.value ||
    "";

  return `${ropeType} ${ropeLength}`
    .trim();
}

function getPitonSpec() {
  const material =
    document.getElementById(
      "equipment-piton-material"
    )?.value ||
    "";

  const shape =
    document.getElementById(
      "equipment-piton-shape"
    )?.value ||
    "";

  const actualShape =
    shape ===
    "手入力"
      ? (
          document.getElementById(
            "equipment-custom-spec"
          )?.value.trim() ||
          ""
        )
      : shape;

  return `${material} ${actualShape}`
    .trim();
}

function getNormalEquipmentSpec() {
  const selectedSpec =
    document.getElementById(
      "equipment-spec-select"
    )?.value ||
    "";

  if (
    selectedSpec ===
    "手入力"
  ) {
    return document
      .getElementById(
        "equipment-custom-spec"
      )
      ?.value
      .trim() ||
      "";
  }

  return selectedSpec;
}

/* =========================================
   追加後の入力欄を戻す
========================================= */

function clearEquipmentEntryAfterAdd() {
  document
    .querySelectorAll(
      ".equipment-person-checkbox"
    )
    .forEach(
      (checkbox) => {
        checkbox.checked =
          false;
      }
    );

  const quantityInput =
    document.getElementById(
      "equipment-quantity-input"
    );

  if (quantityInput) {
    quantityInput.value =
      "1";
  }
}

/* =========================================
   追加済み共同装備を表示
========================================= */

function renderSharedEquipmentList() {
  const equipmentList =
    document.getElementById(
      "equipment-list"
    );

  if (!equipmentList) {
    return;
  }

  if (
    selectedSharedEquipment.length ===
    0
  ) {
    equipmentList.innerHTML = `
      <p class="placeholder">
        共同装備はまだ追加されていません。
      </p>
    `;

    renderEquipmentHolderSummary();

    return;
  }

  equipmentList.innerHTML =
    selectedSharedEquipment
      .map(
        (equipment, index) => `
          <article class="equipment-card">

            ${createEquipmentCardField(
              "カテゴリ",
              equipment.category
            )}

            ${createEquipmentCardField(
              "装備名",
              equipment.name
            )}

            ${createEquipmentCardField(
              "規格",
              equipment.spec
            )}

            ${createEquipmentCardField(
              "数量",
              equipment.quantity
            )}

            ${createEquipmentCardField(
              "担当者",
              String(
                equipment.personInCharge
              ).replaceAll(
                "｜",
                "・"
              )
            )}

            <button
              class="equipment-delete-button"
              type="button"
              data-equipment-index="${index}"
            >
              削除
            </button>

          </article>
        `
      )
      .join("");

  equipmentList
    .querySelectorAll(
      ".equipment-delete-button"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            const index =
              Number(
                button.dataset
                  .equipmentIndex
              );

            selectedSharedEquipment.splice(
              index,
              1
            );

            renderSharedEquipmentList();
          }
        );
      }
    );

  renderEquipmentHolderSummary();
}

/* =========================================
   表示項目を作成
========================================= */

function createEquipmentCardField(
  label,
  value
) {
  return `
    <div>

      <span class="equipment-card-label">
        ${escapeHtml(
          label
        )}
      </span>

      <span class="equipment-card-value">
        ${escapeHtml(
          value
        )}
      </span>

    </div>
  `;
}

/* =========================================
   氏名別の持ち物一覧を表示
========================================= */

function renderEquipmentHolderSummary() {
  const holderList =
    document.getElementById(
      "equipment-holder-list"
    );

  if (!holderList) {
    return;
  }

  const holderMap =
    new Map();

  for (
    const equipment
    of selectedSharedEquipment
  ) {
    const persons =
      String(
        equipment.personInCharge ||
        ""
      )
        .split("｜")
        .map(
          (person) =>
            person.trim()
        )
        .filter(Boolean);

    const itemText =
      `${equipment.name}` +
      (
        equipment.spec
          ? `（${equipment.spec}）`
          : ""
      ) +
      `×${equipment.quantity}`;

    for (
      const person
      of persons
    ) {
      if (
        !holderMap.has(
          person
        )
      ) {
        holderMap.set(
          person,
          []
        );
      }

      holderMap
        .get(
          person
        )
        .push(
          itemText
        );
    }
  }

  if (
    holderMap.size ===
    0
  ) {
    holderList.innerHTML = `
      <p class="placeholder">
        担当者ごとの持ち物はまだありません。
      </p>
    `;

    return;
  }

  const preferredOrder = [
    ...getDetailedPlanMemberNames(),
    "各自"
  ];

  const holderEntries =
    Array.from(
      holderMap.entries()
    )
      .sort(
        ([personA], [personB]) => {
          const indexA =
            preferredOrder.indexOf(
              personA
            );

          const indexB =
            preferredOrder.indexOf(
              personB
            );

          const orderA =
            indexA === -1
              ? 999
              : indexA;

          const orderB =
            indexB === -1
              ? 999
              : indexB;

          return orderA -
            orderB;
        }
      );

  holderList.innerHTML =
    holderEntries
      .map(
        ([person, items]) => `
          <article class="equipment-holder-card">

            <div class="equipment-holder-name">
              ${escapeHtml(
                person
              )}
            </div>

            <div class="equipment-holder-items">

              ${items
                .map(
                  (item) => `
                    <span class="equipment-holder-item">
                      ${escapeHtml(
                        item
                      )}
                    </span>
                  `
                )
                .join("")}

            </div>

          </article>
        `
      )
      .join("");
}

/* =========================================
   共同装備を保存
========================================= */

async function saveDetailedPlanEquipment(
  tripId
) {
  const deleteResponse =
    await portalFetch(
      "/rest/v1/trip_shared_equipment" +
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
      "以前の共同装備を削除できませんでした。" +
      ` ${deleteResponse.status} ${errorText}`
    );
  }

  if (
    selectedSharedEquipment.length ===
    0
  ) {
    return;
  }

  const saveRows =
    selectedSharedEquipment.map(
      (equipment, index) => ({
        trip_id:
          Number(
            tripId
          ),

        equipment_category:
          equipment.category,

        equipment_name:
          equipment.name,

        equipment_spec:
          equipment.spec ||
          null,

        quantity:
          Number(
            equipment.quantity ||
            1
          ),

        person_in_charge:
          equipment.personInCharge ||
          null,

        equipment_order:
          index +
          1
      })
    );

  const insertResponse =
    await portalFetch(
      "/rest/v1/trip_shared_equipment",
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
      "共同装備の保存に失敗しました。" +
      ` ${insertResponse.status} ${errorText}`
    );
  }
}