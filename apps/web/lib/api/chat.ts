import { apiRequest } from './client';
import type {
  ChatResponse,
  Conversation,
  ConversationDetail,
} from '../types/chat';

export function createConversation(
  token: string,
  title?: string,
): Promise<Conversation> {
  return apiRequest<Conversation>('/chat/conversations', {
    method: 'POST',
    token,
    body: {
      title: title ?? 'New Chat',
    },
  });
}

export function getConversations(token: string): Promise<Conversation[]> {
  return apiRequest<Conversation[]>('/chat/conversations', {
    token,
  });
}

export function getConversationDetail(
  token: string,
  conversationId: number,
): Promise<ConversationDetail> {
  return apiRequest<ConversationDetail>(
    `/chat/conversations/${conversationId}`,
    {
      token,
    },
  );
}

export function sendMessage(
  token: string,
  conversationId: number,
  content: string,
): Promise<ChatResponse> {
  return apiRequest<ChatResponse>(
    `/chat/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      token,
      body: { content },
    },
  );
}
