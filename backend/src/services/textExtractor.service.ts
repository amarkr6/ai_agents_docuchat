/**
 * FILE: services/textExtractor.service.ts
 * PURPOSE: Read an uploaded file and return its plain text, page by page.
 *
 * Supported formats:
 *   .pdf   -> "unpdf"   (keeps page numbers, so citations can say "page 3")
 *   .docx  -> "mammoth" (Word has no fixed pages, so pageNumber = null)
 *   .txt / .md -> read the buffer as UTF-8 text
 */
import path from "node:path";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { AppError } from "../utils/AppError.js";

/** Text of one page (or the whole file when it has no pages). */
export interface ExtractedPage {
  pageNumber: number | null;
  text: string;
}

/** Removes extra spaces/blank lines that PDFs often contain. */
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ") // many spaces -> one space
    .replace(/\n{3,}/g, "\n\n") // many blank lines -> one blank line
    .trim();
}

async function extractFromPdf(buffer: Buffer): Promise<ExtractedPage[]> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  // mergePages: false -> returns an array with one string per page
  const { text } = await extractText(pdf, { mergePages: false });
  return text.map((pageText, i) => ({ pageNumber: i + 1, text: cleanText(pageText) }));
}

async function extractFromDocx(buffer: Buffer): Promise<ExtractedPage[]> {
  const result = await mammoth.extractRawText({ buffer });
  return [{ pageNumber: null, text: cleanText(result.value) }];
}

function extractFromPlainText(buffer: Buffer): ExtractedPage[] {
  return [{ pageNumber: null, text: cleanText(buffer.toString("utf-8")) }];
}

/**
 * Main function: picks the right extractor based on the file extension.
 * Throws if the file contains no readable text (e.g. a scanned image PDF).
 */
export async function extractTextFromFile(buffer: Buffer, fileName: string): Promise<ExtractedPage[]> {
  const extension = path.extname(fileName).toLowerCase();

  let pages: ExtractedPage[];
  switch (extension) {
    case ".pdf":
      pages = await extractFromPdf(buffer);
      break;
    case ".docx":
      pages = await extractFromDocx(buffer);
      break;
    case ".txt":
    case ".md":
      pages = extractFromPlainText(buffer);
      break;
    default:
      throw new AppError(`Unsupported file type: ${extension}`, 400);
  }

  // Drop empty pages (cover pages, images…)
  const nonEmpty = pages.filter((page) => page.text.length > 0);
  if (nonEmpty.length === 0) {
    throw new AppError("No readable text found. Scanned/image-only PDFs need OCR first.", 422);
  }
  return nonEmpty;
}
