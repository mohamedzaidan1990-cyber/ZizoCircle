import { createClient } from "@/lib/supabase/server";

export const STORAGE = {
  stagePhotos: "forge-stage-photos",
  issuePhotos: "forge-issue-photos",
  scopePdfs: "forge-scope-pdfs",
  invoicePdfs: "forge-invoice-pdfs",
  avatars: "forge-avatars",
} as const;

export type Bucket = (typeof STORAGE)[keyof typeof STORAGE];

export async function uploadFile(
  bucket: Bucket,
  path: string,
  file: File
): Promise<{ path: string }> {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return { path };
}

export async function signUrl(
  bucket: Bucket,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function signMany(
  bucket: Bucket,
  paths: string[],
  expiresIn = 3600
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, expiresIn);
  if (error || !data) return {};
  return Object.fromEntries(
    data
      .filter((d) => d.path && d.signedUrl)
      .map((d) => [d.path as string, d.signedUrl as string])
  );
}

export function buildStagePhotoPath(
  orderId: string,
  stageId: string,
  filename: string
) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${orderId}/${stageId}/${Date.now()}-${safe}`;
}

export function buildIssuePhotoPath(orderId: string, filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${orderId}/${Date.now()}-${safe}`;
}
