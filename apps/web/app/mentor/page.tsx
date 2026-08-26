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
import { MarkdownRenderer } from '../../components/MarkdownRenderer';

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

  const [threadsDrawerOpen, setThreadsDrawerOpen] = useState(false);

  function selectConversation(conversationId: number) {
    if (conversationId === activeConversationId) return;

    setActiveConversationId(conversationId);
    setMessage('');
    setThreadsDrawerOpen(false);
  }

  const threadListContent = (
    <div className="flex h-full flex-col justify-between min-h-0">
      <div className="flex flex-col min-h-0 flex-1">
        <div className="mb-4 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 text-xs font-bold text-slate-950 shadow-md">
              TS
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white tracking-tight">AI Mentor</h2>
              <p className="text-[9px] uppercase tracking-wider text-sky-400/80">Threads</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setThreadsDrawerOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:text-white lg:hidden"
            aria-label="Close threads"
          >
            ✕
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            startNewConversation();
            setThreadsDrawerOpen(false);
          }}
          disabled={creatingConversation}
          className="flex items-center gap-2.5 rounded-xl border border-sky-400/20 bg-sky-400/[0.06] px-3.5 py-2.5 text-left text-xs font-medium text-sky-300 transition hover:bg-sky-400/[0.12] disabled:opacity-60"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-400/15 text-xs font-bold">
            +
          </span>
          <span>{creatingConversation ? 'Creating...' : 'New chat'}</span>
        </button>

        {/* Conversation list */}
        <div className="mt-4 flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
          {loadingConversations ? (
            <p className="px-3 py-2 text-xs text-slate-500">Loading conversations...</p>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => selectConversation(conv.id)}
                  className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs transition ${
                    isActive
                      ? 'border border-sky-400/20 bg-sky-400/[0.08] text-sky-200 font-medium'
                      : 'border border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] ${
                      isActive
                        ? 'bg-sky-400/15 text-sky-300'
                        : 'bg-white/[0.04] text-slate-500 group-hover:text-slate-300'
                    }`}
                  >
                    #
                  </span>
                  <span className="truncate flex-1">{conv.title}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/[0.06] pt-3 mt-2">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-[11px] text-slate-400">
          <p className="font-semibold text-slate-300">Adaptive Intelligence</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Contextually guided by your goals & mistakes.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#030712]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[15%] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-sky-500/[0.06] blur-[120px]" />
        <div className="absolute right-[-8rem] top-[20%] h-[25rem] w-[25rem] rounded-full bg-violet-500/[0.05] blur-[120px]" />
      </div>

      {/* Desktop Conversation Sidebar */}
      <aside className="relative z-10 hidden w-72 shrink-0 border-r border-white/[0.06] bg-slate-950/40 p-4 lg:flex lg:flex-col min-h-0 h-full">
        {threadListContent}
      </aside>

      {/* Mobile Threads Drawer */}
      {threadsDrawerOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setThreadsDrawerOpen(false)}
          />
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-white/[0.08] bg-slate-950 p-4 shadow-2xl">
            {threadListContent}
          </div>
        </div>
      )}

      {/* Main Chat Workspace */}
      <div className="relative z-10 flex h-full flex-1 flex-col min-w-0 overflow-hidden">
        {/* Sticky Workspace Header */}
        <header className="shrink-0 flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-6 bg-slate-950/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setThreadsDrawerOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 text-xs font-medium text-slate-300 hover:bg-white/[0.06] lg:hidden"
            >
              <span>#</span>
              <span>Threads</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">AI Mentor Workspace</h2>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-emerald-400">
                  Adaptive
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Pair programming, debugging, and concept mastery
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={startNewConversation}
            disabled={creatingConversation}
            className="rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-400/20 transition disabled:opacity-50"
          >
            {creatingConversation ? 'Creating...' : '+ New Thread'}
          </button>
        </header>

        {/* Scrollable Message Area */}
        <section className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
            {loadError && (
              <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                {loadError}
              </p>
            )}

            {loadingMessages ? (
              <p className="py-6 text-center text-sm text-slate-500">Loading messages...</p>
            ) : (
              <>
                {/* Welcome view when empty */}
                {messages.length === 0 && (
                  <div className="py-8 text-center">
                    <div className="relative mx-auto mb-5 h-16 w-16">
                      <div className="absolute inset-0 animate-pulse rounded-full bg-sky-400/10 blur-xl" />
                      <div className="absolute inset-1 rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-400/15 via-cyan-400/10 to-violet-500/10 flex items-center justify-center">
                        <span className="bg-gradient-to-r from-sky-300 via-cyan-300 to-violet-300 bg-clip-text text-base font-bold text-transparent">
                          TS
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-sky-400/80">
                      TechSeeker Intelligence
                    </p>

                    <h3 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                      What are you working on today?
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-400">
                      Ask questions, debug code, or work through tricky concepts with your adaptive mentor.
                    </p>

                    {/* Suggestions */}
                    <div className="mx-auto mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleSuggestion(suggestion)}
                          className="group rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5 text-left text-xs text-slate-300 transition duration-150 hover:border-sky-400/30 hover:bg-sky-400/[0.06] hover:text-white"
                        >
                          <span className="mr-2 text-sky-400/60 group-hover:text-sky-300">✦</span>
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message stream */}
                <div className="flex flex-col gap-5 pb-4">
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
                          chatMessage.role === 'user' ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`flex max-w-[88%] gap-3 sm:max-w-[78%] ${
                            chatMessage.role === 'user' ? 'flex-row-reverse' : ''
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                              chatMessage.role === 'assistant'
                                ? 'bg-gradient-to-br from-sky-400 to-cyan-500 text-slate-950 shadow-md'
                                : 'border border-white/[0.08] bg-white/[0.05] text-slate-300'
                            }`}
                          >
                            {chatMessage.role === 'assistant' ? 'TS' : 'Y'}
                          </div>

                          <div
                            className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                              chatMessage.role === 'assistant'
                                ? 'rounded-tl-md border border-white/[0.07] bg-white/[0.035] text-slate-300 shadow-sm'
                                : 'rounded-tr-md bg-gradient-to-br from-sky-400 to-cyan-400 text-slate-950 font-medium shadow-md whitespace-pre-wrap'
                            }`}
                          >
                            {chatMessage.content ? (
                              chatMessage.role === 'assistant' ? (
                                <MarkdownRenderer content={chatMessage.content} />
                              ) : (
                                chatMessage.content
                              )
                            ) : (
                              (sendingMessage && chatMessage.role === 'assistant') ||
                              (isRegenerating && isLatestAssistant) ? (
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
                          <div className="mt-1.5 ml-11 flex items-center gap-2">
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
                  <p className="pb-2 text-xs text-slate-500 italic">Thinking...</p>
                )}
              </>
            )}
          </div>
        </section>

        {/* Pinned Bottom Composer */}
        <div className="shrink-0 border-t border-white/[0.06] bg-slate-950/80 p-3 sm:p-4 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-slate-900/90 shadow-2xl transition focus-within:border-sky-400/40">
              <div className="flex items-end gap-2 p-2.5">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask your AI mentor anything... (Shift+Enter for newline)"
                  rows={1}
                  disabled={sendingMessage}
                  className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={!message.trim() || sendingMessage || loadingMessages}
                  className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-400 text-xs font-bold text-slate-950 shadow-md shadow-sky-500/20 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
                  aria-label="Send message"
                >
                  {sendingMessage ? '...' : '→'}
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-white/[0.04] px-3.5 py-1.5 text-[10px] text-slate-500">
                <span>AI can make mistakes. Verify critical code.</span>
                <span className="hidden sm:inline">Enter to send | Shift + Enter for newline</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}