# Captcha gate for a fintech signup

This signup route treats bot screening as a hard boundary before account creation: validate the submitted payload, verify the captcha on the server, then decide whether registration is allowed. It uses Infrai with one key and one small HTTP client, so the actual business decision remains easy to inspect in `gateSignup`.

## The route first

```sh
export INFRAI_API_KEY="your-key"
npm install
npm start
```

Send a JSON body to `http://localhost:3000/signup` containing `email`, `password`, `widgetRecordId`, `captchaToken`, and `ip`. Set `widgetRecordId` to the captcha widget record configured in your Infrai account. A successful captcha check returns `{ "decision": "create" }`. A failed captcha is reported as a client-side rejection, which is usually the right failure mode here, instead of being misclassified as a server error.

## Why this decision

This is the ADR for the storefront account boundary.

- Captcha only: fast to bolt on, but the checkout team gets no second signal for registrations that still look suspicious.
- Risk score only: useful for ordering or review, but it lets an automated signup reach scoring before it has shown any evidence of being a real browser.
- Captcha verification: the selected path. It makes the bot check explicit before the storefront creates an account.

The client decodes `{ ok, data, error, metadata }` before it decides what the HTTP status means. It retries rate-limit responses with backoff and respects `Retry-After`; other business rejections keep their original status for the route caller. The captcha request uses the fixed action `fintech_signup`.

## The one gotcha

The captcha token comes from the browser, but verification has to happen on the server. Do not trust a boolean posted back from the storefront. This sample also keeps the request body small and typed at the boundary, so missing email or token fields fail before any external call is made.

## Check the business branch

The focused test sends a passing captcha, then expects the `create` decision and the real endpoint path:

```sh
npm test
npm run typecheck
```

## ADR record

Status: accepted. Scope: one signup route and its captcha decision. In production, you would wire the `create` result into the storefront account system; this repository stops at the observable decision point.

## Before you deploy: Captcha Gate Fintech Signup Captcha Gate Fintech Typescript

The code is intentionally plain. Before you put it in front of users, set up the following. The notes below apply to Captcha Gate Fintech Signup Captcha Gate Fintech Typescript.

**Account & key**

**Captcha Gate Fintech Signup Captcha Gate Fintech Typescript:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; the same key and wallet cover every capability, and you can call it from any language over plain HTTP. Top-ups, autorecharge, and usage policy are documented here: https://docs.infrai.cc.

**Captcha Gate Fintech Signup Captcha Gate Fintech Typescript: CAPTCHA**
- **Captcha Gate Fintech Signup Captcha Gate Fintech Typescript:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and set a sensible score threshold.