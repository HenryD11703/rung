import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create } };
  },
}));

import { DEFAULT_MODEL, LlmUnavailableError, complete } from "@/lib/review/llm";

const messages = [{ role: "user" as const, content: "hi" }];

beforeEach(() => {
  create.mockReset();
  process.env.GROQ_API_KEY = "test-key";
  delete process.env.GROQ_MODEL;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("llm wrapper", () => {
  it("is unavailable without an API key", async () => {
    delete process.env.GROQ_API_KEY;
    await expect(complete(messages)).rejects.toBeInstanceOf(LlmUnavailableError);
  });

  it("uses the default model with low reasoning effort for gpt-oss", async () => {
    create.mockResolvedValue({ choices: [{ message: { content: "{}" } }] });
    await complete(messages);
    expect(create.mock.calls[0][0]).toMatchObject({
      model: DEFAULT_MODEL,
      reasoning_effort: "low",
      response_format: { type: "json_object" },
    });
  });

  it("honours GROQ_MODEL and does not send reasoning_effort to other models", async () => {
    process.env.GROQ_MODEL = "some/other-model";
    create.mockResolvedValue({ choices: [{ message: { content: "{}" } }] });
    await complete(messages);
    const args = create.mock.calls[0][0];
    expect(args.model).toBe("some/other-model");
    expect(args).not.toHaveProperty("reasoning_effort");
  });

  it("reports a retired model as a misconfiguration, not a transient error", async () => {
    create.mockRejectedValue(Object.assign(new Error("model_not_found"), { status: 404 }));
    await expect(complete(messages)).rejects.toBeInstanceOf(LlmUnavailableError);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("GROQ_MODEL"));
  });

  it("reports a rejected key as a misconfiguration", async () => {
    create.mockRejectedValue(Object.assign(new Error("bad key"), { status: 401 }));
    await expect(complete(messages)).rejects.toBeInstanceOf(LlmUnavailableError);
  });

  it("lets transient errors through so the route returns 502", async () => {
    create.mockRejectedValue(Object.assign(new Error("boom"), { status: 500 }));
    await expect(complete(messages)).rejects.not.toBeInstanceOf(LlmUnavailableError);
  });
});
