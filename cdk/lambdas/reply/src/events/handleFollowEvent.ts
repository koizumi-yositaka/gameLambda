import { replyLineMessage } from "../common/lineCommon";

type Profile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
};

export default async function handleFollowEvent(
  event: LineWebhookEvent,
  channelAccessToken: string
): Promise<void> {
  try {
    console.log("Follow event received");

    const userId = event.source.userId;
    const replyToken = event.replyToken;

    if (!userId || !replyToken) {
      console.log("Missing required fields for follow event");
      return;
    }

    const profile = await getProfile(userId, channelAccessToken);

    await registerUser(userId, profile.displayName);

    const replyMessage = `ようこそ！${profile.displayName}さん！`;

    await replyLineMessage(channelAccessToken, replyToken, replyMessage);
  } catch (error: any) {
    // registerUser のエラー形式に応じて処理
    if (error?.statusCode) {
      console.error(
        `registerUser error: status=${error.statusCode}, message=${error.message}`
      );
    } else {
      console.error("Unexpected error:", error);
    }

    return;
  }
}

const getProfile = async (
  userId: string,
  channelAccessToken: string
): Promise<Profile> => {
  const endpoint = `https://api.line.me/v2/bot/profile/${userId}`;

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
    },
  });

  if (!response.ok) {
    // LINE API は text か JSON のどちらかが返ることがあるので両対応
    let message = "Unknown LINE API error";

    // JSON の場合
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
      else message = JSON.stringify(body);
    } catch (_) {
      // JSON でない → text
      message = await response.text();
    }

    throw {
      statusCode: response.status,
      message,
    };
  }

  const data = await response.json();

  return {
    userId: data.userId,
    displayName: data.displayName,
    pictureUrl: data.pictureUrl,
    statusMessage: data.statusMessage,
  };
};

const registerUser = async (
  userId: string,
  displayName: string
): Promise<void> => {
  const gameServerEndpoint = `${process.env.GAME_SERVER_ENDPOINT}/api/users`;
  const requestBody = {
    userId: userId,
    displayName: displayName,
  };

  console.log("Game server endpoint:", gameServerEndpoint);
  console.log("Request body:", requestBody);

  const response = await fetch(gameServerEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    // JSON が返ってくる場合と text の場合どちらも対応
    let message = "";
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
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
