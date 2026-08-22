import type postgres from "postgres";
import { sql } from "@/server/db/client";
import type {
  PackagesConfigDoc,
  PaymentConfigDoc,
  SystemConfigDoc,
  UniversitiesConfigDoc,
} from "@/server/db/types";

/** See `audit-log.ts`'s `asJson` — same reasoning. */
function asJson(value: unknown): postgres.JSONValue {
  return value as postgres.JSONValue;
}

/**
 * `config` is read on nearly every request but written rarely, so this
 * repository caches each row with a short TTL and exposes explicit
 * invalidation for admin writes (B050) — a stale price for 30 seconds
 * after an admin edit is an acceptable trade-off against hitting Postgres
 * on every single request for data that almost never changes. One row per
 * key in the `config` table (`key text primary key, value jsonb`),
 * replacing the old `config/{docId}` Firestore documents — the JSONB
 * payload is still Zod-validated in the application layer, same as before.
 */
const CACHE_TTL_MS = 30_000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

type ConfigKey = "payment" | "packages" | "universities" | "system";
type Executor = postgres.Sql | postgres.TransactionSql;

export class ConfigRepository {
  private cache = new Map<string, CacheEntry<unknown>>();

  private async cached<T>(key: ConfigKey, load: () => Promise<T>): Promise<T> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (entry && entry.expiresAt > Date.now()) {
      return entry.value;
    }
    const value = await load();
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  }

  invalidate(key: ConfigKey): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  private async getRow<T>(key: ConfigKey): Promise<T | null> {
    const [row] = await sql<{ value: T; updated_at: Date }[]>`
      select value, updated_at from config where key = ${key}
    `;
    if (!row) return null;
    return { ...row.value, updated_at: row.updated_at } as T;
  }

  /**
   * `tx` is optional but should always be passed by admin write
   * operations that also write an audit log row (ADR-010,
   * `audit-log.ts`'s doc comment: written inside the same transaction as
   * the mutation it describes, never after the fact) — without it, this
   * writes on the module-level pool, a separate statement from whatever
   * transaction the caller thinks it's part of.
   */
  private async setRow<T extends { updated_at: Date }>(
    key: ConfigKey,
    doc: Omit<T, "updated_at">,
    tx?: Executor,
  ): Promise<void> {
    const db = tx ?? sql;
    await db`
      insert into config (key, value, updated_at)
      values (${key}, ${db.json(asJson({ ...doc }))}, now())
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `;
    this.invalidate(key);
  }

  async getPayment(): Promise<PaymentConfigDoc | null> {
    return this.cached("payment", () => this.getRow<PaymentConfigDoc>("payment"));
  }

  async setPayment(doc: Omit<PaymentConfigDoc, "updated_at">, tx?: Executor): Promise<void> {
    await this.setRow<PaymentConfigDoc>("payment", doc, tx);
  }

  async getPackages(): Promise<PackagesConfigDoc | null> {
    return this.cached("packages", () => this.getRow<PackagesConfigDoc>("packages"));
  }

  async setPackages(doc: Omit<PackagesConfigDoc, "updated_at">, tx?: Executor): Promise<void> {
    await this.setRow<PackagesConfigDoc>("packages", doc, tx);
  }

  async getUniversities(): Promise<UniversitiesConfigDoc | null> {
    return this.cached("universities", () => this.getRow<UniversitiesConfigDoc>("universities"));
  }

  async setUniversities(
    doc: Omit<UniversitiesConfigDoc, "updated_at">,
    tx?: Executor,
  ): Promise<void> {
    await this.setRow<UniversitiesConfigDoc>("universities", doc, tx);
  }

  async getSystem(): Promise<SystemConfigDoc | null> {
    return this.cached("system", () => this.getRow<SystemConfigDoc>("system"));
  }

  async setSystem(doc: Omit<SystemConfigDoc, "updated_at">, tx?: Executor): Promise<void> {
    await this.setRow<SystemConfigDoc>("system", doc, tx);
  }
}

/** One process-wide instance — the cache is only useful if shared. */
export const configRepository = new ConfigRepository();
