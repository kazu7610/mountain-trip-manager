/* =========================================
   ポンコツ倶楽部
   山行履歴詳細
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    if (!requirePortalLogin()) {
      return;
    }

    loadHistoryDetail();
  }
);


/* =========================================
   URLから山行IDを取得
========================================= */

function getTripId() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const tripId =
    Number(
      params.get("id")
    );

  if (
    !Number.isInteger(tripId) ||
    tripId <= 0
  ) {
    return null;
  }

  return tripId;
}


/* =========================================
   履歴詳細を読み込む
========================================= */

async function loadHistoryDetail() {
  const container =
    document.getElementById(
      "trip-history-detail"
    );

  if (!container) {
    return;
  }

  const tripId =
    getTripId();

  if (!tripId) {
    showError(
      container,
      "山行IDが指定されていません。"
    );

    return;
  }

  try {
    const trip =
      await loadHistoryTrip(
        tripId
      );

    if (!trip) {
      showError(
        container,
        "山行履歴が見つかりません。"
      );

      return;
    }

    const members =
      await loadHistoryMembers(
        tripId
      );

    const comments =
      await loadHistoryComments(
        tripId
      );

    renderHistoryDetail(
      container,
      trip,
      members,
      comments
    );

  } catch (error) {
    console.error(error);

    showError(
      container,
      "山行履歴を読み込めませんでした。"
    );
  }
}


/* =========================================
   山行本体を取得
========================================= */

async function loadHistoryTrip(
  tripId
) {
  const response =
    await portalFetch(
      "/rest/v1/trips" +
      "?select=*" +
      `&id=eq.${tripId}` +
      "&status=in.(completed,cancelled)"
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      "山行履歴の取得に失敗しました。" +
      ` ${response.status} ${errorText}`
    );
  }

  const rows =
    await response.json();

  return rows[0] || null;
}


/* =========================================
   参加者を取得
========================================= */

async function loadHistoryMembers(
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
      "参加者を取得できませんでした。",
      await response.text()
    );

    return [];
  }

  const rows =
    await response.json();

  return rows
    .map(
      (row) => ({
        id:
          Number(row.member_id),

        name:
          row.members?.name ||
          "不明",

        isLeader:
          row.is_leader === true
      })
    )
    .sort(
      (a, b) =>
        Number(b.isLeader) -
        Number(a.isLeader)
    );
}


/* =========================================
   コメントを取得
========================================= */

async function loadHistoryComments(
  tripId
) {
  const response =
    await portalFetch(
      "/rest/v1/trip_comments" +
      "?select=*" +
      `&trip_id=eq.${tripId}` +
      "&order=created_at.asc"
    );

  if (!response.ok) {
    console.error(
      "コメントを取得できませんでした。",
      await response.text()
    );

    return [];
  }

  return await response.json();
}


/* =========================================
   履歴詳細を表示
========================================= */

function renderHistoryDetail(
  container,
  trip,
  members,
  comments
) {
  const memberHtml =
    createMemberHtml(
      members,
      trip.outside_member_count
    );

  const commentsHtml =
    createCommentsHtml(
      comments
    );

  const descentHtml =
    trip.descended_at
      ? `
          <section class="detail-row">

            <p class="detail-label">
              下山連絡
            </p>

            <p class="detail-value">
              ${formatDateTime(
                trip.descended_at
              )}
            </p>

          </section>
        `
      : "";

  container.innerHTML = `
    <article class="detail-card">

      <div class="detail-head">

        <p class="detail-area">
          ${escapeHtml(
            trip.mountain_area ||
            ""
          )}
        </p>

        <h2 class="detail-title">
          ${escapeHtml(
            trip.mountain_name ||
            "山名未設定"
          )}
        </h2>

      </div>

      <div class="detail-body">

        <section class="detail-row">

          <p class="detail-label">
            ルート
          </p>

          <p class="detail-value">
            ${escapeHtml(
              trip.route ||
              "未設定"
            )}
          </p>

        </section>

        <section class="detail-row">

          <p class="detail-label">
            入山日
          </p>

          <p class="detail-value">
            ${formatDate(
              trip.entry_date
            )}
          </p>

        </section>

        <section class="detail-row">

          <p class="detail-label">
            下山日
          </p>

          <p class="detail-value">
            ${formatDate(
              trip.descent_date
            )}
          </p>

        </section>

        <section class="detail-row">

          <p class="detail-label">
            参加者
          </p>

          <div class="member-list">
            ${memberHtml}
          </div>

        </section>

        ${commentsHtml}

        ${descentHtml}

      </div>

    </article>
  `;
}


/* =========================================
   参加者表示
========================================= */

function createMemberHtml(
  members,
  outsideMemberCount
) {
  const chips = [];

  members.forEach(
    (member) => {
      const leaderText =
        member.isLeader
          ? "（代表）"
          : "";

      chips.push(`
        <span class="member-chip">
          ${escapeHtml(
            member.name
          )}
          ${leaderText}
        </span>
      `);
    }
  );

  const outsideCount =
    Number(
      outsideMemberCount || 0
    );

  if (outsideCount > 0) {
    chips.push(`
      <span class="member-chip outside-chip">
        会員外 ${outsideCount}名
      </span>
    `);
  }

  if (chips.length === 0) {
    return `
      <span class="member-chip">
        参加者未登録
      </span>
    `;
  }

  return chips.join("");
}


/* =========================================
   コメント表示
========================================= */

function createCommentsHtml(
  comments
) {
  if (
    !Array.isArray(comments) ||
    comments.length === 0
  ) {
    return "";
  }

  return `
    <section class="detail-row">

      <p class="detail-label">
        コメント
      </p>

      <div class="trip-comment-list">

        ${comments
          .map(
            (comment) => `
              <div class="trip-comment-item">

                <div class="trip-comment-head">
                  ${formatCommentDate(
                    comment.created_at
                  )}　
                  ${escapeHtml(
                    comment.member_name ||
                    "氏名不明"
                  )}
                </div>

                <div class="trip-comment-message">
                  ${escapeHtml(
                    comment.message ||
                    ""
                  )}
                </div>

              </div>
            `
          )
          .join("")}

      </div>

    </section>
  `;
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

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short"
    }
  ).format(date);
}


/* =========================================
   コメント日時表示
========================================= */

function formatCommentDate(
  value
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  const now =
    new Date();

  const isToday =
    date.getFullYear() ===
      now.getFullYear() &&
    date.getMonth() ===
      now.getMonth() &&
    date.getDate() ===
      now.getDate();

  if (isToday) {
    return new Intl.DateTimeFormat(
      "ja-JP",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    ).format(date);
  }

  const isSameYear =
    date.getFullYear() ===
    now.getFullYear();

  if (isSameYear) {
    return new Intl.DateTimeFormat(
      "ja-JP",
      {
        month: "numeric",
        day: "numeric"
      }
    ).format(date);
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric"
    }
  ).format(date);
}


/* =========================================
   日時表示
========================================= */

function formatDateTime(
  value
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
}


/* =========================================
   エラー表示
========================================= */

function showError(
  container,
  message
) {
  container.innerHTML = `
    <div class="error-card">
      ${escapeHtml(message)}
    </div>
  `;
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