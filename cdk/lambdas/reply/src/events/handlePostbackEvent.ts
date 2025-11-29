export default async function handlePostbackEvent(
  event: LineWebhookEvent
): Promise<void> {
  try {
    console.log("Postback event received");
    if (!event.postback) {
      throw new Error("postback data is required");
    }
    const data = event.postback?.data;
    const params = event.postback?.params || {};
    console.log("postback data:", data);
    console.log("postback params:", params);

    // 必要なら data をパースして処理
    const parsed = parsePostbackData(data);

    switch (parsed.action) {
      case "turn_action":
        if (!parsed.commandType || !parsed.roomSessionId || !parsed.memberId) {
          throw new Error("select, roomSessionId, and memberId are required");
        }
        await sendCommand(
          parsed.roomSessionId,
          parsed.commandType,
          parsed.memberId
        );
        break;
      default:
        break;
    }
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return;
  }
}

//action=turn_action&select=001&roomSessionId=001&memberId=001

const sendCommand = async (
  roomSessionId: string,
  commandType: string,
  memberId: string
): Promise<void> => {
  const gameServerEndpoint = `${process.env.GAME_SERVER_ENDPOINT}/api/sessions/${roomSessionId}/commands`;
  const requestBody = {
    commandType: commandType,
    memberId: memberId,
  };

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

type PostbackData = {
  action: string;
  [key: string]: string;
};

function parsePostbackData(raw: string): PostbackData {
  const params = new URLSearchParams(raw);
  const result: Record<string, string> = {};

  params.forEach((value, key) => {
    result[key] = value;
  });

  if (!result.action) {
    throw new Error("postback data に action がありません");
  }

  return result as PostbackData;
}
