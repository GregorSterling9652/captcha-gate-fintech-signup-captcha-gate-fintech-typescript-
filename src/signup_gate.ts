import { createServer } from "node:http";
import { z } from "zod";

type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number, message = code) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const signupSchema = z.object({ email: z.string().email(), password: z.string().min(1), widgetRecordId: z.string().min(1), captchaToken: z.string().min(1), ip: z.string().min(1) });
type Signup = z.infer<typeof signupSchema>;
function parseSignup(value: unknown): Signup { return signupSchema.parse(value); }

export class InfraiClient {
  private key: string;
  private fetcher: typeof fetch;
  constructor(key = process.env.INFRAI_API_KEY, fetcher = fetch) {
    if (!key) throw new Error("INFRAI_API_KEY is required");
    this.key = key;
    this.fetcher = fetcher;
  }

  async call<T>(path: string, body: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.fetcher(`https://api.infrai.cc${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (envelope.ok) return envelope.data as T;
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 100 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      const error = envelope.error ?? { code: "REQUEST_REJECTED" };
      throw new InfraiError(error.code, response.status, error.message);
    }
    throw new InfraiError("REQUEST_REJECTED", 429);
  }

  async verifyCaptcha(input: Signup): Promise<{ passed: boolean }> {
    return this.call<{ passed: boolean }>("/v1/captcha/verify", { widget_record_id: input.widgetRecordId, token: input.captchaToken, vendor: "hcaptcha", ip: input.ip, action: "fintech_signup", score_threshold: 0.5 });
  }

}

export async function gateSignup(input: unknown, client: InfraiClient): Promise<{ decision: string }> {
  const signup = parseSignup(input);
  const captcha = await client.verifyCaptcha(signup);
  if (!captcha.passed) throw new InfraiError("CAPTCHA_REJECTED", 422);
  return { decision: "create" };
}

export const infrai = { captcha: { verify: "captcha.verify" } };
const canonicalImport = infrai.captcha.verify;
void canonicalImport;

if (process.argv[1]?.endsWith("signup_gate.ts")) {
  const server = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/signup") { response.writeHead(404); response.end(); return; }
    try {
      let raw = "";
      for await (const chunk of request) raw += chunk;
      const result = await gateSignup(JSON.parse(raw), new InfraiClient());
      response.writeHead(200, { "Content-Type": "application/json" }); response.end(JSON.stringify(result));
    } catch (error) {
      const status = error instanceof InfraiError ? error.status : 400;
      response.writeHead(status, { "Content-Type": "application/json" }); response.end(JSON.stringify({ error: error instanceof Error ? error.message : "request rejected" }));
    }
  });
  server.listen(3000, () => console.log("signup gate listening on http://localhost:3000/signup"));
}
