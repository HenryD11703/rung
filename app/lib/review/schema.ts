import { z } from "zod";

export const LIMITS = {
  /** Hard cap for the raw request body. */
  maxBodyChars: 60_000,
  maxFiles: 8,
  maxPathChars: 80,
  maxFileChars: 12_000,
  /** What actually goes into the prompt, per file. */
  promptFileChars: 6_000,
} as const;

export const ReviewRequestSchema = z.object({
  slug: z.string().min(1).max(64),
  files: z
    .record(z.string().min(1).max(LIMITS.maxPathChars), z.string().max(LIMITS.maxFileChars))
    .refine((files) => {
      const count = Object.keys(files).length;
      return count >= 1 && count <= LIMITS.maxFiles;
    }, "Between 1 and 8 files are allowed"),
  /** Ids of runtime checks that failed in the browser (they cannot run here). */
  runtimeFailed: z.array(z.string().max(64)).max(20).optional(),
});

export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;

const text = (max: number) =>
  z
    .string()
    .transform((value) => value.trim().slice(0, max))
    .pipe(z.string().min(1));

/** What the model must return. Anything else is rejected. */
export const FeedbackSchema = z.object({
  summary: text(280),
  strengths: z.array(text(300)).max(3).default([]),
  fixes: z.array(text(420)).max(3).default([]),
  nextStep: z.string().transform((v) => v.trim().slice(0, 280)).default(""),
});

export type Feedback = z.infer<typeof FeedbackSchema>;

export interface ReviewResponse {
  feedback: Feedback;
  /** Check ids the server considered failed when it built the prompt. */
  failed: string[];
  cached: boolean;
}

export type ReviewErrorCode =
  | "forbidden_origin"
  | "payload_too_large"
  | "invalid_json"
  | "invalid_request"
  | "unknown_exercise"
  | "unknown_file"
  | "syntax_error"
  | "no_changes"
  | "rate_limited"
  | "unavailable"
  | "upstream_error";

export interface ReviewError {
  error: {
    code: ReviewErrorCode;
    message: string;
    retryAfterSeconds?: number;
    issues?: { file: string; message: string; line: number }[];
  };
}
