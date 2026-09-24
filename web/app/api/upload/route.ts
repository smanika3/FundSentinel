import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { BUCKET, REGION } from "@/lib/config";
import { describe } from "@/lib/errors";

const s3 = new S3Client({ region: REGION });

/** Upload a CSV (up to ~4 MB) to raw/uploads/ so the pipeline can read it. */
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) return NextResponse.json({ error: "Choose a .csv file." }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "Files over 4 MB: upload to S3 raw/ instead." }, { status: 400 });
  const key = `raw/uploads/${file.name.replace(/[^A-Za-z0-9._-]/g, "_")}`;
  try {
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: Buffer.from(await file.arrayBuffer()), ContentType: "text/csv" }));
    return NextResponse.json({ key });
  } catch (e) {
    const d = describe(e);
    return NextResponse.json({ error: d }, { status: d === "login" ? 401 : 500 });
  }
}
