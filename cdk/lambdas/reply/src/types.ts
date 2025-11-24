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
