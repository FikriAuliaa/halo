import { createHandler } from "@/server/framework/handler";
import { getUniversities } from "@/server/operations/get-universities";

/** `GET /api/universities` (API_SPEC.md, B078). No auth. */
export const GET = createHandler({}, async () => getUniversities());
