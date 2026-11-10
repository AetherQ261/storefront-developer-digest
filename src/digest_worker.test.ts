import assert from "node:assert/strict";
import { buildEvent } from "./digest_worker.js";

const valid = buildEvent.parse({ storefront: "checkout-theme", event: "release", summary: "Theme v4 published", occurredAt: "2026-09-12T01:00:00.000Z" });
assert.equal(valid.event, "release");
assert.throws(() => buildEvent.parse({ storefront: "checkout-theme", event: "other", summary: "x", occurredAt: "2026-09-12T01:00:00.000Z" }));
console.log("digest event boundary: valid release accepted, unknown event rejected");
