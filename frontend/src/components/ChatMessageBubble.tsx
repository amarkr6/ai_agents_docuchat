/**
 * FILE: components/ChatMessageBubble.tsx
 * PURPOSE: Renders ONE chat message.
 *
 * For AI answers it also shows:
 *   - the answer formatted as Markdown (bold, bullet lists, headings…)
 *   - [1] [2] markers turned into small clickable citation badges
 *   - the sources the AI actually cited (file name, page, similarity, snippet)
 *   - when the AI cited nothing, the searched passages are collapsed by default
 *   - 👍 / 👎 buttons to rate the answer (stored for quality metrics)
 */
import { useState, type ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import type { ChatMessage, Citation, Feedback } from "../types";

interface Props {
  message: ChatMessage;
  feedback?: Feedback;
  onFeedback?: (messageId: string, feedback: Feedback) => void;
}

/**
 * Turns "[1]" into a Markdown link "[1](#cite-1)" so react-markdown gives it to
 * our custom `a` renderer below, which draws it as a badge.
 */
function linkCitations(text: string): string {
  return text.replace(/\[(\d+)\](?!\()/g, "[$1](#cite-$1)");
}

/** One source card under the answer. */
function SourceCard({ citation, isHighlighted }: { citation: Citation; isHighlighted: boolean }) {
  return (
    <li
      className={`rounded-lg p-2 text-sm transition-colors ${
        isHighlighted ? "bg-brand-50 ring-1 ring-brand-500" : "bg-zinc-50"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-brand-100 px-1.5 text-xs font-semibold text-brand-700">{citation.index}</span>
        <span className="font-medium">{citation.fileName}</span>
        {citation.pageNumber && <span className="text-zinc-500">page {citation.pageNumber}</span>}
        <span className="ml-auto text-xs text-zinc-400" title="Similarity score (higher is better)">
          match {(citation.score * 100).toFixed(0)}%
        </span>
      </div>
      <p className="mt-1 line-clamp-3 text-xs text-zinc-600">{citation.snippet}</p>
    </li>
  );
}

export function ChatMessageBubble({ message, feedback = null, onFeedback }: Props) {
  const [showAllSources, setShowAllSources] = useState(false);
  const [highlighted, setHighlighted] = useState<number | null>(null);

  // ---- User message: simple dark bubble ----
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-zinc-900 px-4 py-2.5 text-white">
          {message.content}
        </div>
      </div>
    );
  }

  // ---- AI message ----
  const citedSources = message.citations.filter((c) => c.usedInAnswer);
  const unusedCount = message.citations.length - citedSources.length;
  const visibleSources = showAllSources ? message.citations : citedSources;

  /** Clicking a [n] badge highlights that source (and reveals it if hidden). */
  function focusCitation(index: number) {
    const citation = message.citations.find((c) => c.index === index);
    if (citation && !citation.usedInAnswer) setShowAllSources(true);
    setHighlighted(index);
  }

  // How each Markdown element is drawn (Tailwind classes instead of a CSS file)
  const markdownComponents: Components = {
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
    ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
    strong: ({ children }) => <strong className="font-semibold text-zinc-900">{children}</strong>,
    h1: ({ children }) => <h3 className="mb-2 mt-3 font-semibold">{children}</h3>,
    h2: ({ children }) => <h3 className="mb-2 mt-3 font-semibold">{children}</h3>,
    h3: ({ children }) => <h4 className="mb-1 mt-3 font-semibold">{children}</h4>,
    code: ({ children }) => <code className="rounded bg-zinc-100 px-1 py-0.5 text-[0.9em]">{children}</code>,
    a: ({ href, children }) => {
      // Our citation links -> badge button
      if (href?.startsWith("#cite-")) {
        const index = Number(href.replace("#cite-", ""));
        const citation = message.citations.find((c) => c.index === index);
        return (
          <button
            type="button"
            onClick={() => focusCitation(index)}
            title={citation ? `${citation.fileName}${citation.pageNumber ? `, page ${citation.pageNumber}` : ""}` : undefined}
            className="mx-0.5 inline-flex -translate-y-1 items-center rounded bg-brand-100 px-1 text-[10px] font-semibold leading-4 text-brand-700 hover:bg-brand-500 hover:text-white"
          >
            {index}
          </button>
        );
      }
      // Normal links open in a new tab
      return (
        <a href={href} target="_blank" rel="noreferrer" className="text-brand-700 underline">
          {children as ReactNode}
        </a>
      );
    },
  };

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[85%] rounded-2xl rounded-bl-sm border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div className="leading-relaxed">
          <Markdown components={markdownComponents}>{linkCitations(message.content)}</Markdown>
        </div>

        {message.citations.length > 0 && (
          <div className="mt-3 border-t border-zinc-100 pt-3">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <span>{citedSources.length > 0 ? "Sources" : "Searched passages"}</span>
              {unusedCount > 0 && (
                <button
                  className="normal-case text-brand-700 hover:underline"
                  onClick={() => setShowAllSources(!showAllSources)}
                >
                  {showAllSources
                    ? citedSources.length > 0
                      ? "Show cited only"
                      : "Hide"
                    : citedSources.length > 0
                      ? `Show all ${message.citations.length}`
                      : "Show"}
                </button>
              )}
            </div>

            {/* The AI used none of the retrieved passages -> explain instead of listing them */}
            {citedSources.length === 0 && !showAllSources && (
              <p className="text-xs text-zinc-500">
                {message.citations.length} passages were searched, but none of them contained the answer.
              </p>
            )}

            {visibleSources.length > 0 && (
              <ul className="space-y-2">
                {visibleSources.map((citation) => (
                  <SourceCard key={citation.index} citation={citation} isHighlighted={highlighted === citation.index} />
                ))}
              </ul>
            )}
          </div>
        )}

        {onFeedback && (
          <div className="mt-2 flex gap-1 text-sm">
            <button
              title="Helpful"
              onClick={() => onFeedback(message._id, feedback === "up" ? null : "up")}
              className={`rounded px-2 py-0.5 ${feedback === "up" ? "bg-brand-100" : "opacity-50 hover:opacity-100"}`}
            >
              👍
            </button>
            <button
              title="Not helpful"
              onClick={() => onFeedback(message._id, feedback === "down" ? null : "down")}
              className={`rounded px-2 py-0.5 ${feedback === "down" ? "bg-red-100" : "opacity-50 hover:opacity-100"}`}
            >
              👎
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
