import { anthropic, CLAUDE_MODEL, extractText } from "./anthropic";
import { getContact } from "./contacts";
import { Errors } from "../lib/errors";
import { detectBudgetLeakage, describeIssues } from "./ai/guardrails";

export type ReactivationChannel = "WHATSAPP" | "EMAIL";

export interface ReactivationMessage {
  channel: ReactivationChannel;
  language: "EN" | "AR";
  subject: string | null;
  body: string;
}

const REACTIVATION_SYSTEM = `You are a senior real-estate agent in Doha, Qatar writing brief re-engagement messages to dormant leads on behalf of a colleague.

You receive: the contact's profile (name, contact type, budget, preferred areas, last note), the channel (WHATSAPP or EMAIL), and the language (EN or AR).

Write ONE short re-engagement message:
- WHATSAPP: 2-4 sentences, conversational, no greeting boilerplate beyond "Hi {firstName}". No subject.
- EMAIL: 3-5 sentences, slightly more formal, with a one-line subject under 60 characters.
- AR language: write in Modern Standard Arabic, RTL-friendly punctuation, polite tone.
- Reference one or two specifics from their profile (preferred area, budget range, or property type) so the message feels personal — but don't quote raw budget figures.
- Open with a soft check-in, mention you came across new listings that match their criteria, ask if they'd like to see options.
- No emoji. No "I noticed you went silent" guilt-tripping. No mention that they're a "dead lead".

Output ONLY a JSON object matching:
{ "subject": string | null, "body": string }

For WHATSAPP, "subject" must be null. For EMAIL, "subject" must be a non-empty string.

No preamble, no markdown, no code fences.`;

export async function generateReactivationMessage(
  slug: string,
  contactId: string,
  channel: ReactivationChannel,
): Promise<ReactivationMessage> {
  const contact = await getContact(slug, contactId);

  const language: "EN" | "AR" =
    contact.firstNameAr || contact.lastNameAr ? "AR" : "EN";

  const profile = {
    firstName:
      language === "AR" && contact.firstNameAr
        ? contact.firstNameAr
        : contact.firstName,
    lastName:
      language === "AR" && contact.lastNameAr
        ? contact.lastNameAr
        : contact.lastName,
    contactType: contact.contactType,
    pipelineType: contact.pipelineType,
    nationality: contact.nationality,
    budget:
      contact.budgetMin || contact.budgetMax
        ? {
            min: contact.budgetMin,
            max: contact.budgetMax,
            currency: contact.currency,
          }
        : null,
    bedrooms:
      contact.bedroomsMin || contact.bedroomsMax
        ? { min: contact.bedroomsMin, max: contact.bedroomsMax }
        : null,
    preferredAreas: contact.preferredAreas,
    propertyTypes: contact.propertyTypes,
    notesPreview: contact.notes ? contact.notes.slice(0, 300) : null,
  };

  const client = anthropic();
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 800,
    system: [
      {
        type: "text",
        text: REACTIVATION_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Channel: ${channel}\nLanguage: ${language}\nProfile:\n${JSON.stringify(profile, null, 2)}\n\nWrite the re-engagement message.`,
      },
    ],
  });

  const text = extractText(response.content);
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: { subject?: string | null; body?: string };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw Errors.ai("Could not parse AI reactivation response");
  }

  const body = String(parsed.body ?? "").trim();
  if (!body) throw Errors.ai("AI returned an empty message body");

  const subject =
    channel === "EMAIL"
      ? String(parsed.subject ?? "").trim() || "Following up on your property search"
      : null;

  // Guardrail: the message must NOT quote the contact's exact budget figures.
  // The prompt forbids it; this layer enforces it before the message is
  // shown to the agent.
  const fullText = `${subject ?? ""}\n${body}`;
  const leakage = detectBudgetLeakage(fullText, {
    min: contact.budgetMin,
    max: contact.budgetMax,
  });
  if (leakage.length > 0) {
    throw Errors.ai(
      `Re-engagement message quoted the contact's budget: ${describeIssues(leakage)}. Regenerate.`,
    );
  }

  return { channel, language, subject, body };
}
