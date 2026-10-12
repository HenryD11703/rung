import Groq from "groq-sdk";

/**
 * Groq retires models over time (llama-3.3-70b-versatile no longer exists),
 * so the model is configurable. Override it with the GROQ_MODEL env var.
 */
export const DEFAULT_MODEL = "openai/gpt-oss-120b";

export class LlmUnavailableError extends Error {
  constructor(reason = "The AI mentor is not configured on this server.") {
    super(reason);
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
  const model = process.env.GROQ_MODEL ?? DEFAULT_MODEL;

  try {
    const completion = await getClient().chat.completions.create({
      model,
      messages,
      temperature: 0.2,
      // gpt-oss models spend part of the budget on reasoning, so leave headroom.
      max_tokens: 700,
      response_format: { type: "json_object" },
      ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" as const } : {}),
    });
    return completion.choices[0]?.message?.content ?? "";
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 404 || status === 401) {
      // Misconfiguration, not a transient failure. Say so in the server log.
      console.error(
        status === 404
          ? `[review] Groq model "${model}" was not found. Set GROQ_MODEL to a current model.`
          : "[review] Groq rejected the API key. Check GROQ_API_KEY.",
      );
      throw new LlmUnavailableError("The AI mentor is misconfigured.");
    }
    throw error;
  }
}
