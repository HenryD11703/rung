import { TtlCache } from "./cache";
import type { Feedback } from "./schema";

/** Shared by the route handler and the tests. */
export const reviewCache = new TtlCache<Feedback>();
