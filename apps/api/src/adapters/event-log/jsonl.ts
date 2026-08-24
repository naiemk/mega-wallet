import { appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { EventLogPort, LedgerEvent } from "@mega-wallet/core";

export class JsonlEventLog implements EventLogPort {
  constructor(private readonly path: string) {}

  private ensureDir() {
    mkdirSync(dirname(this.path), { recursive: true });
  }

  async append(event: LedgerEvent): Promise<void> {
    this.ensureDir();
    appendFileSync(this.path, `${JSON.stringify({ ...event, createdAt: event.createdAt.toISOString() })}\n`);
  }

  async listAll(): Promise<LedgerEvent[]> {
    if (!existsSync(this.path)) return [];
    return readFileSync(this.path, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const parsed = JSON.parse(line) as LedgerEvent & { createdAt: string };
        return { ...parsed, createdAt: new Date(parsed.createdAt) };
      });
  }

  async listSince(since: Date): Promise<LedgerEvent[]> {
    const all = await this.listAll();
    return all.filter((e) => e.createdAt >= since);
  }
}
