import { withTenant } from "../db/tenant";
import { Errors } from "../lib/errors";
import { buildInsert, rowsToCamel, rowToCamel } from "../lib/sql";
import { getQueue, QUEUE_NAMES } from "./queue";
import { getContact } from "./contacts";

export interface SequenceStep {
  templateId: string;
  delayHours: number;
}

export interface Sequence {
  id: string;
  name: string;
  triggerType: string | null;
  steps: SequenceStep[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export async function listSequences(slug: string): Promise<Sequence[]> {
  const result = await withTenant(slug, (client) =>
    client.query(`SELECT * FROM sequences ORDER BY created_at DESC`),
  );
  return rowsToCamel<Sequence>(result.rows);
}

export async function createSequence(
  slug: string,
  input: {
    name: string;
    triggerType?: string | null;
    steps: SequenceStep[];
    isActive?: boolean;
    createdBy: string;
  },
): Promise<Sequence> {
  if (!Array.isArray(input.steps) || input.steps.length === 0) {
    throw Errors.validation("A sequence must have at least one step");
  }
  const data = {
    name: input.name,
    triggerType: input.triggerType ?? null,
    steps: JSON.stringify(input.steps),
    isActive: input.isActive ?? true,
    createdBy: input.createdBy,
  };
  const { columns, placeholders, values } = buildInsert(data);
  const result = await withTenant(slug, (client) =>
    client.query(
      `INSERT INTO sequences (${columns}) VALUES (${placeholders}) RETURNING *`,
      values,
    ),
  );
  return rowToCamel<Sequence>(result.rows[0]);
}

export async function deleteSequence(
  slug: string,
  id: string,
): Promise<void> {
  const result = await withTenant(slug, (client) =>
    client.query(`DELETE FROM sequences WHERE id = $1`, [id]),
  );
  if (result.rowCount === 0) throw Errors.notFound("Sequence not found");
}

export interface EmailSequenceJobData {
  agencySlug: string;
  contactId: string;
  sequenceId: string;
  stepIndex: number;
}

/** Enqueues a contact onto a sequence — schedules the first step now, subsequent steps via the worker. */
export async function enqueueSequence(
  slug: string,
  sequenceId: string,
  contactId: string,
): Promise<{ enqueued: number }> {
  // Validate sequence + contact exist before enqueueing.
  const seqRes = await withTenant(slug, (client) =>
    client.query(`SELECT * FROM sequences WHERE id = $1 AND is_active = true`, [
      sequenceId,
    ]),
  );
  if (!seqRes.rows[0]) throw Errors.notFound("Sequence not found or inactive");
  await getContact(slug, contactId);

  const queue = getQueue(QUEUE_NAMES.emailSequence);
  await queue.add(
    "step",
    {
      agencySlug: slug,
      contactId,
      sequenceId,
      stepIndex: 0,
    } satisfies EmailSequenceJobData,
    {
      removeOnComplete: 1000,
      removeOnFail: 500,
    },
  );
  return { enqueued: 1 };
}
