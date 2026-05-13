import { signMany, type Bucket } from "@/lib/storage";

export async function PhotoGrid({
  bucket,
  paths,
  emptyLabel = "No photos",
}: {
  bucket: Bucket;
  paths: string[];
  emptyLabel?: string;
}) {
  if (!paths.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  const urls = await signMany(bucket, paths);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {paths.map((p) => {
        const url = urls[p];
        if (!url) {
          return (
            <div
              key={p}
              className="flex aspect-square items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground"
            >
              unavailable
            </div>
          );
        }
        return (
          <a key={p} href={url} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="stage photo"
              className="aspect-square w-full rounded-md border object-cover"
            />
          </a>
        );
      })}
    </div>
  );
}
