import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodSchema } from "zod";
import { Errors } from "../lib/errors";

type Source = "body" | "query" | "params";

export function validate<T extends ZodSchema>(schema: T, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      // Replace with sanitized/parsed values.
      (req as unknown as Record<Source, unknown>)[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          Errors.validation("Invalid request payload", err.flatten()),
        );
      }
      next(err);
    }
  };
}
