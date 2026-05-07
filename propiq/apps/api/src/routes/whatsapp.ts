import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireTenant } from "../middleware/tenant";
import { validate } from "../middleware/validate";
import { created, ok } from "../lib/response";
import { sendWhatsAppText, whatsappConfigured } from "../services/whatsapp";
import { getContact } from "../services/contacts";
import { getTemplate } from "../services/templates";
import { renderTemplate } from "../services/email";
import { createActivity } from "../services/activities";
import { Errors } from "../lib/errors";

export const whatsappRouter = Router();
whatsappRouter.use(requireAuth, requireTenant);

whatsappRouter.get("/status", (_req, res) => {
  ok(res, { configured: whatsappConfigured() });
});

const sendSchema = z.object({
  contactId: z.string().uuid(),
  body: z.string().min(1).max(4096).optional(),
  templateId: z.string().uuid().optional(),
});

whatsappRouter.post("/send", validate(sendSchema), async (req, res, next) => {
  try {
    const contact = await getContact(req.user!.agencySlug, req.body.contactId);
    if (!contact.phone) {
      throw Errors.validation("Contact has no phone number");
    }

    let body = req.body.body;
    if (req.body.templateId) {
      const template = await getTemplate(
        req.user!.agencySlug,
        req.body.templateId,
      );
      if (template.channel !== "WHATSAPP" && template.channel !== "SMS") {
        throw Errors.validation("Template channel must be WHATSAPP or SMS");
      }
      body = renderTemplate(template.bodyEn, {
        firstName: contact.firstName,
        lastName: contact.lastName ?? "",
        phone: contact.phone,
        email: contact.email ?? "",
      });
    }
    if (!body) {
      throw Errors.validation("Either body or templateId is required");
    }

    const sent = await sendWhatsAppText({ to: contact.phone, body });

    const activity = await createActivity(req.user!.agencySlug, {
      activityType: "WHATSAPP",
      direction: "OUTBOUND",
      subject: body.slice(0, 80),
      body,
      status: sent.delivered ? "SENT" : "DRAFT",
      contactId: contact.id,
      createdBy: req.user!.userId,
    });

    created(res, {
      messageId: sent.messageId,
      delivered: sent.delivered,
      activity,
    });
  } catch (err) {
    next(err);
  }
});
