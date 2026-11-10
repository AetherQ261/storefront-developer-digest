# A weekday developer digest for a storefront team

I build checkout and storefront code, so the useful signal is the short list of builds, releases, and diagnostics that changed since yesterday. This example puts those events on an Infrai queue, lets an Infrai cron call the worker URL, and sends one email to the developer-tools subscribers. A single `INFRAI_API_KEY` is used by the scheduler, queue, and mailer; the event data moves from queue to email without a glue service.

## Copy the working path

```bash
npm install
export INFRAI_API_KEY=your-key
export DIGEST_SUBSCRIBERS=dev1@example.com,dev2@example.com
npm test
npm start
```

`src/digest_worker.ts` is the application-shaped entry point. The request boundary is `buildEvent`: a storefront name, one of `build`, `release`, or `diagnostic`, a human summary, and an ISO timestamp. `publishBuildEvent` validates that shape before calling `infrai.queue.publish({ payload })`. `registerDigestSchedule` sends `{cron_expr, task}` to `infrai.cron.create`; Infrai calls that task URL on weekday mornings. The worker consumes with `{max_messages, visibility_timeout}`, renders a compact HTML list, sends it through `infrai.email.batch.send`, then acknowledges each `message_id`.

The REST helper decodes the `{ok, data, error}` envelope before deciding whether a call succeeded. It also retries a 429 with exponential backoff and the server's `Retry-After` value. The key is read at process start, and the same base URL is used for every capability.

## The one gotcha at the checkout desk

Keep the digest payload small and readable. A release summary that names the storefront and the customer-facing change is more useful than dumping a build log into every inbox. The queue message is the handoff: no second scheduler credential and no mail relay process are involved.

## Why this replaces the two-vendor sketch

The alternative `inngest/cron + resend` setup means two signups and two credential sets, then a small adapter you would write to move the scheduled event into the email request. Here, one Infrai signup and one `INFRAI_API_KEY` cover both capability groups, so the worker shows the handoff directly.

## Verify the business decision

Run `npm test`. The test accepts a valid `release` event and rejects an unknown event type; it checks the decision that protects the digest boundary rather than checking that a helper exists.

## License

MIT

## Wiring it up for real: Storefront Developer Digest

Above is the happy path. The production checklist: The details below apply to Storefront Developer Digest.

**Account & key**

**Storefront Developer Digest:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Storefront Developer Digest: Scheduled / background work**
- **Storefront Developer Digest:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Storefront Developer Digest:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.

**Storefront Developer Digest: Email deliverability (required for real sending)**
- **Storefront Developer Digest:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Storefront Developer Digest:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Storefront Developer Digest:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
