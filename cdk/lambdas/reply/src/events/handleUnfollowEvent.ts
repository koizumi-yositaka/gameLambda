export default async function handleUnfollowEvent(
  event: LineWebhookEvent
): Promise<void> {
  console.log("Unfollow event received");
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
