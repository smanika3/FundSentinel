import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { BUCKET, REGION } from "@/lib/config";
import { describe } from "@/lib/errors";

const s3 = new S3Client({ region: REGION });
const SKIP = /(prices|snapshots|allocations|answer_key|\/sec_rr\/)/;

/** Fund files the pipeline can read: CSVs under raw/ in the bucket (large history files left out). */
export async function GET() {
  try {
    const files: { key: string; size: number }[] = [];
    let token: string | undefined;
    do {
      const r = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: "raw/", ContinuationToken: token }));
      for (const o of r.Contents ?? []) if (o.Key!.endsWith(".csv") && !SKIP.test(o.Key!)) files.push({ key: o.Key!, size: o.Size ?? 0 });
      token = r.IsTruncated ? r.NextContinuationToken : undefined;
    } while (token);
    files.sort((a, b) => a.key.localeCompare(b.key));
    return NextResponse.json({ files });
  } catch (e) {
    const d = describe(e);
    return NextResponse.json({ error: d }, { status: d === "login" ? 401 : 500 });
  }
}
