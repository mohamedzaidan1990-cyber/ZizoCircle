import type { JwtPayload } from "@propiq/shared";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      tenantSchema?: string;
    }
  }
}

export {};
