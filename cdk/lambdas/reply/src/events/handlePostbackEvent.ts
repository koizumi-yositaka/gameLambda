import { replyLineMessage } from "../common/lineCommon";

export default async function handlePostbackEvent(
  event: LineWebhookEvent,
  channelAccessToken: string
): Promise<void> {
  try {
    console.log("Postback event received");
    if (!event.postback) {
      throw new Error("postback data is required");
    }
    if (!event.replyToken) {
      throw new Error("reply token is required");
    }
    const replyToken = event.replyToken;
    const data = event.postback?.data;
    const params = event.postback?.params || {};
    console.log("postback data:", data);
    console.log("postback params:", params);

    // 必要なら data をパースして処理
    const parsed = parsePostbackData(data);

    switch (parsed.action) {
      case "turn_action":
        if (
          !parsed.commandType ||
          !parsed.roomSessionId ||
          !parsed.memberId ||
          !parsed.turn ||
          !parsed.formId
        ) {
          throw new Error(
            "commandType, roomSessionId, memberId, turn, and formId are required"
          );
        }

        const result = await sendCommand(
          parsed.roomSessionId,
          parsed.commandType,
          Number(parsed.memberId),
          Number(parsed.turn),
          parsed.formId,
          parsed.arg ?? ""
        );

        await replyLineMessage(
          channelAccessToken,
          replyToken,
          result.isValid ? "コマンドを受理しました" : "無効なコマンドです"
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
  memberId: number,
  turn: number,
  formId: string,
  arg: string
): Promise<AddCommandResult> => {
  const gameServerEndpoint = `${process.env.GAME_SERVER_ENDPOINT}/api/sessions/${roomSessionId}/commands`;
  const requestBody = {
    formId,
    turn,
    commands: [
      {
        commandType: commandType,
        memberId: memberId,
        arg: arg,
      },
    ],
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

  const result = (await response.json()) as AddCommandResult;
  console.log("Game server API result:", result);
  return result;
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

type AddCommandResult = {
  roomSessionId: number;
  commandsCount: number;
  isValid: boolean;
};
