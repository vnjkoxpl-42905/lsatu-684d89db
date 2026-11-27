import assert from "node:assert/strict";
import manifest from "../../../.lovable/mcp/manifest.json" with { type: "json" };

const issuer = "https://atrcqxpmqrynmtvvyjju.supabase.co/auth/v1";
const endpoint = "https://atrcqxpmqrynmtvvyjju.supabase.co/functions/v1/mcp";
const fixtureActor = "00000000-0000-4000-8000-000000000001";
const fixtureStudent = "00000000-0000-4000-8000-000000000002";
const jwksUri = issuer + "/.well-known/jwks.json";
const fixtureDatabase = "https://lsatu-mcp-fixture.invalid";

function base64Url(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

Deno.test("deployed MCP bundle serves the committed catalog and enforces OAuth", async () => {
  const signingKey = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", signingKey.publicKey);
  const validUntil = Math.floor(Date.now() / 1000) + 300;
  const header = base64Url(JSON.stringify({ typ: "JWT", alg: "ES256", kid: "mcp-protocol-fixture" }));

  async function tokenFor(audience: string, subject = fixtureActor): Promise<string> {
    const payload = base64Url(JSON.stringify({ iss: issuer, aud: audience, sub: subject, exp: validUntil, client_id: "fixture-oauth-client" }));
    const signed = header + "." + payload;
    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" }, signingKey.privateKey, new TextEncoder().encode(signed),
    );
    return signed + "." + base64Url(new Uint8Array(signature));
  }

  const originalFetch = globalThis.fetch;
  const originalServe = Deno.serve;
  const fixtureEnv = { SUPABASE_URL: fixtureDatabase, SUPABASE_PUBLISHABLE_KEY: "local-fixture-key" };
  const originalEnv = Object.keys(fixtureEnv).map((key) => [key, Deno.env.get(key)] as const);
  for (const [key, value] of Object.entries(fixtureEnv)) Deno.env.set(key, value);
  let handler: ((request: Request) => Response | Promise<Response>) | undefined;
  Object.defineProperty(Deno, "serve", { configurable: true, value: (next: typeof handler) => { handler = next; } });
  globalThis.fetch = (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.includes("/.well-known/oauth-authorization-server/auth/v1")) {
      return Promise.resolve(Response.json({ issuer, jwks_uri: jwksUri }));
    }
    if (url === jwksUri) {
      return Promise.resolve(Response.json({ keys: [{ ...jwk, kid: "mcp-protocol-fixture", alg: "ES256", use: "sig" }] }));
    }
    if (url.startsWith(fixtureDatabase + "/rest/v1/")) {
      const parsed = new URL(url);
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      assert.match(headers.get("Authorization") ?? "", /^Bearer ey/);
      if (parsed.pathname.endsWith("/user_roles")) {
        const isAdmin = parsed.searchParams.get("user_id") === "eq." + fixtureActor;
        return Promise.resolve(Response.json(isAdmin ? [{ role: "admin" }] : []));
      }
      if (parsed.pathname.endsWith("/profiles")) {
        assert.equal(parsed.searchParams.get("class_id"), "eq." + fixtureActor);
        return Promise.resolve(Response.json([{ class_id: fixtureActor, display_name: "Fixture teacher" }]));
      }
    }
    return Promise.reject(new Error("Unexpected network request in MCP protocol fixture: " + url));
  };

  try {
    await import("../mcp/index.ts");
    assert.ok(handler);
    const metadata = await handler(new Request(endpoint + "/.well-known/oauth-protected-resource"));
    assert.equal(metadata.status, 200);
    const protectedResource = await metadata.json();
    assert.equal(protectedResource.resource, endpoint);
    assert.deepEqual(protectedResource.authorization_servers, [issuer]);
    assert.equal(manifest.path, new URL(endpoint).pathname);
    assert.equal(manifest.auth.issuer, issuer);

    const listUrl = endpoint + "/.mcp/list-tools";
    const unauthenticated = await handler(new Request(listUrl));
    assert.equal(unauthenticated.status, 401);
    const wrongAudience = await handler(new Request(listUrl, {
      headers: { Authorization: "Bearer " + await tokenFor("wrong-audience") },
    }));
    assert.equal(wrongAudience.status, 401);

    const authorization = "Bearer " + await tokenFor("authenticated");
    const liveCatalog = await handler(new Request(listUrl, { headers: { Authorization: authorization } }));
    assert.equal(liveCatalog.status, 200);
    assert.deepEqual(await liveCatalog.json(), manifest.mcp);

    const legacy = [
      "echo", "get_my_profile", "list_my_homework", "list_my_classroom_items",
      "find_students", "post_classroom_note", "assign_passage_map_homework",
      "get_assignment_status", "list_students", "list_homework_sets", "assign_homework", "send_note",
    ];
    const teaching = [
      "search_teaching_catalog", "preview_teaching_assignment", "assign_teaching_work",
      "list_inbox_conversations", "read_inbox_thread", "reply_inbox_thread",
    ];
    const tools = new Map(manifest.mcp.tools.map((tool) => [tool.name, tool]));
    for (const name of [...legacy, ...teaching]) assert.ok(tools.has(name), name);
    assert.equal(tools.get("preview_teaching_assignment")?.annotations.readOnlyHint, true);
    assert.equal(tools.get("read_inbox_thread")?.annotations.readOnlyHint, true);
    assert.equal(tools.get("assign_teaching_work")?.annotations.idempotentHint, true);
    assert.equal(tools.get("reply_inbox_thread")?.annotations.idempotentHint, true);

    const initialize = await handler(new Request(endpoint, {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "initialize",
        params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "fixture", version: "1" } },
      }),
    }));
    assert.equal(initialize.status, 200);
    const body = await initialize.text();
    const payload = JSON.parse(body.startsWith("{") ? body : body.split("\n").find((line) => line.startsWith("data: "))!.slice(6));
    assert.equal(payload.result.serverInfo.version, manifest.mcp.server.version);
    assert.equal(payload.result.capabilities.events, undefined);

    async function call(name: string, args: object, authHeader: string) {
      const response = await handler!(new Request(endpoint, {
        method: "POST",
        headers: {
          Authorization: authHeader, "Content-Type": "application/json",
          Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2025-03-26",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name, arguments: args } }),
      }));
      assert.equal(response.status, 200);
      const text = await response.text();
      const event = text.split("\n").find((line) => line.startsWith("data: "));
      return JSON.parse(event ? event.slice(6) : text).result;
    }

    const profile = await call("get_my_profile", {}, authorization);
    assert.equal(profile.structuredContent.profile.class_id, fixtureActor);
    const sectionQuery = { item: { kind: "prep_test_section", prep_test: 150, section_type: "LR" } };
    const catalog = await call("search_teaching_catalog", sectionQuery, authorization);
    assert.deepEqual(catalog.structuredContent.items.map(
      (item: { id: string; section_type: string; question_count: number; standard_minutes: number }) =>
        [item.id, item.section_type, item.question_count, item.standard_minutes],
    ), [["PT150.S2", "LR", 25, 35], ["PT150.S3", "LR", 25, 35]]);
    const asStudent = "Bearer " + await tokenFor("authenticated", fixtureStudent);
    assert.equal((await call("search_teaching_catalog", sectionQuery, asStudent)).isError, true);
  } finally {
    globalThis.fetch = originalFetch;
    Object.defineProperty(Deno, "serve", { configurable: true, value: originalServe });
    for (const [key, value] of originalEnv) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
});
