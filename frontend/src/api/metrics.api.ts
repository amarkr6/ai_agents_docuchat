/**
 * FILE: api/metrics.api.ts
 * PURPOSE: Functions that call the backend /api/metrics endpoints.
 */
import { api } from "./client";
import type { ApiResponse, EvalCase, EvalResult, MetricsSummary } from "../types";

export async function getMetricsSummaryApi() {
  const response = await api.get<ApiResponse<MetricsSummary>>("/metrics/summary");
  return response.data.data;
}

export async function runEvaluationApi(cases: EvalCase[], topK: number) {
  const response = await api.post<ApiResponse<EvalResult>>("/metrics/evaluate", { cases, topK });
  return response.data.data;
}
