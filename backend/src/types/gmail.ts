export interface ParsedMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  bodyText: string;
}

export interface ParsedThread {
  id: string;
  messages: ParsedMessage[];
}
