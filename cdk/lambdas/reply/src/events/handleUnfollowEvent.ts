import { replyLineMessage } from "../common/lineCommon";

type Profile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
};

export default async function handleFollowEvent(
  event: LineWebhookEvent,
  channelAccessToken: string
): Promise<void> {
  console.log("Follow event received");
  const userId = event.source.userId;
  const replyToken = event.replyToken;

  if (!userId || !replyToken) {
    console.log("Missing required fields for follow event");
    return;
  }

  await invalidateUser(userId);
}

const invalidateUser = async (userId: string): Promise<void> => {
  const gameServerEndpoint = `${process.env.GAME_SERVER_ENDPOINT}/api/users/${userId}/invalidate`;
  const response = await fetch(gameServerEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Game server API error:", errorText);
    return;
  }
  const result = await response.json();
  console.log("Game server API result:", result);
};
