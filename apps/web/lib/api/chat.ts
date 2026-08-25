import { apiRequest } from './client';
import type {
  ChatResponse,
  Conversation,
  ConversationDetail,
  Message,
} from '../types/chat';


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface StreamingCallbacks {
  onChunk: (text: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

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

export async function sendStreamingMessage(
  token: string,
  conversationId: number,
  content: string,
  callbacks: StreamingCallbacks,
): Promise<void> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/chat/conversations/${conversationId}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ content }),
      },
    );

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = (await response.json()) as { detail?: unknown };
        if (errorData?.detail) {
          errorMessage =
            typeof errorData.detail === 'string'
              ? errorData.detail
              : JSON.stringify(errorData.detail);
        }
      } catch {
        // use default message
      }
      const err = new Error(errorMessage);
      callbacks.onError?.(err);
      throw err;
    }

    if (!response.body) {
      const err = new Error('No response body received from stream.');
      callbacks.onError?.(err);
      throw err;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('data: ')) {
          const dataContent = trimmed.substring(6);
          if (dataContent === '[DONE]') {
            callbacks.onComplete?.();
            return;
          }
          callbacks.onChunk(dataContent);
        } else if (trimmed === 'event: done') {
          // Event marker
        }
      }
    }

    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith('data: ')) {
        const dataContent = trimmed.substring(6);
        if (dataContent === '[DONE]') {
          callbacks.onComplete?.();
          return;
        }
        callbacks.onChunk(dataContent);
      }
    }

    callbacks.onComplete?.();
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error(String(error));
    callbacks.onError?.(err);
    throw err;
  }
}

export function regenerateMessage(
  token: string,
  assistantMessageId: number,
): Promise<Message> {
  return apiRequest<Message>(
    `/chat/messages/${assistantMessageId}/regenerate`,
    {
      method: 'POST',
      token,
    },
  );
}

