import Groq from "groq-sdk";

export class LlmUnavailableError extends Error {
  constructor() {
    super("The AI mentor is not configured on this server.");
    this.name = "LlmUnavailableError";
  }
}

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

let client: Groq | null = null;

/** Lazy on purpose: importing this module must never require the API key. */
function getClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new LlmUnavailableError();
  client ??= new Groq({ apiKey, timeout: 15_000, maxRetries: 1 });
  return client;
}

export async function complete(messages: ChatMessage[]): Promise<string> {
  const completion = await getClient().chat.completions.create({
    model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
    messages,
    temperature: 0.2,
    max_tokens: 450,
    response_format: { type: "json_object" },
  });
  return completion.choices[0]?.message?.content ?? "";
}
