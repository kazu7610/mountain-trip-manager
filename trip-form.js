/* =========================================
   ポンコツ倶楽部
   山行届作成画面
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  loadMembers();
  setupTripForm();
});

/* =========================================
   会員一覧を取得
========================================= */

async function loadMembers() {
  const memberList =
    document.getElementById("member-list");

  const memberMessage =
    document.getElementById("member-message");

  if (!memberList || !memberMessage) {
    console.error(
      "会員一覧の表示場所が見つかりません。"
    );

    return;
  }

  try {
    const response = await portalFetch(
      "/rest/v1/members" +
      "?select=id,name,role" +
      "&active=eq.true" +
      "&order=id.asc"
    );

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        "会員一覧の取得に失敗しました。" +
        ` ${response.status} ${errorText}`
      );
    }

    const members = await response.json();

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

      return;
    }

    memberList.innerHTML = "";

    members.forEach((member) => {
      const label =
        document.createElement("label");

      label.className = "member-item";

      const checkbox =
        document.createElement("input");

      checkbox.type = "checkbox";
      checkbox.name = "members";
      checkbox.value = String(member.id);
      checkbox.dataset.memberName = member.name;

      const name =
        document.createElement("span");

      name.className = "member-name";
      name.textContent = member.name;

      label.appendChild(checkbox);
      label.appendChild(name);

      memberList.appendChild(label);
    });

    memberMessage.textContent =
      `${members.length}名の会員から選択できます。`;

  } catch (error) {
    console.error(error);

    memberList.innerHTML = `
      <p class="member-error">
        会員一覧を読み込めませんでした。
      </p>
    `;

    memberMessage.textContent =
      "Supabaseの接続情報とmembersテーブルを確認してください。";
  }
}

/* =========================================
   フォーム送信設定
========================================= */

function setupTripForm() {
  const submitButton =
    document.getElementById("submit-trip-button");

  if (!submitButton) {
    console.error(
      "管理者へ提出ボタンが見つかりません。"
    );

    return;
  }

  submitButton.addEventListener(
    "click",
    submitTripForm
  );
}

/* =========================================
   山行届を提出
========================================= */

async function submitTripForm(event) {
  event.preventDefault();

  const submitButton =
    document.querySelector(".submit-button");

  const entryDate =
    document.getElementById("entry-date").value;

  const descentDate =
    document.getElementById("descent-date").value;

  const descentTime =
    document.getElementById("descent-time").value;

  const mountainArea =
    document
      .getElementById("mountain-area")
      .value
      .trim();

  const mountainName =
    document
      .getElementById("mountain-name")
      .value
      .trim();

  const route =
    document
      .getElementById("route")
      .value
      .trim();

  const outsideMemberCount =
    Number(
      document
        .getElementById("outside-count")
        .value || 0
    );

  const createDetailedPlan =
    document
      .getElementById("create-plan")
      .checked;

  const selectedMembers = Array.from(
    document.querySelectorAll(
      'input[name="members"]:checked'
    )
  );

  /* =====================================
     入力確認
  ===================================== */

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

  if (descentDate < entryDate) {
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

  const confirmed = confirm(
    "この内容で管理者へ提出しますか？"
  );

  if (!confirmed) {
    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "提出中...";
  }

  let createdTripId = null;

  try {
    /* ===================================
       tripsへ山行本体を保存
    =================================== */

    const tripData = {
      entry_date: entryDate,
      descent_date: descentDate,
      descent_time: descentTime,
      mountain_area: mountainArea,
      mountain_name: mountainName,
      route: route,
      outside_member_count:
        outsideMemberCount,
      status: "submitted",
      submitted_at:
        new Date().toISOString()
    };

    const tripResponse = await portalFetch(
      "/rest/v1/trips",
      {
        method: "POST",

        headers: {
          Prefer: "return=representation"
        },

        body: JSON.stringify(tripData)
      }
    );

    if (!tripResponse.ok) {
      const errorText =
        await tripResponse.text();

      throw new Error(
        "山行届の保存に失敗しました。" +
        ` ${tripResponse.status} ${errorText}`
      );
    }

    const createdTrips =
      await tripResponse.json();

    const createdTrip =
      createdTrips[0];

    if (!createdTrip?.id) {
      throw new Error(
        "保存した山行IDを取得できませんでした。"
      );
    }

    createdTripId = createdTrip.id;

    /* ===================================
       trip_membersへ参加者を保存
    =================================== */

    if (selectedMembers.length > 0) {
      const memberData =
        selectedMembers.map(
          (checkbox) => ({
            trip_id: createdTripId,
            member_id:
              Number(checkbox.value),
            is_leader: false
          })
        );

      const memberResponse =
        await portalFetch(
          "/rest/v1/trip_members",
          {
            method: "POST",

            headers: {
              Prefer: "return=minimal"
            },

            body: JSON.stringify(memberData)
          }
        );

      if (!memberResponse.ok) {
        const errorText =
          await memberResponse.text();

        throw new Error(
          "参加者の保存に失敗しました。" +
          ` ${memberResponse.status} ${errorText}`
        );
      }
    }

    /* ===================================
       詳細計画書の作成予定を一時保存
    =================================== */

    if (createDetailedPlan) {
      localStorage.setItem(
        "pendingDetailedPlanTripId",
        String(createdTripId)
      );
    } else {
      localStorage.removeItem(
        "pendingDetailedPlanTripId"
      );
    }

    alert(
      createDetailedPlan
        ? "山行届を提出しました。\n詳細計画書の入力画面は次に作成します。"
        : "山行届を管理者へ提出しました。"
    );

    location.href = "index.html";

  } catch (error) {
    console.error(error);

    /*
      参加者保存で失敗した場合は、
      途中まで作った山行本体を削除する
    */
    if (createdTripId !== null) {
      try {
        await portalFetch(
          `/rest/v1/trips?id=eq.${createdTripId}`,
          {
            method: "DELETE"
          }
        );
      } catch (deleteError) {
        console.error(
          "途中データの削除にも失敗しました。",
          deleteError
        );
      }
    }

    alert(
      "山行届を提出できませんでした。\n" +
      "入力内容とSupabaseの設定を確認してください。"
    );

  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent =
        "管理者へ提出";
    }
  }
}