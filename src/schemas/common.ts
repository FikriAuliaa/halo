import { z } from "zod";
import { normalizePhone } from "@/lib/format";
import { ORDER_REF_PATTERN } from "@/lib/id";
import { AppError } from "@/lib/errors";

/**
 * Shared primitive schemas, imported by both client-side form validation
 * (for UX) and server-side enforcement (for correctness) — one definition
 * per concept, per AGENTS.md. Messages are Indonesian so client and server
 * produce identical text (B049).
 */

export const phoneSchema = z
  .string()
  .min(1, "Nomor WhatsApp wajib diisi")
  .transform((value, ctx) => {
    try {
      return normalizePhone(value);
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message: error instanceof AppError ? error.message : "Nomor WhatsApp tidak valid",
      });
      return z.NEVER;
    }
  });

export const emailSchema = z.string().min(1, "Email wajib diisi").email("Format email tidak valid");

export const fullNameSchema = z
  .string()
  .min(2, "Nama harus terdiri dari minimal 2 karakter")
  .max(100, "Nama tidak boleh lebih dari 100 karakter")
  .trim();

export const orderRefSchema = z.string().regex(ORDER_REF_PATTERN, "Kode pemesanan tidak valid");

export const trackingTokenSchema = z.string().min(1, "Token pelacakan wajib diisi");

export const numberIdSchema = z
  .string()
  .regex(/^08\d{8,11}$/, "Nomor harus 10-13 digit dan diawali 08");

export const packageIdSchema = z.string().regex(/^pkg_\d+gb$/, "ID paket tidak valid");
