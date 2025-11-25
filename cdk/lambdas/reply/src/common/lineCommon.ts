import { LINE_REPLY_API_URL } from "./const";
import { createHmac } from "crypto";
/**
 * LINE Reply APIにメッセージを送信
 */
export const replyLineMessage = async (
  channelAccessToken: string,
  replyToken: string,
  message: string
): Promise<Response> => {
  const body: LineReplyMessage = {
    replyToken: replyToken,
    messages: [
      {
        type: "text",
        text: message,
      },
    ],
  };

  const response = await fetch(LINE_REPLY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify(body),
  });

  return response;
};

export const verifySignature = (
  body: string,
  signature: string,
  channelSecret: string
): boolean => {
  if (!signature) {
    return false;
  }

  const hash = createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");

  return hash === signature;
};

export const getUserStatus = async (userId: string): Promise<UserStatus> => {
  const endpoint = `${process.env.GAME_SERVER_ENDPOINT}/api/users/${userId}/status`;

  const response = await fetch(endpoint);

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

    throw {
      statusCode: response.status,
      message,
    };
  }

  const data = await response.json();
  return data as UserStatus;
};
