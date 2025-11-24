// LINE Webhook受信用Lambda関数
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { createHmac } from "crypto";

const LINE_REPLY_API_URL = "https://api.line.me/v2/bot/message/reply";

interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  source: {
    type: string;
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  message?: {
    type: string;
    id: string;
    text?: string;
  };
  timestamp: number;
}

interface LineWebhookBody {
  events: LineWebhookEvent[];
}

interface LineReplyMessage {
  replyToken: string;
  messages: Array<{
    type: string;
    text: string;
  }>;
}

/**
 * LINE Webhookの署名を検証
 */
function verifySignature(
  body: string,
  signature: string,
  channelSecret: string
): boolean {
  if (!signature) {
    return false;
  }

  const hash = createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");

  return hash === signature;
}

/**
 * LINE Reply APIにメッセージを送信
 */
async function replyLineMessage(
  channelAccessToken: string,
  replyToken: string,
  message: string
): Promise<Response> {
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
}

/**
 * メッセージイベントを処理
 */
async function handleMessageEvent(
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

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log("Webhook event received");

  try {
    // 環境変数からLINE Channel SecretとAccess Tokenを取得
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!channelSecret) {
      console.error("LINE_CHANNEL_SECRET is not set");
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "LINE_CHANNEL_SECRET environment variable is not set",
        }),
      };
    }

    if (!channelAccessToken) {
      console.error("LINE_CHANNEL_ACCESS_TOKEN is not set");
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "LINE_CHANNEL_ACCESS_TOKEN environment variable is not set",
        }),
      };
    }

    // リクエストボディを取得
    const body = event.body || "";
    if (!body) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Request body is empty",
        }),
      };
    }

    // 署名検証
    const signature =
      event.headers["x-line-signature"] ||
      event.headers["X-Line-Signature"] ||
      "";
    if (!verifySignature(body, signature, channelSecret)) {
      console.error("Invalid signature");
      return {
        statusCode: 401,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Invalid signature",
        }),
      };
    }

    // Webhookイベントをパース
    let webhookBody: LineWebhookBody;
    try {
      webhookBody = JSON.parse(body);
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Invalid JSON in request body",
        }),
      };
    }

    // 各イベントを処理
    if (webhookBody.events && Array.isArray(webhookBody.events)) {
      for (const webhookEvent of webhookBody.events) {
        if (webhookEvent.type === "message") {
          await handleMessageEvent(webhookEvent, channelAccessToken);
        } else {
          console.log(`Unhandled event type: ${webhookEvent.type}`);
        }
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "OK",
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
