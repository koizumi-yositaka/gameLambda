import { getUserStatus, replyLineMessage } from "../common/lineCommon";
import {
  MESSAGES_COMMON,
  MESSAGES_PARTICIPATING,
  MESSAGES_NOT_PARTICIPATING,
} from "../common/const";
/**
 * メッセージイベントを処理
 */
export default async function handleMessageEvent(
  event: LineWebhookEvent,
  channelAccessToken: string
): Promise<void> {
  try {
    if (event.type !== "message" || event.message?.type !== "text") {
      return;
    }

    const userId = event.source.userId;
    const messageText = event.message.text;
    const replyToken = event.replyToken;

    if (!userId || !messageText || !replyToken) {
      console.log("Missing required fields for message event");
      return;
    }

    console.log(`Received message from ${userId}: ${messageText}`);

    const userStatus = await getUserStatus(userId);

    const replyMessage = await getReplyMessage(userStatus, messageText);

    const response = await replyLineMessage(
      channelAccessToken,
      replyToken,
      replyMessage
    );

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

      console.error(
        `LINE Reply API error: status=${response.status}, message=${message}`
      );
    }
  } catch (error: any) {
    // getUserStatus や requestJoin のエラー形式に応じて処理
    if (error?.statusCode) {
      console.error(
        `Error: status=${error.statusCode}, message=${error.message}`
      );
    } else {
      console.error("Unexpected error:", error);
    }

    return;
  }
}

const getReplyMessage = async (
  userStatus: UserStatus,
  messageText: string
): Promise<string> => {
  let replyMessage = MESSAGES_COMMON.SORRY;
  // 未参加かつ4桁の数字が入力された場合は参加申請だとみなす
  if (isFourDigitNumber(messageText) && !userStatus.isParticipating) {
    replyMessage = MESSAGES_NOT_PARTICIPATING.JOIN_WAITING;
    await requestJoin(userStatus.userId, messageText);
    return replyMessage;
  }
  if (userStatus.invalidateFlg) {
    replyMessage = MESSAGES_COMMON.INVALIDATE;
    return replyMessage;
  }

  switch (messageText.toLowerCase()) {
    case "ヘルプ":
    case "help":
      replyMessage = userStatus.isParticipating
        ? MESSAGES_PARTICIPATING.HELP
        : MESSAGES_NOT_PARTICIPATING.HELP;
      break;
    case "debug":
      replyMessage = userStatus.isParticipating
        ? MESSAGES_PARTICIPATING.DEBUG
        : MESSAGES_NOT_PARTICIPATING.DEBUG;
      break;
    default:
      break;
  }

  return replyMessage;
};

const isFourDigitNumber = (text: string): boolean => {
  return /^[0-9]{4}$/.test(text);
};

const requestJoin = async (userId: string, roomCode: string): Promise<void> => {
  const gameServerEndpoint = `${process.env.GAME_SERVER_ENDPOINT}/api/rooms/${roomCode}/members`;
  const requestBody = {
    userId: userId,
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
