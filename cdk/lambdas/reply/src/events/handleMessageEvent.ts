import { replyLineMessage } from "../common/lineCommon";
/**
 * メッセージイベントを処理
 */
export default async function handleMessageEvent(
  event: LineWebhookEvent,
  channelAccessToken: string
): Promise<void> {
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

  // エコー返信の例（実際の処理に置き換えてください）
  const replyMessage = `あなたが送ったメッセージ: ${messageText}`;

  const response = await replyLineMessage(
    channelAccessToken,
    replyToken,
    replyMessage
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("LINE Reply API error:", errorText);
  }
}
