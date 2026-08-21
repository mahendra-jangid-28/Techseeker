'use client';

import { FormEvent, KeyboardEvent, useState } from 'react';

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
};

type Conversation = {
  id: number;
  title: string;
  messages: Message[];
};

const suggestions = [
  'Explain this concept simply',
  'Help me debug my code',
  'Create a learning roadmap',
  'Quiz me on a topic',
];

const welcomeMessage: Message = {
  id: 1,
  role: 'assistant',
  content:
    "Hey! I'm your TechSeeker AI Mentor. Tell me what you are learning, building, or struggling with, and we'll work through it together.",
};

const initialConversations: Conversation[] = [
  {
    id: 1,
    title: 'New conversation',
    messages: [welcomeMessage],
  },
  {
    id: 2,
    title: 'Understanding React hooks',
    messages: [
      {
        id: 2,
        role: 'user',
        content: 'Can you explain React hooks simply?',
      },
      {
        id: 3,
        role: 'assistant',
        content:
          'React hooks let function components use features like state and lifecycle behavior. For example, useState helps you store and update data inside a component.',
      },
    ],
  },
  {
    id: 3,
    title: 'Python learning roadmap',
    messages: [
      {
        id: 4,
        role: 'user',
        content: 'I want to learn Python properly.',
      },
      {
        id: 5,
        role: 'assistant',
        content:
          'Start with Python fundamentals, then functions, OOP, file handling, APIs, databases, and finally build projects based on your goals.',
      },
    ],
  },
  {
    id: 4,
    title: 'Debugging my API',
    messages: [
      {
        id: 6,
        role: 'user',
        content: 'My API is returning an error. How should I debug it?',
      },
      {
        id: 7,
        role: 'assistant',
        content:
          'Start by checking the server logs, request payload, response status code, environment variables, and database connection. Then isolate the failing layer step by step.',
      },
    ],
  },
];

export default function MentorPage() {
  const [message, setMessage] = useState('');

  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);

  const [activeConversationId, setActiveConversationId] = useState(1);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId
  );

  const messages = activeConversation?.messages ?? [];

  function sendMessage() {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: trimmedMessage,
    };

    setConversations((currentConversations) =>
      currentConversations.map((conversation) => {
        if (conversation.id !== activeConversationId) {
          return conversation;
        }

        const shouldUpdateTitle =
          conversation.title === 'New conversation';

        return {
          ...conversation,
          title: shouldUpdateTitle
            ? trimmedMessage.slice(0, 32)
            : conversation.title,
          messages: [...conversation.messages, userMessage],
        };
      })
    );

    setMessage('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function handleSuggestion(suggestion: string) {
    setMessage(suggestion);
  }

  function startNewConversation() {
    const conversationId = Date.now();

    const newConversation: Conversation = {
      id: conversationId,
      title: 'New conversation',
      messages: [
        {
          id: conversationId + 1,
          role: 'assistant',
          content:
            "Hey! I'm your TechSeeker AI Mentor. What would you like to learn or build?",
        },
      ],
    };

    setConversations((currentConversations) => [
      newConversation,
      ...currentConversations,
    ]);

    setActiveConversationId(newConversation.id);
    setMessage('');
  }

  function selectConversation(conversationId: number) {
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
            className="flex items-center gap-3 rounded-xl border border-sky-400/20 bg-sky-400/[0.06] px-4 py-3 text-left text-xs font-medium text-sky-300 transition hover:border-sky-400/30 hover:bg-sky-400/[0.1]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-400/10 text-base">
              +
            </span>

            New chat
          </button>

          <div className="mt-8">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
              Recent conversations
            </p>

            <div className="mt-3 flex flex-col gap-1">
              {conversations.map((conversation) => {
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
              })}
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
              className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-400 transition hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-slate-200 lg:hidden"
            >
              New chat
            </button>
          </header>

          {/* Chat area */}
          <section className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto py-8">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
                {/* Welcome */}
                {messages.length === 1 && (
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
                {messages.length === 1 && (
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
                  {messages.map((chatMessage) => (
                    <div
                      key={chatMessage.id}
                      className={`flex ${
                        chatMessage.role === 'user'
                          ? 'justify-end'
                          : 'justify-start'
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
                          className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                            chatMessage.role === 'assistant'
                              ? 'rounded-tl-md border border-white/[0.07] bg-white/[0.035] text-slate-300'
                              : 'rounded-tr-md bg-gradient-to-br from-sky-400 to-cyan-400 text-slate-950 shadow-lg shadow-sky-500/10'
                          }`}
                        >
                          {chatMessage.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                      className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600"
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
                      disabled={!message.trim()}
                      className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-400 px-3 text-xs font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:scale-105 hover:shadow-sky-500/30 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
                      aria-label="Send message"
                    >
                      Send
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