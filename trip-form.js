/* =========================================
   ポンコツ倶楽部
   山行届作成・修正画面
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    if (!requirePortalLogin()) {
      return;
    }

    setupTripForm();

    const membersLoaded =
      await loadMembers();

    if (!membersLoaded) {
      return;
    }

    const editTripId =
      getEditTripId();

    if (editTripId) {
      await loadEditTrip(
        editTripId
      );
    }
  }
);

/* =========================================
   URLから修正対象IDを取得
========================================= */

function getEditTripId() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const editTripId =
    Number(
      params.get("edit")
    );

  if (
    !Number.isInteger(
      editTripId
    ) ||
    editTripId <= 0
  ) {
    return null;
  }

  return editTripId;
}

/* =========================================
   会員一覧を取得
========================================= */

async function loadMembers() {
  const memberList =
    document.getElementById(
      "member-list"
    );

  const memberMessage =
    document.getElementById(
      "member-message"
    );

  if (
    !memberList ||
    !memberMessage
  ) {
    console.error(
      "会員一覧の表示場所が見つかりません。"
    );

    return false;
  }

  try {
    const response =
      await portalFetch(
        "/rest/v1/members" +
        "?select=id,name,role" +
        "&active=eq.true" +
        "&order=id.asc"
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "会員一覧の取得に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    const members =
      await response.json();

    if (
      !Array.isArray(members) ||
      members.length === 0
    ) {
      memberList.innerHTML = `
        <p class="member-error">
          登録されている会員がいません。
        </p>
      `;

      memberMessage.textContent =
        "membersテーブルを確認してください。";

      return false;
    }

    memberList.innerHTML = "";

    members.forEach(
      (member) => {
        const label =
          document.createElement(
            "label"
          );

        label.className =
          "member-item";

        const checkbox =
          document.createElement(
            "input"
          );

        checkbox.type =
          "checkbox";

        checkbox.name =
          "members";

        checkbox.value =
          String(member.id);

        checkbox.dataset.memberName =
          member.name;

        checkbox.addEventListener(
          "change",
          updateLeaderSelect
        );

        const name =
          document.createElement(
            "span"
          );

        name.className =
          "member-name";

        name.textContent =
          member.name;

        label.appendChild(
          checkbox
        );

        label.appendChild(
          name
        );

        memberList.appendChild(
          label
        );
      }
    );

    memberMessage.textContent =
      `${members.length}名の会員から選択できます。`;

    updateLeaderSelect();

    return true;

  } catch (error) {
    console.error(error);

    memberList.innerHTML = `
      <p class="member-error">
        会員一覧を読み込めませんでした。
      </p>
    `;

    memberMessage.textContent =
      "Supabaseの接続情報とmembersテーブルを確認してください。";

    return false;
  }
}

/* =========================================
   修正対象の山行を読み込む
========================================= */

/* =========================================
   修正・下書き対象の山行届を読み込む
========================================= */

async function loadEditTrip(
  tripId
) {
  const loginMember =
    getPortalMember();

  const submitButton =
    document.getElementById(
      "submit-trip-button"
    );

  try {
    const tripResponse =
      await portalFetch(
        "/rest/v1/trips" +
        "?select=*" +
        `&id=eq.${tripId}`
      );

    if (!tripResponse.ok) {
      const errorText =
        await tripResponse.text();

      throw new Error(
        "修正対象の山行届を取得できませんでした。" +
        ` ${tripResponse.status} ${errorText}`
      );
    }

    const trips =
      await tripResponse.json();

    const trip =
      trips[0];

    if (!trip) {
      alert(
        "修正対象の山行届が見つかりません。"
      );

      location.href =
        "index.html";

      return;
    }

    /*
     * 修正依頼中または下書きだけ
     * 編集できる
     */
    if (
      trip.status !==
        "revision_required" &&
      trip.status !==
        "draft"
    ) {
      alert(
        "この山行届は修正できる状態ではありません。"
      );

      location.href =
        "index.html";

      return;
    }

    /*
     * 提出した本人だけ編集できる
     */
    if (
      !loginMember?.authUserId ||
      trip.submitted_by !==
        loginMember.authUserId
    ) {
      alert(
        "この山行届を修正できるのは、提出した本人だけです。"
      );

      location.href =
        "index.html";

      return;
    }

    const tripMembers =
      await loadEditTripMembers(
        tripId
      );

    fillTripForm(
      trip,
      tripMembers
    );

    if (submitButton) {
      submitButton.textContent =
        trip.status === "draft"
          ? "管理者へ提出"
          : "管理者へ再提出";
    }

  } catch (error) {
    console.error(error);

    alert(
      "修正する山行届を読み込めませんでした。"
    );

    location.href =
      "index.html";
  }
}

/* =========================================
   修正対象の参加者を取得
========================================= */

async function loadEditTripMembers(
  tripId
) {
  const response =
    await portalFetch(
      "/rest/v1/trip_members" +
      "?select=member_id,is_leader" +
      `&trip_id=eq.${tripId}` +
      "&order=id.asc"
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      "参加者情報を取得できませんでした。" +
      ` ${response.status} ${errorText}`
    );
  }

  return await response.json();
}

/* =========================================
   修正内容をフォームへ表示
========================================= */

function fillTripForm(
  trip,
  tripMembers
) {
  document.getElementById(
    "entry-date"
  ).value =
    trip.entry_date || "";

  document.getElementById(
    "descent-date"
  ).value =
    trip.descent_date || "";

  document.getElementById(
    "descent-time"
  ).value =
    String(
      trip.descent_time || ""
    ).slice(0, 5);

  document.getElementById(
    "mountain-area"
  ).value =
    trip.mountain_area || "";

  document.getElementById(
    "mountain-name"
  ).value =
    trip.mountain_name || "";

  document.getElementById(
    "route"
  ).value =
    trip.route || "";

  document.getElementById(
    "outside-count"
  ).value =
    Number(
      trip.outside_member_count || 0
    );

  const recruitingYes =
    document.getElementById(
      "recruiting-yes"
    );

  const recruitingNo =
    document.getElementById(
      "recruiting-no"
    );

  if (
    trip.is_recruiting === true
  ) {
    if (recruitingYes) {
      recruitingYes.checked =
        true;
    }

    if (recruitingNo) {
      recruitingNo.checked =
        false;
    }
  } else {
    if (recruitingYes) {
      recruitingYes.checked =
        false;
    }

    if (recruitingNo) {
      recruitingNo.checked =
        true;
    }
  }

  const recruitingMessage =
    document.getElementById(
      "recruiting-message"
    );

  if (recruitingMessage) {
    recruitingMessage.value =
      trip.recruiting_message || "";
  }

  updateRecruitingMessageArea();

  const selectedMemberIds =
    tripMembers.map(
      (row) =>
        Number(row.member_id)
    );

  const leaderRow =
    tripMembers.find(
      (row) =>
        row.is_leader === true
    );

  const checkboxes =
    document.querySelectorAll(
      'input[name="members"]'
    );

  checkboxes.forEach(
    (checkbox) => {
      checkbox.checked =
        selectedMemberIds.includes(
          Number(checkbox.value)
        );
    }
  );

  updateLeaderSelect();

  const leaderSelect =
    document.getElementById(
      "leader-select"
    );

  if (
    leaderSelect &&
    leaderRow
  ) {
    leaderSelect.value =
      String(
        leaderRow.member_id
      );
  }
}

/* =========================================
   リーダー候補を更新
========================================= */

function updateLeaderSelect() {
  const leaderSelect =
    document.getElementById(
      "leader-select"
    );

  if (!leaderSelect) {
    console.error(
      "リーダー選択欄が見つかりません。"
    );

    return;
  }

  const selectedMembers =
    Array.from(
      document.querySelectorAll(
        'input[name="members"]:checked'
      )
    );

  const previousValue =
    leaderSelect.value;

  leaderSelect.innerHTML = "";

  if (
    selectedMembers.length === 0
  ) {
    const option =
      document.createElement(
        "option"
      );

    option.value = "";

    option.textContent =
      "先に参加者を選択してください";

    leaderSelect.appendChild(
      option
    );

    leaderSelect.disabled = true;

    return;
  }

  const emptyOption =
    document.createElement(
      "option"
    );

  emptyOption.value = "";

  emptyOption.textContent =
    "リーダーを選択してください";

  leaderSelect.appendChild(
    emptyOption
  );

  selectedMembers.forEach(
    (checkbox) => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        checkbox.value;

      option.textContent =
        checkbox.dataset.memberName ||
        "名前不明";

      leaderSelect.appendChild(
        option
      );
    }
  );

  leaderSelect.disabled = false;

  const previousStillExists =
    selectedMembers.some(
      (checkbox) =>
        checkbox.value ===
        previousValue
    );

  if (previousStillExists) {
    leaderSelect.value =
      previousValue;
  }
}

/* =========================================
   フォーム送信設定
========================================= */

function setupTripForm() {
  const submitButton =
    document.getElementById(
      "submit-trip-button"
    );

  const draftButton =
    document.getElementById(
      "draft-button"
    );

  const recruitingYes =
    document.getElementById(
      "recruiting-yes"
    );

  const recruitingNo =
    document.getElementById(
      "recruiting-no"
    );

  if (!submitButton) {
    console.error(
      "管理者へ提出ボタンが見つかりません。"
    );

    return;
  }

  if (!draftButton) {
    console.error(
      "下書き保存ボタンが見つかりません。"
    );

    return;
  }

  submitButton.addEventListener(
    "click",
    submitTripForm
  );

  draftButton.addEventListener(
    "click",
    saveDraftTrip
  );

  if (recruitingYes) {
    recruitingYes.addEventListener(
      "change",
      updateRecruitingMessageArea
    );
  }

  if (recruitingNo) {
    recruitingNo.addEventListener(
      "change",
      updateRecruitingMessageArea
    );
  }

  updateRecruitingMessageArea();
}

/* =========================================
   募集コメント欄の表示切替
========================================= */

function updateRecruitingMessageArea() {
  const recruitingYes =
    document.getElementById(
      "recruiting-yes"
    );

  const messageArea =
    document.getElementById(
      "recruiting-message-area"
    );

  const messageInput =
    document.getElementById(
      "recruiting-message"
    );

  if (!messageArea) {
    return;
  }

  const isRecruiting =
    recruitingYes?.checked === true;

  messageArea.hidden =
    !isRecruiting;

  if (
    !isRecruiting &&
    messageInput
  ) {
    messageInput.value =
      "";
  }
}

/* =========================================
   山行届を下書き保存
========================================= */

async function saveDraftTrip(
  event
) {
  event.preventDefault();

  const draftButton =
    document.getElementById(
      "draft-button"
    );

  const loginMember =
    getPortalMember();

  const editTripId =
    getEditTripId();

  if (!loginMember?.id) {
    alert(
      "ログイン情報を確認できません。もう一度ログインしてください。"
    );

    location.href =
      "login.html";

    return;
  }

  const entryDate =
    document.getElementById(
      "entry-date"
    ).value || null;

  const descentDate =
    document.getElementById(
      "descent-date"
    ).value || null;

  const descentTime =
    document.getElementById(
      "descent-time"
    ).value || null;

  const mountainArea =
    document
      .getElementById(
        "mountain-area"
      )
      .value
      .trim() || null;

  const mountainName =
    document
      .getElementById(
        "mountain-name"
      )
      .value
      .trim() || null;

  const route =
    document
      .getElementById(
        "route"
      )
      .value
      .trim() || null;

  const outsideMemberCount =
    Number(
      document
        .getElementById(
          "outside-count"
        )
        .value || 0
    );

  const isRecruiting =
    document.querySelector(
      'input[name="is-recruiting"]:checked'
    )?.value === "true";

  const recruitingMessage =
    document
      .getElementById(
        "recruiting-message"
      )
      ?.value
      .trim() || null;

  const selectedMembers =
    Array.from(
      document.querySelectorAll(
        'input[name="members"]:checked'
      )
    );

  const leaderValue =
    document.getElementById(
      "leader-select"
    ).value;

  const leaderId =
    leaderValue
      ? Number(leaderValue)
      : null;

  const confirmed =
    confirm(
      "現在の入力内容を下書き保存しますか？"
    );

  if (!confirmed) {
    return;
  }

  if (draftButton) {
    draftButton.disabled =
      true;

    draftButton.textContent =
      "保存中...";
  }

  try {
    const tripData = {
      entry_date:
        entryDate,

      descent_date:
        descentDate,

      descent_time:
        descentTime,

      mountain_area:
        mountainArea,

      mountain_name:
        mountainName,

      route,

      outside_member_count:
        outsideMemberCount,

      is_recruiting:
        isRecruiting,

      recruiting_message:
        isRecruiting
          ? recruitingMessage
          : null,

      status:
        "draft",

      submitted_by:
        loginMember.authUserId ||
        null,

      submitted_at:
        null,

      approved_by:
        null,

      approved_at:
        null,

      revision_reason:
        null
    };

    let savedTripId;

    if (editTripId) {
      await updateExistingTrip(
        editTripId,
        tripData
      );

      savedTripId =
        editTripId;

    } else {
      savedTripId =
        await createNewTrip(
          tripData
        );
    }

    await replaceTripMembers(
      savedTripId,
      selectedMembers,
      leaderId
    );

    alert(
      "山行届を下書き保存しました。"
    );

    location.href =
      "index.html";

  } catch (error) {
    console.error(error);

    alert(
      "下書き保存できませんでした。\n入力内容とSupabaseの設定を確認してください。"
    );

  } finally {
    if (draftButton) {
      draftButton.disabled =
        false;

      draftButton.textContent =
        "下書き保存";
    }
  }
}

/* =========================================
   山行届を提出・再提出
========================================= */

async function submitTripForm(
  event
) {
  event.preventDefault();

  const submitButton =
    document.getElementById(
      "submit-trip-button"
    );

  const loginMember =
    getPortalMember();

  const editTripId =
    getEditTripId();

  if (!loginMember?.id) {
    alert(
      "ログイン情報を確認できません。もう一度ログインしてください。"
    );

    location.href =
      "login.html";

    return;
  }

  const entryDate =
    document.getElementById(
      "entry-date"
    ).value;

  const descentDate =
    document.getElementById(
      "descent-date"
    ).value;

  const descentTime =
    document.getElementById(
      "descent-time"
    ).value;

  const mountainArea =
    document
      .getElementById(
        "mountain-area"
      )
      .value
      .trim();

  const mountainName =
    document
      .getElementById(
        "mountain-name"
      )
      .value
      .trim();

  const route =
    document
      .getElementById(
        "route"
      )
      .value
      .trim();

  const outsideMemberCount =
    Number(
      document
        .getElementById(
          "outside-count"
        )
        .value || 0
    );

  const isRecruiting =
    document.querySelector(
      'input[name="is-recruiting"]:checked'
    )?.value === "true";

  const recruitingMessage =
    document
      .getElementById(
        "recruiting-message"
      )
      ?.value
      .trim() || "";

  const createDetailedPlan =
    document
      .getElementById(
        "create-plan"
      )
      .checked;

  const selectedMembers =
    Array.from(
      document.querySelectorAll(
        'input[name="members"]:checked'
      )
    );

  const leaderId =
    Number(
      document.getElementById(
        "leader-select"
      ).value
    );

  if (
    !entryDate ||
    !descentDate ||
    !descentTime ||
    !mountainArea ||
    !mountainName ||
    !route
  ) {
    alert(
      "必須項目をすべて入力してください。"
    );

    return;
  }

  if (
    descentDate < entryDate
  ) {
    alert(
      "下山日は入山日以降の日付にしてください。"
    );

    return;
  }

  if (
    selectedMembers.length === 0 &&
    outsideMemberCount === 0
  ) {
    alert(
      "参加者を1人以上選択するか、会員外の参加人数を入力してください。"
    );

    return;
  }

  if (
    selectedMembers.length > 0 &&
    (
      !Number.isInteger(
        leaderId
      ) ||
      leaderId <= 0
    )
  ) {
    alert(
      "リーダーを選択してください。"
    );

    return;
  }

  const leaderIsSelected =
    selectedMembers.some(
      (checkbox) =>
        Number(
          checkbox.value
        ) === leaderId
    );

  if (
    selectedMembers.length > 0 &&
    !leaderIsSelected
  ) {
    alert(
      "リーダーは参加者の中から選択してください。"
    );

    return;
  }

  if (
    isRecruiting &&
    !recruitingMessage
  ) {
    alert(
      "募集する場合は、募集コメントを入力してください。"
    );

    return;
  }

  const confirmMessage =
    editTripId
      ? "修正した内容で管理者へ再提出しますか？"
      : "この内容で管理者へ提出しますか？";

  const confirmed =
    confirm(
      confirmMessage
    );

  if (!confirmed) {
    return;
  }

  if (submitButton) {
    submitButton.disabled =
      true;

    submitButton.textContent =
      editTripId
        ? "再提出中..."
        : "提出中...";
  }

  try {
    const tripData = {
      entry_date:
        entryDate,

      descent_date:
        descentDate,

      descent_time:
        descentTime,

      mountain_area:
        mountainArea,

      mountain_name:
        mountainName,

      route,

      outside_member_count:
        outsideMemberCount,

      is_recruiting:
        isRecruiting,

      recruiting_message:
        isRecruiting
          ? recruitingMessage
          : null,

      status:
        "submitted",

      submitted_by:
        loginMember.authUserId ||
        null,

      submitted_at:
        new Date()
          .toISOString(),

      approved_by:
        null,

      approved_at:
        null
    };

    let savedTripId = null;

    if (editTripId) {
      await updateExistingTrip(
        editTripId,
        tripData
      );

      savedTripId =
        editTripId;

    } else {
      savedTripId =
        await createNewTrip(
          tripData
        );
    }

    await replaceTripMembers(
      savedTripId,
      selectedMembers,
      leaderId
    );

    if (createDetailedPlan) {
      localStorage.setItem(
        "pendingDetailedPlanTripId",
        String(savedTripId)
      );
    } else {
      localStorage.removeItem(
        "pendingDetailedPlanTripId"
      );
    }

    alert(
      editTripId
        ? "山行届を管理者へ再提出しました。"
        : createDetailedPlan
          ? "山行届を提出しました。\n詳細計画書の入力画面は次に作成します。"
          : "山行届を管理者へ提出しました。"
    );

    location.href =
      "index.html";

  } catch (error) {
    console.error(error);

    alert(
      editTripId
        ? "山行届を再提出できませんでした。\n入力内容とSupabaseの設定を確認してください。"
        : "山行届を提出できませんでした。\n入力内容とSupabaseの設定を確認してください。"
    );

  } finally {
    if (submitButton) {
      submitButton.disabled =
        false;

      submitButton.textContent =
        editTripId
          ? "管理者へ再提出"
          : "管理者へ提出";
    }
  }
}

/* =========================================
   新しい山行届を保存
========================================= */

async function createNewTrip(
  tripData
) {
  const response =
    await portalFetch(
      "/rest/v1/trips",
      {
        method: "POST",

        headers: {
          Prefer:
            "return=representation"
        },

        body:
          JSON.stringify(
            tripData
          )
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      "山行届の保存に失敗しました。" +
      ` ${response.status} ${errorText}`
    );
  }

  const trips =
    await response.json();

  const trip =
    trips[0];

  if (!trip?.id) {
    throw new Error(
      "保存した山行IDを取得できませんでした。"
    );
  }

  return trip.id;
}

/* =========================================
   既存の山行届を更新
========================================= */

async function updateExistingTrip(
  tripId,
  tripData
) {
  const loginMember =
    getPortalMember();

  const checkResponse =
    await portalFetch(
      "/rest/v1/trips" +
      "?select=id,status,submitted_by" +
      `&id=eq.${tripId}`
    );

  if (!checkResponse.ok) {
    const errorText =
      await checkResponse.text();

    throw new Error(
      "修正対象の確認に失敗しました。" +
      ` ${checkResponse.status} ${errorText}`
    );
  }

  const rows =
    await checkResponse.json();

  const currentTrip =
    rows[0];

  if (!currentTrip) {
    throw new Error(
      "修正対象の山行届が見つかりません。"
    );
  }

  if (
    currentTrip.status !==
      "revision_required" &&
    currentTrip.status !==
      "draft"
  ) {
    throw new Error(
      "この山行届は修正できる状態ではありません。"
    );
  }

  if (
    currentTrip.submitted_by !==
    loginMember?.authUserId
  ) {
    throw new Error(
      "提出した本人以外は修正できません。"
    );
  }

  const response =
    await portalFetch(
      `/rest/v1/trips?id=eq.${tripId}`,
      {
        method: "PATCH",

        headers: {
          Prefer:
            "return=minimal"
        },

        body:
          JSON.stringify(
            tripData
          )
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      "山行届の更新に失敗しました。" +
      ` ${response.status} ${errorText}`
    );
  }
}

/* =========================================
   参加者を入れ替える
========================================= */

async function replaceTripMembers(
  tripId,
  selectedMembers,
  leaderId
) {
  const deleteResponse =
    await portalFetch(
      `/rest/v1/trip_members?trip_id=eq.${tripId}`,
      {
        method: "DELETE",

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
      "以前の参加者情報を削除できませんでした。" +
      ` ${deleteResponse.status} ${errorText}`
    );
  }

  if (
    selectedMembers.length === 0
  ) {
    return;
  }

  const memberData =
    selectedMembers.map(
      (checkbox) => {
        const memberId =
          Number(
            checkbox.value
          );

        return {
          trip_id:
            tripId,

          member_id:
            memberId,

          is_leader:
            memberId ===
            leaderId
        };
      }
    );

  const response =
    await portalFetch(
      "/rest/v1/trip_members",
      {
        method: "POST",

        headers: {
          Prefer:
            "return=minimal"
        },

        body:
          JSON.stringify(
            memberData
          )
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      "参加者の保存に失敗しました。" +
      ` ${response.status} ${errorText}`
    );
  }
}