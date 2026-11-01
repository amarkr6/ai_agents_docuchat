/**
 * FILE: models/Chat.ts
 * PURPOSE: Stores chat conversations and their messages ("chats" collection).
 *
 * One Chat = one conversation (like one thread in the ChatGPT sidebar).
 * Messages are embedded inside the chat document because they are always
 * read together with the chat.
 */
import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/** A source the AI used to answer, e.g. [1] = "Policy.pdf, page 3". */
const citationSchema = new Schema(
  {
    index: { type: Number, required: true }, // the [n] number shown in the answer
    documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true },
    fileName: { type: String, required: true },
    pageNumber: { type: Number, default: null },
    chunkIndex: { type: Number, required: true },
    score: { type: Number, required: true }, // similarity score (0..1, higher = closer)
    snippet: { type: String, required: true }, // short preview of the chunk text
    usedInAnswer: { type: Boolean, default: false }, // did the AI actually cite [n]?
  },
  { _id: false },
);

const messageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    citations: { type: [citationSchema], default: [] },
  },
  { timestamps: true }, // gives every message its own createdAt
);

const chatSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "New chat" },
    // Optional: restrict this chat to specific documents (empty = all accessible docs)
    documentIds: [{ type: Schema.Types.ObjectId, ref: "Document" }],
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true },
);

export type ChatFields = InferSchemaType<typeof chatSchema>;
export type ChatDoc = HydratedDocument<ChatFields>;

export const Chat = model("Chat", chatSchema);
