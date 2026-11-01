/**
 * FILE: pages/ChatPage.tsx
 * PURPOSE: The main ChatGPT-like screen.
 *
 * Left  : list of previous chats (chat history) + "New chat" button
 * Right : messages of the selected chat + question box
 *
 * For a NEW chat the user can optionally pick which documents to search.
 * Once a chat exists, that document scope is saved with it.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  askQuestionApi,
  deleteChatApi,
  getChatApi,
  listChatsApi,
  sendFeedbackApi,
} from "../api/chats.api";
import { listDocumentsApi } from "../api/documents.api";
import { getErrorMessage } from "../api/client";
import { ChatMessageBubble } from "../components/ChatMessageBubble";
import { Spinner } from "../components/Spinner";
import type { ChatMessage, ChatSummary, DocumentItem, Feedback, QueryMetrics } from "../types";

export function ChatPage() {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [lastMetrics, setLastMetrics] = useState<QueryMetrics | null>(null);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load chat list + ready documents when the page opens
  useEffect(() => {
    void refreshChats();
    listDocumentsApi()
      .then((docs) => setDocuments(docs.filter((d) => d.status === "ready")))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  // Auto-scroll to the newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAsking]);

  async function refreshChats() {
    try {
      setChats(await listChatsApi());
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function openChat(chatId: string) {
    setError("");
    setLastMetrics(null);
    try {
      const chat = await getChatApi(chatId);
      setActiveChatId(chat._id);
      setMessages(chat.messages);
      setFeedback(chat.feedbackByMessage);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function startNewChat() {
    setActiveChatId(null);
    setMessages([]);
    setFeedback({});
    setLastMetrics(null);
    setError("");
  }

  async function removeChat(chatId: string) {
    if (!confirm("Delete this chat?")) return;
    await deleteChatApi(chatId);
    if (chatId === activeChatId) startNewChat();
    await refreshChats();
  }

  async function handleAsk(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text || isAsking) return;

    // Show the user's message immediately (optimistic UI)
    const tempMessage: ChatMessage = {
      _id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      citations: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, tempMessage]);
    setQuestion("");
    setIsAsking(true);
    setError("");

    try {
      const result = await askQuestionApi(text, activeChatId ?? undefined, activeChatId ? undefined : selectedDocIds);
      setMessages((current) => [...current, result.message]);
      setLastMetrics(result.metrics);
      if (!activeChatId) {
        setActiveChatId(result.chatId);
      }
      await refreshChats();
    } catch (err) {
      setError(getErrorMessage(err));
      setMessages((current) => current.filter((m) => m._id !== tempMessage._id));
      setQuestion(text); // give the question back so the user can retry
    } finally {
      setIsAsking(false);
    }
  }

  async function handleFeedback(messageId: string, value: Feedback) {
    setFeedback((current) => ({ ...current, [messageId]: value }));
    try {
      await sendFeedbackApi(messageId, value);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function toggleDocument(id: string) {
    setSelectedDocIds((current) => (current.includes(id) ? current.filter((d) => d !== id) : [...current, id]));
  }

  return (
    <div className="flex h-full">
      {/* ---------- Sidebar: chat history ---------- */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="p-3">
          <button
            onClick={startNewChat}
            className="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + New chat
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto px-2 pb-3">
          {chats.length === 0 && <li className="px-2 text-sm text-zinc-500">No chats yet</li>}
          {chats.map((chat) => (
            <li key={chat._id} className="group flex items-center">
              <button
                onClick={() => openChat(chat._id)}
                className={`flex-1 truncate rounded-md px-2 py-2 text-left text-sm ${
                  chat._id === activeChatId ? "bg-zinc-100 font-medium" : "hover:bg-zinc-50"
                }`}
                title={chat.title}
              >
                {chat.title}
              </button>
              <button
                onClick={() => removeChat(chat._id)}
                className="invisible px-2 text-zinc-400 hover:text-red-600 group-hover:visible"
                title="Delete chat"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* ---------- Main: messages + input ---------- */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-4 p-4">
            {messages.length === 0 && (
              <div className="mt-10 text-center">
                <h2 className="text-2xl font-semibold">Ask anything about your documents</h2>
                <p className="mt-2 text-zinc-500">Answers include citations so you can verify every fact.</p>

                {/* Document scope picker (only for a new chat) */}
                {documents.length > 0 ? (
                  <div className="mx-auto mt-6 max-w-xl rounded-xl border border-zinc-200 bg-white p-4 text-left">
                    <p className="text-sm font-medium text-zinc-700">
                      Search in: {selectedDocIds.length === 0 ? "all my documents" : `${selectedDocIds.length} selected`}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {documents.map((doc) => (
                        <button
                          key={doc._id}
                          onClick={() => toggleDocument(doc._id)}
                          className={`rounded-full border px-3 py-1 text-xs ${
                            selectedDocIds.includes(doc._id)
                              ? "border-brand-500 bg-brand-50 text-brand-700"
                              : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
                          }`}
                        >
                          {doc.originalName}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-zinc-500">
                    No processed documents yet — upload one on the <b>Documents</b> page.
                  </p>
                )}
              </div>
            )}

            {messages.map((message) => (
              <ChatMessageBubble
                key={message._id}
                message={message}
                feedback={feedback[message._id] ?? null}
                onFeedback={message.role === "assistant" ? handleFeedback : undefined}
              />
            ))}

            {isAsking && (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Spinner className="h-4 w-4" /> Searching your documents and writing an answer…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* ---------- Question box ---------- */}
        <div className="border-t border-zinc-200 bg-white p-3">
          <form onSubmit={handleAsk} className="mx-auto flex max-w-3xl gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about your documents…"
              className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              disabled={isAsking}
            />
            <button
              type="submit"
              disabled={isAsking || !question.trim()}
              className="rounded-xl bg-zinc-900 px-5 font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
            >
              Send
            </button>
          </form>
          <div className="mx-auto mt-2 flex max-w-3xl justify-between text-xs text-zinc-500">
            <span className="text-red-600">{error}</span>
            {lastMetrics && (
              <span title="Metrics for the last answer">
                ⏱ {(lastMetrics.totalTimeMs / 1000).toFixed(1)}s (search {lastMetrics.retrievalTimeMs}ms) · 🔤{" "}
                {lastMetrics.inputTokens + lastMetrics.outputTokens} tokens · 💲{lastMetrics.costUsd.toFixed(5)}
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
