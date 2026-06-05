const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

// ===== Firestoreのschedules更新時にプッシュ通知を送信 =====
exports.notifyOnScheduleWrite = onDocumentWritten(
  { document: "schedules/{scheduleId}", region: "asia-northeast1" },
  async (event) => {
    const after = event.data.after;
    const before = event.data.before;

    // 削除の場合は通知しない
    if (!after.exists) return null;

    const data = after.data();

    // notify フラグが false の場合は通知しない（管理者が通知不要を選んだ場合）
    if (data.notify === false) return null;

    // 新規追加 or 更新かを判定
    const isNew = !before.exists;
    const typeLabels = {
      practice: "練習",
      game: "練習試合",
      tournament: "大会",
      other: "その他",
    };
    const typeLabel = typeLabels[data.type] || data.type || "";

    // 通知タイトルと本文を作成
    const title = isNew
      ? `📅 新しい予定が追加されました`
      : `📝 予定が更新されました`;

    let body = `${data.date} ${typeLabel}「${data.title}」`;
    if (data.place) body += ` @ ${data.place}`;
    if (data.start) body += ` ${data.start}〜`;

    // Firestoreから全トークンを取得
    const db = getFirestore();
    const tokensSnap = await db.collection("fcmTokens").get();
    if (tokensSnap.empty) {
      console.log("トークンが登録されていません");
      return null;
    }

    const tokens = tokensSnap.docs.map((doc) => doc.data().token).filter(Boolean);
    if (tokens.length === 0) return null;

    console.log(`通知送信先: ${tokens.length}件`);

    // FCMでマルチキャスト送信
    const message = {
      notification: { title, body },
      webpush: {
        notification: {
          title,
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          vibrate: [200, 100, 200],
        },
        fcmOptions: { link: "/" },
      },
      tokens,
    };

    try {
      const response = await getMessaging().sendEachForMulticast(message);
      console.log(`成功: ${response.successCount}, 失敗: ${response.failureCount}`);

      // 無効なトークンを削除
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code;
          if (
            code === "messaging/invalid-registration-token" ||
            code === "messaging/registration-token-not-registered"
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });
      if (invalidTokens.length > 0) {
        const batch = db.batch();
        const snap = await db
          .collection("fcmTokens")
          .where("token", "in", invalidTokens)
          .get();
        snap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`無効トークン削除: ${invalidTokens.length}件`);
      }
    } catch (err) {
      console.error("通知送信エラー:", err);
    }

    return null;
  }
);
