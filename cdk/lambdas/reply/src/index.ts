// LINE Webhook受信用Lambda関数
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { verifySignature } from "./common/lineCommon";
import handleMessageEvent from "./events/handleMessageEvent";
import handleFollowEvent from "./events/handleFollowEvent";
import handleUnfollowEvent from "./events/handleUnfollowEvent";
import handlePostbackEvent from "./events/handlePostbackEvent";

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
        } else if (webhookEvent.type === "follow") {
          await handleFollowEvent(webhookEvent, channelAccessToken);
        } else if (webhookEvent.type === "unfollow") {
          await handleUnfollowEvent(webhookEvent);
        } else if (webhookEvent.type === "postback") {
          await handlePostbackEvent(webhookEvent, channelAccessToken);
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
