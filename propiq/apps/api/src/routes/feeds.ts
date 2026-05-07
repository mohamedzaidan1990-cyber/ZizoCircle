import { Router } from "express";
import { prisma } from "../db/prisma";
import { env } from "../lib/env";
import { Errors } from "../lib/errors";
import { tenantSchemaExists } from "../db/tenant";
import { buildBayutFeed, buildPropertyFinderFeed } from "../services/feeds";

export const feedsRouter = Router();

async function resolveAgency(slug: string) {
  if (!slug || !/^[a-z0-9_]{3,40}$/.test(slug)) {
    throw Errors.notFound("Agency not found");
  }
  const agency = await prisma.agency.findUnique({ where: { slug } });
  if (!agency || !agency.isActive) {
    throw Errors.notFound("Agency not found");
  }
  if (!(await tenantSchemaExists(slug))) {
    throw Errors.notFound("Agency feed not provisioned");
  }
  return agency;
}

function sendXml(res: import("express").Response, xml: string) {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  // Crawlers can cache for 5 minutes — listings don't change every second.
  res.setHeader("Cache-Control", "public, max-age=300");
  res.send(xml);
}

feedsRouter.get("/:slug/bayut.xml", async (req, res, next) => {
  try {
    const agency = await resolveAgency(req.params.slug);
    const xml = await buildBayutFeed(
      agency.slug,
      agency.name,
      env.BACKEND_URL,
    );
    sendXml(res, xml);
  } catch (err) {
    next(err);
  }
});

feedsRouter.get("/:slug/property-finder.xml", async (req, res, next) => {
  try {
    const agency = await resolveAgency(req.params.slug);
    const xml = await buildPropertyFinderFeed(
      agency.slug,
      agency.name,
      env.BACKEND_URL,
    );
    sendXml(res, xml);
  } catch (err) {
    next(err);
  }
});
