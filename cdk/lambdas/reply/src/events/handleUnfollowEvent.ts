export default async function handleUnfollowEvent(
  event: LineWebhookEvent
): Promise<void> {
  try {
    console.log("Unfollow event received");
    const userId = event.source.userId;

    if (!userId) {
      console.log("Missing required fields for unfollow event");
      return;
    }

    await invalidateUser(userId);
  } catch (error: any) {
    // invalidateUser のエラー形式に応じて処理
    if (error?.statusCode) {
      console.error(
        `invalidateUser error: status=${error.statusCode}, message=${error.message}`
      );
    } else {
      console.error("Unexpected error:", error);
    }

    return;
  }
}

const invalidateUser = async (userId: string): Promise<void> => {
  const gameServerEndpoint = `${process.env.GAME_SERVER_ENDPOINT}/api/users/${userId}/invalidate`;

  console.log("Game server endpoint:", gameServerEndpoint);

  const response = await fetch(gameServerEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    // JSON が返ってくる場合と text の場合どちらも対応
    let message = "";
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
      else message = JSON.stringify(body);
    } catch (_) {
      message = await response.text();
    }

    // ここで statusCode と message を throw
    throw {
      statusCode: response.status,
      message,
    };
  }

  const result = await response.json();
  console.log("Game server API result:", result);
};
