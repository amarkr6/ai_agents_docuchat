/**
 * FILE: pages/MetricsPage.tsx
 * PURPOSE: Monitoring dashboard — speed, quality and cost of the RAG system.
 *
 * Part 1: summary cards + recent questions (from the QueryLog collection)
 * Part 2: retrieval evaluation — enter test questions and the document that
 *         SHOULD answer them; the backend reports Hit Rate@K and MRR.
 */
import { useEffect, useState } from "react";
import { getMetricsSummaryApi, runEvaluationApi } from "../api/metrics.api";
import { listDocumentsApi } from "../api/documents.api";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/Spinner";
import type { DocumentItem, EvalCase, EvalResult, MetricsSummary } from "../types";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

const usd = (n: number) => `$${n.toFixed(4)}`;
const ms = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(2)}s` : `${n}ms`);

export function MetricsPage() {
  const { user } = useAuth();
  const canEvaluate = user?.role === "admin" || user?.role === "editor";

  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [error, setError] = useState("");

  // Evaluation form state
  const [cases, setCases] = useState<EvalCase[]>([{ question: "", expectedDocumentId: "" }]);
  const [topK, setTopK] = useState(5);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    getMetricsSummaryApi().then(setSummary).catch((err) => setError(getErrorMessage(err)));
    listDocumentsApi()
      .then((docs) => setDocuments(docs.filter((d) => d.status === "ready")))
      .catch(() => undefined);
  }, []);

  function updateCase(index: number, field: keyof EvalCase, value: string) {
    setCases((current) =>
      current.map((c, i) =>
        i === index ? { ...c, [field]: field === "expectedPage" ? (value ? Number(value) : undefined) : value } : c,
      ),
    );
  }

  async function runEvaluation() {
    const validCases = cases.filter((c) => c.question.trim() && c.expectedDocumentId);
    if (validCases.length === 0) {
      setError("Add at least one question and choose its expected document");
      return;
    }
    setIsEvaluating(true);
    setError("");
    try {
      setEvalResult(await runEvaluationApi(validCases, topK));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsEvaluating(false);
    }
  }

  if (!summary) {
    return (
      <div className="flex h-full items-center justify-center">
        {error ? <p className="text-red-600">{error}</p> : <Spinner />}
      </div>
    );
  }

  const { questions, quality, cost, documents: docStats } = summary;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-8 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Metrics</h1>
          <p className="text-sm text-zinc-500">Showing: {summary.scope}</p>
        </div>

        {/* ---- Speed ---- */}
        <section>
          <h2 className="mb-3 font-semibold">⏱ Response time</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Questions asked" value={String(questions.total)} />
            <StatCard label="Avg total time" value={ms(questions.avgTotalTimeMs)} hint={`slowest ${ms(questions.maxTotalTimeMs)}`} />
            <StatCard label="Avg retrieval" value={ms(questions.avgRetrievalTimeMs)} hint="embed + vector search" />
            <StatCard label="Avg LLM time" value={ms(questions.avgLlmTimeMs)} hint="answer generation" />
          </div>
        </section>

        {/* ---- Quality ---- */}
        <section>
          <h2 className="mb-3 font-semibold">🎯 Retrieval quality</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Avg top similarity" value={`${(quality.avgTopScore * 100).toFixed(1)}%`} hint="best chunk match" />
            <StatCard label="Avg citations used" value={quality.avgCitationsUsed.toFixed(1)} hint="per answer" />
            <StatCard label="Feedback" value={`👍 ${quality.thumbsUp} · 👎 ${quality.thumbsDown}`} />
            <StatCard
              label="Satisfaction"
              value={quality.satisfactionRate === null ? "—" : `${quality.satisfactionRate.toFixed(0)}%`}
              hint="of rated answers"
            />
          </div>
        </section>

        {/* ---- Cost ---- */}
        <section>
          <h2 className="mb-3 font-semibold">💲 Token cost</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Total cost" value={usd(cost.totalCostUsd)} />
            <StatCard label="Question cost" value={usd(cost.queryCostUsd)} hint="LLM + query embeddings" />
            <StatCard label="Indexing cost" value={usd(cost.embeddingCostUsd)} hint={`${docStats.total} docs · ${docStats.totalChunks} chunks`} />
            <StatCard label="Tokens (in / out)" value={`${cost.totalInputTokens} / ${cost.totalOutputTokens}`} />
          </div>
        </section>

        {/* ---- Recent questions ---- */}
        <section>
          <h2 className="mb-3 font-semibold">Recent questions</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Question</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Search</th>
                  <th className="px-3 py-2">LLM</th>
                  <th className="px-3 py-2">Top score</th>
                  <th className="px-3 py-2">Tokens</th>
                  <th className="px-3 py-2">Cost</th>
                  <th className="px-3 py-2">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {summary.recentQueries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-zinc-500">
                      No questions yet
                    </td>
                  </tr>
                )}
                {summary.recentQueries.map((q) => (
                  <tr key={q._id} className="tabular-nums">
                    <td className="max-w-xs truncate px-3 py-2" title={q.question}>{q.question}</td>
                    <td className="px-3 py-2">{ms(q.totalTimeMs)}</td>
                    <td className="px-3 py-2">{ms(q.retrievalTimeMs)}</td>
                    <td className="px-3 py-2">{ms(q.llmTimeMs)}</td>
                    <td className="px-3 py-2">{(q.topScore * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2">{q.inputTokens + q.outputTokens}</td>
                    <td className="px-3 py-2">{usd(q.costUsd)}</td>
                    <td className="px-3 py-2">{q.feedback === "up" ? "👍" : q.feedback === "down" ? "👎" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- Evaluation ---- */}
        {canEvaluate && (
          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="font-semibold">🧪 Retrieval accuracy test</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Write questions you know the answer to, pick the document (and optionally page) that contains the
              answer. We check if search finds it in the top K results.
              <br />
              <b>Hit Rate@K</b> = % of questions where the right document was found. <b>MRR</b> = 1.0 means it was
              always ranked #1.
            </p>

            <div className="mt-4 space-y-2">
              {cases.map((testCase, i) => (
                <div key={i} className="flex flex-wrap gap-2">
                  <input
                    placeholder="Question, e.g. What is the refund period?"
                    value={testCase.question}
                    onChange={(e) => updateCase(i, "question", e.target.value)}
                    className="min-w-60 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                  <select
                    value={testCase.expectedDocumentId}
                    onChange={(e) => updateCase(i, "expectedDocumentId", e.target.value)}
                    className="w-56 rounded-lg border border-zinc-300 px-2 py-2 text-sm"
                  >
                    <option value="">Expected document…</option>
                    {documents.map((doc) => (
                      <option key={doc._id} value={doc._id}>
                        {doc.originalName}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Page (opt.)"
                    type="number"
                    min={1}
                    value={testCase.expectedPage ?? ""}
                    onChange={(e) => updateCase(i, "expectedPage", e.target.value)}
                    className="w-28 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => setCases(cases.filter((_, idx) => idx !== i))}
                    disabled={cases.length === 1}
                    className="px-2 text-zinc-400 hover:text-red-600 disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setCases([...cases, { question: "", expectedDocumentId: "" }])}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
              >
                + Add question
              </button>
              <label className="text-sm">
                Top K{" "}
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="w-16 rounded-lg border border-zinc-300 px-2 py-1"
                />
              </label>
              <button
                onClick={runEvaluation}
                disabled={isEvaluating}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {isEvaluating ? "Running…" : "Run evaluation"}
              </button>
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>

            {evalResult && (
              <div className="mt-5">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <StatCard label={`Hit rate @${evalResult.topK}`} value={`${evalResult.hitRate.toFixed(0)}%`} />
                  <StatCard label="MRR" value={evalResult.mrr.toFixed(3)} />
                  <StatCard label="Avg search time" value={ms(evalResult.avgRetrievalTimeMs)} />
                  <StatCard label="Test cases" value={String(evalResult.totalCases)} />
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {evalResult.results.map((r, i) => (
                    <li key={i}>
                      {r.found ? "✅" : "❌"} {r.question}{" "}
                      <span className="text-zinc-500">
                        {r.found ? `(rank ${r.rank})` : "(not in top K)"} · top score {(r.topScore * 100).toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
