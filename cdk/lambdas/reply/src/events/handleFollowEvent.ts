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
  const profile = await getProfile(userId, channelAccessToken);
  const replyMessage = `ようこそ！${profile.displayName}さん！`;
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

const getProfile = async (
  userId: string,
  channelAccessToken: string
): Promise<Profile> => {
  const endpoint = `https://api.line.me/v2/bot/profile/${userId}`;
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
    },
  });
  const data = await response.json();
  return {
    userId: data.userId,
    displayName: data.displayName,
    pictureUrl: data.pictureUrl,
    statusMessage: data.statusMessage,
  };
};
