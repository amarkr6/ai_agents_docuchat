/**
 * FILE: config/env.ts
 * PURPOSE: Load and validate all environment variables in ONE place.
 *
 * Why? If a required variable (like MONGODB_URI) is missing, we want the app
 * to crash immediately at startup with a clear message — not later with a
 * confusing error deep inside some request.
 *
 * We use Node 24's built-in `process.loadEnvFile()` to read the .env file
 * (no "dotenv" package needed) and "zod" to validate the values.
 *
 * AI PROVIDER: set AI_PROVIDER=gemini (free tier) or AI_PROVIDER=openai.
 * Model names, embedding size and prices get sensible defaults per provider,
 * so usually you only need to set the provider and its API key.
 */
import { z } from "zod";

// Load variables from backend/.env into process.env (if the file exists).
// In production (Render, Railway, Docker…) variables are usually set by the
// platform, so a missing .env file is not an error.
try {
  process.loadEnvFile();
} catch {
  // No .env file found — rely on real environment variables.
}

/** Default settings for each AI provider (used when .env doesn't override them). */
const PROVIDER_DEFAULTS = {
  gemini: {
    chatModel: "gemini-flash-latest", // alias that always points to the newest Gemini Flash
    embeddingModel: "gemini-embedding-001",
    embeddingDimensions: 768,
    // Free tier = $0. If you enable billing on Google AI Studio, put real prices in .env.
    priceChatInputPer1M: 0,
    priceChatOutputPer1M: 0,
    priceEmbeddingPer1M: 0,
  },
  openai: {
    chatModel: "gpt-5-mini",
    embeddingModel: "text-embedding-3-small",
    embeddingDimensions: 1536,
    priceChatInputPer1M: 0.25,
    priceChatOutputPer1M: 2.0,
    priceEmbeddingPer1M: 0.02,
  },
} as const;

// Schema = the "shape" every environment variable must follow.
// z.coerce.number() converts the string "5000" into the number 5000.
const envSchema = z
  .object({
    PORT: z.coerce.number().default(5000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    CLIENT_URL: z.string().default("http://localhost:5173"),

    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
    MONGODB_DB_NAME: z.string().default("rag_doc_chat"),
    VECTOR_INDEX_NAME: z.string().default("chunk_vector_index"),
    // Optional: public DNS servers used to resolve the "mongodb+srv://" address.
    // Fixes "querySrv ECONNREFUSED" when your network/ISP DNS blocks SRV lookups.
    DNS_SERVERS: z.string().optional(),

    JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
    JWT_EXPIRES_IN: z.string().default("1d"),

    // ---- AI provider ----
    AI_PROVIDER: z.enum(["gemini", "openai"]).default("gemini"),
    GOOGLE_API_KEY: z.string().optional(), // needed when AI_PROVIDER=gemini
    OPENAI_API_KEY: z.string().optional(), // needed when AI_PROVIDER=openai
    // Optional overrides (leave empty to use the provider defaults above)
    CHAT_MODEL: z.string().optional(),
    EMBEDDING_MODEL: z.string().optional(),
    EMBEDDING_DIMENSIONS: z.coerce.number().optional(),

    PRICE_CHAT_INPUT_PER_1M: z.coerce.number().optional(),
    PRICE_CHAT_OUTPUT_PER_1M: z.coerce.number().optional(),
    PRICE_EMBEDDING_PER_1M: z.coerce.number().optional(),

    CHUNK_SIZE: z.coerce.number().default(1000),
    CHUNK_OVERLAP: z.coerce.number().default(200),
    TOP_K: z.coerce.number().default(5),
    MAX_UPLOAD_MB: z.coerce.number().default(10),
  })
  // Extra rule: the API key of the CHOSEN provider must be present
  .superRefine((values, ctx) => {
    if (values.AI_PROVIDER === "gemini" && !values.GOOGLE_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["GOOGLE_API_KEY"], message: "GOOGLE_API_KEY is required when AI_PROVIDER=gemini" });
    }
    if (values.AI_PROVIDER === "openai" && !values.OPENAI_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["OPENAI_API_KEY"], message: "OPENAI_API_KEY is required when AI_PROVIDER=openai" });
    }
  });

// Empty values like "CHAT_MODEL=" should count as "not set"
const rawEnv = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ""));
const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
  }
  console.error("👉 Copy backend/.env.example to backend/.env and fill in the values.");
  process.exit(1);
}

const data = parsed.data;
const defaults = PROVIDER_DEFAULTS[data.AI_PROVIDER];

/** Typed, validated config object used everywhere in the backend. */
export const env = {
  ...data,
  isProduction: data.NODE_ENV === "production",
  // "http://a.com,http://b.com" -> ["http://a.com", "http://b.com"]
  clientUrls: data.CLIENT_URL.split(",").map((url) => url.trim()),

  // Final AI settings = value from .env, or the provider default
  chatModel: data.CHAT_MODEL ?? defaults.chatModel,
  embeddingModel: data.EMBEDDING_MODEL ?? defaults.embeddingModel,
  embeddingDimensions: data.EMBEDDING_DIMENSIONS ?? defaults.embeddingDimensions,
  priceChatInputPer1M: data.PRICE_CHAT_INPUT_PER_1M ?? defaults.priceChatInputPer1M,
  priceChatOutputPer1M: data.PRICE_CHAT_OUTPUT_PER_1M ?? defaults.priceChatOutputPer1M,
  priceEmbeddingPer1M: data.PRICE_EMBEDDING_PER_1M ?? defaults.priceEmbeddingPer1M,
};
