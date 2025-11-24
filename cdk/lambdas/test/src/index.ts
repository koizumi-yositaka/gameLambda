// lambda/hello.ts
import { APIGatewayProxyHandlerV2 } from "aws-lambda";

const LINE_API_URL = "https://api.line.me/v2/bot/message/push";

interface LinePushMessage {
  to: string;
  messages: Array<{
    type: string;
    text: string;
  }>;
}

/**
 * LINE Messaging APIにメッセージを送信
 */
async function sendLineMessage(
  channelAccessToken: string,
  userId: string,
  message: string
): Promise<Response> {
  const body: LinePushMessage = {
    to: userId,
    messages: [
      {
        type: "text",
        text: message,
      },
    ],
  };

  const response = await fetch(LINE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify(body),
  });

  return response;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log("event:", JSON.stringify(event));

  try {
    // 環境変数からLINE Channel Access Tokenを取得
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!channelAccessToken) {
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

    // リクエストボディからuserIdとmessageを取得
    let requestBody: { userId?: string; message?: string };
    try {
      requestBody = event.body ? JSON.parse(event.body) : {};
    } catch (e) {
      requestBody = {};
    }

    const userId = requestBody.userId;
    const message = requestBody.message || "Hello from Lambda!";

    if (!userId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "userId is required in request body",
        }),
      };
    }

    // LINE APIにメッセージを送信
    const lineResponse = await sendLineMessage(
      channelAccessToken,
      userId,
      message
    );

    if (!lineResponse.ok) {
      const errorText = await lineResponse.text();
      console.error("LINE API error:", errorText);
      return {
        statusCode: lineResponse.status,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Failed to send LINE message",
          details: errorText,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "LINE message sent successfully",
        userId: userId,
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
