import { Worker, Job } from "bullmq";
import { QUEUE_NAMES, redisConnection, registerWorker, getQueue } from "../services/queue";
import { withTenant } from "../db/tenant";
import { sendEmail, renderTemplate } from "../services/email";
import { rowToCamel } from "../lib/sql";
import type { EmailSequenceJobData, Sequence } from "../services/sequences";
import type { Template } from "../services/templates";
import type { Contact } from "@propiq/shared";
import { createActivity } from "../services/activities";

interface QueueLogger {
  log(message: string): void;
}

async function runStep(
  data: EmailSequenceJobData,
  logger: QueueLogger,
): Promise<void> {
  const { agencySlug, contactId, sequenceId, stepIndex } = data;

  const seqRow = await withTenant(agencySlug, (client) =>
    client.query(`SELECT * FROM sequences WHERE id = $1`, [sequenceId]),
  );
  if (!seqRow.rows[0]) {
    logger.log(`sequence ${sequenceId} no longer exists; aborting`);
    return;
  }
  const sequence = rowToCamel<Sequence>(seqRow.rows[0]);
  if (!sequence.isActive) {
    logger.log(`sequence ${sequenceId} is inactive; aborting`);
    return;
  }
  const step = sequence.steps[stepIndex];
  if (!step) {
    logger.log(`stepIndex ${stepIndex} out of range; sequence complete`);
    return;
  }

  const contactRow = await withTenant(agencySlug, (client) =>
    client.query(`SELECT * FROM contacts WHERE id = $1`, [contactId]),
  );
  if (!contactRow.rows[0]) {
    logger.log(`contact ${contactId} no longer exists; aborting`);
    return;
  }
  const contact = rowToCamel<Contact>(contactRow.rows[0]);
  if (contact.isArchived) {
    logger.log(`contact ${contactId} is archived; skipping`);
    return;
  }
  if (!contact.email) {
    logger.log(`contact ${contactId} has no email; skipping`);
    return;
  }

  const tplRow = await withTenant(agencySlug, (client) =>
    client.query(`SELECT * FROM templates WHERE id = $1`, [step.templateId]),
  );
  if (!tplRow.rows[0]) {
    logger.log(`template ${step.templateId} not found; aborting step`);
    return;
  }
  const template = rowToCamel<Template>(tplRow.rows[0]);
  if (template.channel !== "EMAIL") {
    logger.log(`template ${template.id} is not EMAIL channel; aborting step`);
    return;
  }

  const vars = {
    firstName: contact.firstName,
    lastName: contact.lastName ?? "",
    email: contact.email,
    phone: contact.phone,
    nationality: contact.nationality ?? "",
  };
  const subject = template.subject
    ? renderTemplate(template.subject, vars)
    : `Following up on your property search`;
  const html = renderTemplate(template.bodyEn, vars).replace(/\n/g, "<br/>");

  const sent = await sendEmail({
    to: contact.email,
    subject,
    html,
    text: renderTemplate(template.bodyEn, vars),
  });

  // Log the send as an activity on the contact.
  await createActivity(agencySlug, {
    activityType: "EMAIL",
    direction: "OUTBOUND",
    subject,
    body: renderTemplate(template.bodyEn, vars),
    status: "SENT",
    contactId,
    createdBy: "sequence",
  });

  logger.log(
    `sent step ${stepIndex} (${template.name}) to ${contact.email} — ${sent.messageId}`,
  );

  // Schedule the next step.
  const nextIndex = stepIndex + 1;
  if (sequence.steps[nextIndex]) {
    const delayMs = Math.max(1, sequence.steps[nextIndex].delayHours) * 3600 * 1000;
    await getQueue(QUEUE_NAMES.emailSequence).add(
      "step",
      {
        agencySlug,
        contactId,
        sequenceId,
        stepIndex: nextIndex,
      } satisfies EmailSequenceJobData,
      {
        delay: delayMs,
        removeOnComplete: 1000,
        removeOnFail: 500,
      },
    );
    logger.log(
      `scheduled next step ${nextIndex} in ${sequence.steps[nextIndex].delayHours}h`,
    );
  }
}

export function startEmailSequenceWorker(): Worker {
  const worker = new Worker<EmailSequenceJobData>(
    QUEUE_NAMES.emailSequence,
    async (job: Job<EmailSequenceJobData>) => {
      await runStep(job.data, {
        log: (message: string) => {
          // eslint-disable-next-line no-console
          console.log(`[email-sequence ${job.id}] ${message}`);
        },
      });
    },
    {
      connection: redisConnection,
      concurrency: 4,
    },
  );

  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(`[email-sequence ${job?.id ?? "?"}] failed:`, err.message);
  });

  registerWorker(worker);
  return worker;
}
