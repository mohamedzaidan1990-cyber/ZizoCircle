import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env";
import { Errors } from "../lib/errors";

let cached: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw Errors.ai("ANTHROPIC_API_KEY is not configured");
  }
  if (cached) return cached;
  cached = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return cached;
}

export const CLAUDE_MODEL = "claude-opus-4-7";

export function extractText(
  blocks: Array<{ type: string; text?: string }>,
): string {
  return blocks
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text!)
    .join("\n")
    .trim();
}
