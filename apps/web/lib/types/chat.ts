export type MessageRole = 'user' | 'assistant';

export type Conversation = {
  id: number;
  title: string;
  created_at: string;
};

export type Message = {
  id: number;
  role: MessageRole;
  content: string;
  created_at: string;
};

export type ConversationDetail = Conversation & {
  messages: Message[];
};

export type ConversationCreate = {
  title?: string | null;
};

export type MessageCreate = {
  content: string;
};

export type ChatResponse = {
  user_message: Message;
  assistant_message: Message;
};
