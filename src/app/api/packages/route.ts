import { createHandler } from "@/server/framework/handler";
import { getPackages } from "@/server/operations/get-packages";

/** `GET /api/packages` (API_SPEC.md, B075). No auth, cached at the edge. */
export const GET = createHandler({}, async () => getPackages());
