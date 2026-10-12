"use server";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/server";
import { createError, createSuccess } from "@/lib/utils";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { revalidatePath } from "next/cache";
import { NextApiRequest, NextApiResponse } from "next";

async function uploadDocument(
  title: string,
  date: string,
  chunks: string[],
  type: "tip_and_cue" | "report" | "flag_response" | "other",
  id?: string
) {
  const supabase = createClient();
  const doc_id = id ?? uuidv4();
  const metadata = {
    title,
    date,
    doc_id,
    type,
  };

  // Insert the document metadata to the documents table (for future tracking and deletion)
  const { error: documentInsertError } = await supabase
    .from("documents")
    .insert(metadata);
  if (documentInsertError) return createError(documentInsertError.message);

  const embeddings = await Promise.all(
    chunks.map(async (chunk) => {
      // Embed the chunk using OpenAI's embedding API
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-ada-002"),
        value: chunk,
      });

      const chunk_id = uuidv4();

      // Add metadata to the chunk
      const chunk_with_metadata = {
        ...metadata,
        text: chunk,
        chunk_id,
      };

      // Return a new entry to insert into the database
      return {
        doc_id,
        chunk_id,
        chunk: JSON.stringify(chunk_with_metadata),
        embedding: JSON.stringify(embedding),
        date,
        title,
      };
    })
  );

  // Insert all embeddings into the database
  const { error: embeddingInsertError } = await supabase
    .from("chunks")
    .insert(embeddings);

  if (embeddingInsertError) return createError(embeddingInsertError.message);

  revalidatePath("/admin/documents");

  return createSuccess(
    "Document uploaded and embeddings inserted successfully"
  );
}

// API route handler for POST method
export async function POST(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { title, date, chunks, type, id } = await req.json();

  if (!title || !date || !chunks || !type) {
    return new Response("Missing required fields", { status: 400 });
  }

  const result = await uploadDocument(title, date, chunks, type, id);

  if (result.error) {
    return new Response(result.error, { status: 500 });
  }

  return new Response("Document uploaded successfully", { status: 200 });
}
