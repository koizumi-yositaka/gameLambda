// lambda/hello.ts
import { APIGatewayProxyHandlerV2 } from "aws-lambda";

const LINE_API_URL = "https://api.line.me/v2/bot/message/push";

interface LinePushMessage {
  to: string;
  messages: Array<any>;
}

/**
 * LINE Messaging APIにメッセージを送信
 */
async function sendLineMessage(
  channelAccessToken: string,
  userId: string,
  sendMessage: Array<any>
): Promise<Response> {
  const body: LinePushMessage = {
    to: userId,
    messages: sendMessage,
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

    const requestBody = event.body ? JSON.parse(event.body) : {};
    if (!requestBody.userId || !requestBody.messages) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "to and messages are required in request body",
        }),
      };
    }

    const userId = requestBody.userId;
    const messages = requestBody.messages;

    // LINE APIにメッセージを送信
    const lineResponse = await sendLineMessage(
      channelAccessToken,
      userId,
      messages
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
