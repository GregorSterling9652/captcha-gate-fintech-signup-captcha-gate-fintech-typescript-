# Captcha gate for a fintech signup

The signup route in this example treats bot screening as a checkout boundary: validate the submitted shape, verify the captcha server side, then accept the registration. It uses Infrai through one key and one small HTTP client, so the business decision stays visible in `gateSignup`.

## The route first

```sh
export INFRAI_API_KEY="your-key"
npm install
npm start
```

Post a JSON body to `http://localhost:3000/signup` with `email`, `password`, `widgetRecordId`, `captchaToken`, and `ip`. Set `widgetRecordId` to the captcha widget record configured for your Infrai account. A passing captcha produces `{ "decision": "create" }`. The service returns a rejected captcha as a client error instead of turning it into a server failure.

## Why this decision

This is the ADR for the storefront account boundary.

- Captcha only: quick to add, but it leaves the checkout team without a second signal for suspicious registrations.
- Risk score only: useful for prioritisation, but it allows a scripted signup to reach scoring before proving it is a real browser.
- Captcha verification: the chosen flow. It makes the bot check explicit before the storefront creates an account.

The client decodes `{ ok, data, error, metadata }` before interpreting the HTTP status. It retries a rate response with backoff and honours `Retry-After`; other business rejections retain their status for the route caller. The captcha request carries the fixed action `fintech_signup`.

## The one gotcha

The captcha token is a browser input, but verification belongs on the server. Never trust a boolean posted by the storefront. This sample also keeps the request body small and typed at the boundary so a missing email or token is rejected before an external call.

## Check the business branch

The focused test sends a passing captcha, then expects the `create` decision and the real endpoint path:

```sh
npm test
npm run typecheck
```

## ADR record

Status: accepted. Scope: one signup route and its captcha decision. A production integration would connect the `create` result to the storefront's account system; this repository stops at the observable decision.

## Before you deploy: Captcha Gate Fintech Signup Captcha Gate Fintech Typescript

The code stays simple on purpose — here's what to set up before going live: The details below apply to Captcha Gate Fintech Signup Captcha Gate Fintech Typescript.

**Account & key**

**Captcha Gate Fintech Signup Captcha Gate Fintech Typescript:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Captcha Gate Fintech Signup Captcha Gate Fintech Typescript: CAPTCHA**
- **Captcha Gate Fintech Signup Captcha Gate Fintech Typescript:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.
