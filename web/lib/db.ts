import "server-only";
import { ExecuteStatementCommand, RDSDataClient, type SqlParameter } from "@aws-sdk/client-rds-data";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { BUCKET, DB, REGION } from "./config";

// Credentials come from the default AWS chain: env vars locally (see `npm run dev:aws`), the Amplify compute role in the cloud.
const rds = new RDSDataClient({ region: REGION });
const s3 = new S3Client({ region: REGION });

type Row = Record<string, any>;

function param(name: string, value: unknown): SqlParameter {
  if (value === null || value === undefined) return { name, value: { isNull: true } };
  if (typeof value === "number") return Number.isInteger(value) ? { name, value: { longValue: value } } : { name, value: { doubleValue: value } };
  if (typeof value === "boolean") return { name, value: { booleanValue: value } };
  return { name, value: { stringValue: String(value) } };
}

export async function sql(statement: string, params: Record<string, unknown> = {}): Promise<Row[]> {
  const res = await rds.send(new ExecuteStatementCommand({
    ...DB, sql: statement, formatRecordsAs: "JSON",
    parameters: Object.entries(params).map(([k, v]) => param(k, v)),
  }));
  return res.formattedRecords ? JSON.parse(res.formattedRecords) : [];
}

/** JSON columns come back as strings through the Data API. */
export function json<T = any>(v: unknown, fallback: T): T {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v !== "string") return v as T;
  try { return JSON.parse(v) as T; } catch { return fallback; }
}

export async function s3Json<T = any>(key: string): Promise<T | null> {
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    return JSON.parse(await obj.Body!.transformToString()) as T;
  } catch {
    return null;
  }
}
