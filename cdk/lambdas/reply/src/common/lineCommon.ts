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
