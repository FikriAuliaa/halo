import { AppError } from "@/lib/errors";
import { adminForceReleaseSchema } from "@/schemas/admin";
import { ADMIN_PERMISSIONS } from "@/domain/permissions";
import { createHandler } from "@/server/framework/handler";
import {
  adminForceReleaseReservation,
  createAdminForceReleaseDeps,
} from "@/server/operations/admin/force-release";
import { reservationReleased } from "@/server/observability/events";

/** `POST /api/admin/numbers/{id}/force-release` (API_SPEC.md, B068). */
export const POST = createHandler(
  { schema: adminForceReleaseSchema, requireRole: ADMIN_PERMISSIONS.adminForceReleaseReservation },
  async ({ input, params, admin, logger }) => {
    if (!admin) throw new AppError("UNAUTHENTICATED", "Autentikasi diperlukan.");
    const number = params.id!;
    const result = await adminForceReleaseReservation(
      { number, reason: input.reason },
      admin,
      createAdminForceReleaseDeps(),
    );
    if (result.released_session_id) {
      await reservationReleased(logger, {
        number,
        sessionId: result.released_session_id,
        forcedByAdmin: true,
      });
    }
    return result;
  },
);
