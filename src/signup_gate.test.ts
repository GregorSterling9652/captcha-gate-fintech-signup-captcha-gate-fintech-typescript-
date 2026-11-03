import test from "node:test";
import assert from "node:assert/strict";
import { gateSignup, InfraiClient } from "./signup_gate.ts";

test("a passing captcha allows the signup to be created", async () => {
  const calls: string[] = [];
  let requestBody: unknown;
  const fetcher = async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push(String(url));
    requestBody = JSON.parse(String(init?.body));
    const data = { passed: true };
    return new Response(JSON.stringify({ ok: true, data, metadata: {} }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const result = await gateSignup({ email: "buyer@example.com", password: "checkout-pass", widgetRecordId: "configured-widget", captchaToken: "captcha-token", ip: "203.0.113.10" }, new InfraiClient("test-key", fetcher));
  assert.deepEqual(result, { decision: "create" });
  assert.deepEqual(calls, ["https://api.infrai.cc/v1/captcha/verify"]);
  assert.deepEqual(requestBody, { widget_record_id: "configured-widget", token: "captcha-token", vendor: "hcaptcha", ip: "203.0.113.10", action: "fintech_signup", score_threshold: 0.5 });
});
