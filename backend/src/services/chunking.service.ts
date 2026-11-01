/**
 * FILE: services/chunking.service.ts
 * PURPOSE: Split page text into small overlapping chunks using LangChain.
 *
 * Why chunk?
 *   - The AI has a limited context window, and sending whole documents is expensive.
 *   - Small chunks give more precise search results.
 *
 * Why overlap? (e.g. 200 characters)
 *   - If an important sentence is cut at the end of chunk 1, it also appears at
 *     the start of chunk 2, so its meaning is not lost.
 *
 * RecursiveCharacterTextSplitter tries to split on paragraphs first, then
 * lines, then sentences, then words — so chunks break at natural places.
 */
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { env } from "../config/env.js";
import type { ExtractedPage } from "./textExtractor.service.js";

export interface TextChunk {
  text: string;
  pageNumber: number | null;
  chunkIndex: number;
}

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: env.CHUNK_SIZE,
  chunkOverlap: env.CHUNK_OVERLAP,
});

/** Splits every page into chunks while remembering which page each chunk came from. */
export async function splitPagesIntoChunks(pages: ExtractedPage[]): Promise<TextChunk[]> {
  const chunks: TextChunk[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const pieces = await splitter.splitText(page.text);
    for (const piece of pieces) {
      chunks.push({ text: piece, pageNumber: page.pageNumber, chunkIndex });
      chunkIndex++;
    }
  }

  return chunks;
}
