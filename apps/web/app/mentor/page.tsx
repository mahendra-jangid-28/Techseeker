'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { clearToken, getToken } from '../../lib/api/auth';
import {
  createConversation,
  getConversationDetail,
  getConversations,
  regenerateMessage,
  sendStreamingMessage,
} from '../../lib/api/chat';


import type { Conversation, Message } from '../../lib/types/chat';

const suggestions = [
  'Explain this concept simply',
  'Help me debug my code',
  'Create a learning roadmap',
  'Quiz me on a topic',
];

function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  return (
    message.includes('credentials') ||
    message.includes('unauthorized') ||
    message.includes('not authenticated')
  );
}

export default function MentorPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    number | null
  >(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const activeConversationIdRef = useRef<number | null>(null);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.replace('/login' as Route);
      return;
    }

    const authToken = token;

    async function loadConversations() {
      try {
        const data = await getConversations(authToken);

        setConversations(data);

        if (data.length > 0) {
          setActiveConversationId(data[0].id);
        }
      } catch (error) {
        if (isAuthError(error)) {
          clearToken();
          router.replace('/login' as Route);
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : 'Failed to load conversations',
        );
      } finally {
        setLoadingConversations(false);
      }
    }

    loadConversations();
  }, [router]);

  useEffect(() => {
    if (activeConversationId === null) {
      setMessages([]);
      return;
    }

    const conversationId = activeConversationId;
    const token = getToken();

    if (!token) {
      router.replace('/login' as Route);
      return;
    }

    const authToken = token;

    let cancelled = false;

    async function loadConversationDetail() {
      setLoadingMessages(true);
      setMessages([]);
      setLoadError(null);

      try {
        const detail = await getConversationDetail(authToken, conversationId);

        if (cancelled) return;

        setMessages(detail.messages);
      } catch (error) {
        if (cancelled) return;

        if (isAuthError(error)) {
          clearToken();
          router.replace('/login' as Route);
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : 'Failed to load conversation',
        );
      } finally {
        if (!cancelled) {
          setLoadingMessages(false);
        }
      }
    }

    loadConversationDetail();

    return () => {
      cancelled = true;
    };
  }, [activeConversationId, router]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sendingMessage]);

  async function sendMessage() {
    const trimmedMessage = message.trim();

    if (
      !trimmedMessage ||
      activeConversationId === null ||
      sendingMessage ||
      loadingMessages
    ) {
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace('/login' as Route);
      return;
    }

    const conversationId = activeConversationId;
    const wasNewChat =
      conversations.find((conversation) => conversation.id === conversationId)
        ?.title === 'New Chat';

    const userMsgId = Date.now();
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: trimmedMessage,
      created_at: new Date().toISOString(),
    };

    const assistantMsgId = userMsgId + 1;
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      userMsg,
      assistantMsg,
    ]);
    setMessage('');
    setSendingMessage(true);
    setLoadError(null);

    try {
      await sendStreamingMessage(token, conversationId, trimmedMessage, {
        onChunk: (chunk: string) => {
          if (activeConversationIdRef.current !== conversationId) return;
          setMessages((currentMessages) =>
            currentMessages.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        },
        onComplete: async () => {
          setSendingMessage(false);
          if (wasNewChat) {
            const updatedConversations = await getConversations(token);
            if (activeConversationIdRef.current === conversationId) {
              setConversations(updatedConversations);
            }
          }
        },
        onError: (error: Error) => {
          if (isAuthError(error)) {
            clearToken();
            router.replace('/login' as Route);
            return;
          }
          setLoadError(
            error instanceof Error ? error.message : 'Failed to send message',
          );
          setSendingMessage(false);
        },
      });
    } catch (error) {
      setSendingMessage(false);
    }
  }


  const [isRegenerating, setIsRegenerating] = useState(false);

  async function handleRegenerate(assistantMessageId: number) {
    if (
      activeConversationId === null ||
      sendingMessage ||
      isRegenerating ||
      loadingMessages
    ) {
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/login' as Route);
      return;
    }

    setIsRegenerating(true);
    setLoadError(null);

    const previousContent = messages.find((m) => m.id === assistantMessageId)?.content;
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === assistantMessageId
          ? { ...msg, content: '' }
          : msg
      )
    );

    try {
      const regeneratedMsg = await regenerateMessage(token, assistantMessageId);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? regeneratedMsg
            : msg
        )
      );
    } catch (error) {
      if (isAuthError(error)) {
        clearToken();
        router.replace('/login' as Route);
        return;
      }
      setLoadError(
        error instanceof Error ? error.message : 'Failed to regenerate response',
      );
      if (previousContent) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: previousContent }
              : msg
          )
        );
      }
    } finally {
      setIsRegenerating(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage();
  }


  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!sendingMessage) {
        sendMessage();
      }
    }
  }

  function handleSuggestion(suggestion: string) {
    setMessage(suggestion);
  }

  async function startNewConversation() {
    if (creatingConversation) return;

    const token = getToken();

    if (!token) {
      router.replace('/login' as Route);
      return;
    }

    setCreatingConversation(true);
    setLoadError(null);

    try {
      const newConversation = await createConversation(token);

      setConversations((currentConversations) => [
        newConversation,
        ...currentConversations,
      ]);
      setActiveConversationId(newConversation.id);
      setMessage('');
    } catch (error) {
      if (isAuthError(error)) {
        clearToken();
        router.replace('/login' as Route);
        return;
      }

      setLoadError(
        error instanceof Error
          ? error.message
          : 'Failed to create conversation',
      );
    } finally {
      setCreatingConversation(false);
    }
  }

  function selectConversation(conversationId: number) {
    if (conversationId === activeConversationId) return;

    setActiveConversationId(conversationId);
    setMessage('');
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[15%] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-sky-500/[0.08] blur-[120px]" />
        <div className="absolute right-[-8rem] top-[20%] h-[25rem] w-[25rem] rounded-full bg-violet-500/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-10rem] left-[35%] h-[24rem] w-[24rem] rounded-full bg-cyan-500/[0.05] blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1400px]">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 border-r border-white/[0.06] bg-slate-950/30 p-4 backdrop-blur-xl lg:flex lg:flex-col">
          <div className="mb-6 flex items-center gap-3 px-2">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500 text-lg font-bold text-slate-950 shadow-xl shadow-sky-500/20">
              TS

              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#030712] bg-emerald-400" />
            </div>

            <div>
              <h1 className="text-sm font-semibold tracking-tight text-white">
                TechSeeker
              </h1>

              <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-sky-400/70">
                AI Mentor
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={startNewConversation}
            disabled={creatingConversation}
            className="flex items-center gap-3 rounded-xl border border-sky-400/20 bg-sky-400/[0.06] px-4 py-3 text-left text-xs font-medium text-sky-300 transition hover:border-sky-400/30 hover:bg-sky-400/[0.1] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-400/10 text-base">
              +
            </span>

            {creatingConversation ? 'Creating...' : 'New chat'}
          </button>

          <div className="mt-8">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
              Recent conversations
            </p>

            <div className="mt-3 flex flex-col gap-1">
              {loadingConversations ? (
                <p className="px-3 py-2 text-xs text-slate-500">
                  Loading conversations...
                </p>
              ) : (
                conversations.map((conversation) => {
                const isActive =
                  conversation.id === activeConversationId;

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => selectConversation(conversation.id)}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs transition ${
                      isActive
                        ? 'border border-sky-400/15 bg-sky-400/[0.08] text-sky-200'
                        : 'border border-transparent text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] ${
                        isActive
                          ? 'bg-sky-400/10 text-sky-300'
                          : 'bg-white/[0.04] text-slate-600 group-hover:text-slate-400'
                      }`}
                    >
                      #
                    </span>

                    <span className="truncate">
                      {conversation.title}
                    </span>
                  </button>
                );
              })
              )}
            </div>
          </div>

          <div className="mt-auto border-t border-white/[0.06] pt-4">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
              <p className="text-[11px] font-medium text-slate-400">
                TechSeeker Intelligence
              </p>

              <p className="mt-1 text-[10px] leading-5 text-slate-600">
                Learn, build, debug, and grow with AI.
              </p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col px-4 py-5 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-white/[0.06] pb-5">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500 text-sm font-bold text-slate-950 shadow-xl shadow-sky-500/20 lg:hidden">
                TS

                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#030712] bg-emerald-400" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold tracking-tight text-white">
                    AI Mentor
                  </h2>

                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                    Online
                  </span>
                </div>

                <p className="mt-0.5 text-xs text-slate-500">
                  Your technical learning companion
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={startNewConversation}
              disabled={creatingConversation}
              className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-400 transition hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-60 lg:hidden"
            >
              {creatingConversation ? 'Creating...' : 'New chat'}
            </button>
          </header>

          {/* Chat area */}
          <section className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto py-8">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
                {loadError && (
                  <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                    {loadError}
                  </p>
                )}

                {loadingMessages ? (
                  <p className="py-6 text-center text-sm text-slate-500">
                    Loading messages...
                  </p>
                ) : (
                  <>
                {/* Welcome */}
                {messages.length === 0 && (
                  <div className="py-6 text-center">
                    <div className="relative mx-auto mb-6 h-20 w-20">
                      <div className="absolute inset-0 animate-pulse rounded-full bg-sky-400/10 blur-2xl" />

                      <div className="absolute inset-2 rounded-[1.5rem] border border-sky-400/20 bg-gradient-to-br from-sky-400/15 via-cyan-400/10 to-violet-500/10 shadow-2xl shadow-sky-500/10 backdrop-blur-xl" />

                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-gradient-to-r from-sky-300 via-cyan-300 to-violet-300 bg-clip-text text-xl font-bold text-transparent">
                          TS
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-sky-400/80">
                      TechSeeker Intelligence
                    </p>

                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                      What are you building today?
                    </h3>

                    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
                      Ask questions, debug code, understand difficult concepts,
                      or let your AI mentor guide your next technical step.
                    </p>
                  </div>
                )}

                {/* Suggestions */}
                {messages.length === 0 && (
                  <div className="mx-auto mb-4 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSuggestion(suggestion)}
                        className="group rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-left text-xs text-slate-400 transition duration-200 hover:-translate-y-0.5 hover:border-sky-400/20 hover:bg-sky-400/[0.05] hover:text-slate-200"
                      >
                        <span className="mr-2 text-slate-600 transition group-hover:text-sky-400">
                          -
                        </span>

                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {/* Messages */}
                <div className="flex flex-col gap-5 pb-6">
                  {messages.map((chatMessage) => {
                    const isLatestAssistant =
                      chatMessage.role === 'assistant' &&
                      chatMessage.id ===
                        [...messages]
                          .reverse()
                          .find((m) => m.role === 'assistant')?.id;

                    return (
                      <div
                        key={chatMessage.id}
                        className={`flex flex-col ${
                          chatMessage.role === 'user'
                            ? 'items-end'
                            : 'items-start'
                        }`}
                      >
                        <div
                          className={`flex max-w-[85%] gap-3 sm:max-w-[75%] ${
                            chatMessage.role === 'user'
                              ? 'flex-row-reverse'
                              : ''
                          }`}
                        >
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                              chatMessage.role === 'assistant'
                                ? 'bg-gradient-to-br from-sky-400 to-cyan-500 text-slate-950 shadow-lg shadow-sky-500/20'
                                : 'border border-white/[0.08] bg-white/[0.05] text-slate-300'
                            }`}
                          >
                            {chatMessage.role === 'assistant' ? 'TS' : 'Y'}
                          </div>

                          <div
                            className={`rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap ${
                              chatMessage.role === 'assistant'
                                ? 'rounded-tl-md border border-white/[0.07] bg-white/[0.035] text-slate-300'
                                : 'rounded-tr-md bg-gradient-to-br from-sky-400 to-cyan-400 text-slate-950 shadow-lg shadow-sky-500/10'
                            }`}
                          >
                            {chatMessage.content || (
                              (sendingMessage && chatMessage.role === 'assistant') || (isRegenerating && isLatestAssistant) ? (
                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 italic">
                                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                                  {isRegenerating ? 'Regenerating...' : 'Typing...'}
                                </span>
                              ) : null
                            )}
                          </div>
                        </div>

                        {/* Regenerate Button */}
                        {isLatestAssistant && !sendingMessage && (
                          <div className="mt-1.5 ml-12 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRegenerate(chatMessage.id)}
                              disabled={isRegenerating || sendingMessage}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-slate-400 transition hover:border-sky-400/30 hover:bg-sky-400/10 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <span className={`text-xs ${isRegenerating ? 'animate-spin' : ''}`}>↺</span>
                              <span>{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>



                {sendingMessage && (
                  <p className="pb-2 text-sm text-slate-500">Thinking...</p>
                )}
                  </>
                )}
              </div>
            </div>

            {/* Composer */}
            <div className="pb-4">
              <form
                onSubmit={handleSubmit}
                className="mx-auto max-w-4xl"
              >
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-slate-900/80 shadow-2xl shadow-black/30 backdrop-blur-xl transition focus-within:border-sky-400/30 focus-within:shadow-sky-500/[0.05]">
                  <div className="flex items-end gap-2 p-3">
                    <button
                      type="button"
                      className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200"
                      aria-label="Attach file"
                    >
                      +
                    </button>

                    <textarea
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask your AI mentor anything..."
                      rows={1}
                      disabled={sendingMessage}
                      className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 disabled:opacity-60"
                    />

                    <button
                      type="button"
                      className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200"
                      aria-label="Voice input"
                    >
                      O
                    </button>

                    <button
                      type="submit"
                      disabled={!message.trim() || sendingMessage || loadingMessages}
                      className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-400 px-3 text-xs font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:scale-105 hover:shadow-sky-500/30 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
                      aria-label="Send message"
                    >
                      {sendingMessage ? '...' : 'Send'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/[0.05] px-4 py-2">
                    <p className="text-[10px] text-slate-600">
                      AI can make mistakes. Verify important information.
                    </p>

                    <p className="hidden text-[10px] text-slate-600 sm:block">
                      Enter to send | Shift + Enter for new line
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-center text-[10px] text-slate-700">
                  TechSeeker AI Mentor
                </p>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}