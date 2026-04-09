export interface ThreadAnalysis {
  summary: string;
  sender_intent: string;
  action_items: string[];
  deadlines: string[];
  suggested_reply: string;
}

export interface AnalyzeThreadRequest {
  threadId?: string;
  cleanedThreadText?: string;
  replyPreference?: string;
}
