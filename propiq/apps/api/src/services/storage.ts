import { mkdir, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../lib/env";

export interface StorageService {
  /** Saves a buffer and returns a URL relative to the API host. */
  save(folder: string, originalName: string, mime: string, buffer: Buffer): Promise<string>;
  /** Removes a previously saved file by its URL. */
  remove(url: string): Promise<void>;
}

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function safeExt(originalName: string, mime: string): string {
  const ext = extname(originalName).toLowerCase();
  if (ext && /^\.[a-z0-9]{2,5}$/.test(ext)) return ext;
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return ".bin";
}

class LocalStorage implements StorageService {
  private root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  async save(folder: string, originalName: string, mime: string, buffer: Buffer) {
    const dir = join(this.root, folder);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}${safeExt(originalName, mime)}`;
    await writeFile(join(dir, filename), buffer);
    // URL served by express.static at /uploads
    return `/uploads/${folder}/${filename}`;
  }

  async remove(url: string) {
    if (!url.startsWith("/uploads/")) return;
    const relative = url.replace(/^\/uploads\//, "");
    const full = join(this.root, relative);
    // Confine to root
    if (!resolve(full).startsWith(this.root)) return;
    try {
      await unlink(full);
    } catch {
      // best-effort delete
    }
  }
}

class AzureStorage implements StorageService {
  // Production swap target. Implementation lives here so the only file that
  // changes between local and Azure is this one (per the build prompt).
  async save(): Promise<string> {
    throw new Error(
      "Azure storage not implemented. Set STORAGE_TYPE=local for development.",
    );
  }
  async remove(): Promise<void> {
    throw new Error(
      "Azure storage not implemented. Set STORAGE_TYPE=local for development.",
    );
  }
}

let cached: StorageService | null = null;
export function storage(): StorageService {
  if (cached) return cached;
  cached =
    env.STORAGE_TYPE === "azure"
      ? new AzureStorage()
      : new LocalStorage(env.LOCAL_STORAGE_PATH);
  return cached;
}

export function isAllowedImageMime(mime: string): boolean {
  return ALLOWED_IMAGE_MIME.has(mime);
}

export function localUploadsRoot(): string {
  return resolve(env.LOCAL_STORAGE_PATH);
}
