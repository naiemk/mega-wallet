import type { EventLogPort, LedgerEvent } from "@mega-wallet/core";
import { JsonlEventLog } from "./jsonl.js";

export interface S3EventLogConfig {
  bucket: string;
  key: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

/** Dual-write: local JSONL (fsync) plus optional S3/R2 upload. */
export class DualEventLog implements EventLogPort {
  constructor(
    private readonly jsonl: JsonlEventLog,
    private readonly s3?: S3EventLog,
  ) {}

  async append(event: LedgerEvent): Promise<void> {
    await this.jsonl.append(event);
    if (this.s3) await this.s3.append(event);
  }

  async listAll(): Promise<LedgerEvent[]> {
    return this.jsonl.listAll();
  }

  async listSince(since: Date): Promise<LedgerEvent[]> {
    return this.jsonl.listSince(since);
  }
}

export class S3EventLog implements EventLogPort {
  private buffer: LedgerEvent[] = [];

  constructor(private readonly config: S3EventLogConfig) {}

  async append(event: LedgerEvent): Promise<void> {
    this.buffer.push(event);
    await this.flush();
  }

  private async flush() {
    if (this.buffer.length === 0) return;
    const body = this.buffer
      .map((e) => JSON.stringify({ ...e, createdAt: e.createdAt.toISOString() }))
      .join("\n");
    const endpoint = this.config.endpoint ?? `https://${this.config.bucket}.s3.${this.config.region ?? "auto"}.amazonaws.com`;
    const url = `${endpoint}/${this.config.key}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/x-ndjson",
    };
    if (this.config.accessKeyId && this.config.secretAccessKey) {
      headers.Authorization = `Bearer ${this.config.accessKeyId}:${this.config.secretAccessKey}`;
    }
    try {
      await fetch(url, { method: "PUT", headers, body });
    } catch {
      // S3 upload is best-effort; JSONL remains source of truth
    }
  }

  async listAll(): Promise<LedgerEvent[]> {
    return [...this.buffer];
  }

  async listSince(since: Date): Promise<LedgerEvent[]> {
    return this.buffer.filter((e) => e.createdAt >= since);
  }
}

export function createEventLog(jsonlPath: string, s3Config?: S3EventLogConfig): EventLogPort {
  const jsonl = new JsonlEventLog(jsonlPath);
  if (!s3Config?.bucket) return jsonl;
  return new DualEventLog(jsonl, new S3EventLog(s3Config));
}
