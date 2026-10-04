import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { paystackRequest, paystackRequestWithMeta, PaystackError } from "../src/lib/shop/paystack.server.ts";

const SECRET = "sk_test_" + "f".repeat(40);
const realFetch = globalThis.fetch;
let calls = [];

function stubFetch(impl) {
  calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return impl(url, init);
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

async function rejectsWith(promise, status, check) {
  await assert.rejects(promise, (err) => {
    assert.ok(err instanceof PaystackError);
    assert.equal(err.status, status);
    if (check) check(err);
    return true;
  });
}

test("success returns data; sends bearer + JSON body to api.paystack.co", async () => {
  stubFetch(() => jsonResponse({ status: true, message: "ok", data: { id: 1 } }));
  const data = await paystackRequest("/subaccount", { method: "POST", secret: SECRET, body: { a: 1 } });
  assert.deepEqual(data, { id: 1 });
  assert.equal(calls[0].url, "https://api.paystack.co/subaccount");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${SECRET}`);
  assert.equal(calls[0].init.body, JSON.stringify({ a: 1 }));
  assert.ok(calls[0].init.signal);
});

test("withMeta returns meta", async () => {
  stubFetch(() => jsonResponse({ status: true, message: "ok", data: [], meta: { next: "abc" } }));
  const r = await paystackRequestWithMeta("/bank?use_cursor=true", { secret: SECRET });
  assert.deepEqual(r, { data: [], meta: { next: "abc" } });
});

test("HTTP error uses Paystack message with sk_/pk_ keys redacted", async () => {
  const leaked = `Invalid key ${SECRET} / pk_live_${"a".repeat(40)}`;
  stubFetch(() => jsonResponse({ status: false, message: leaked }, 401));
  await rejectsWith(paystackRequest("/balance", { secret: SECRET }), 401, (err) => {
    assert.ok(!err.message.includes(SECRET));
    assert.ok(!/[sp]k_(test|live)_/.test(err.message));
    assert.match(err.message, /\[redacted\]/);
  });
});

test("non-JSON 500 response → PaystackError 500 with generic message", async () => {
  stubFetch(() => new Response("<html>Bad gateway</html>", { status: 500 }));
  await rejectsWith(paystackRequest("/balance", { secret: SECRET }), 500, (err) => {
    assert.ok(!err.message.includes("html"));
  });
});

test("status:false on HTTP 200 → PaystackError 502", async () => {
  stubFetch(() => jsonResponse({ status: false, message: "Account number is invalid" }));
  await rejectsWith(paystackRequest("/subaccount", { method: "POST", secret: SECRET, body: {} }), 502, (err) => {
    assert.equal(err.message, "Account number is invalid");
  });
});

test("timeout / abort → 504; network error → 502", async () => {
  stubFetch(() => {
    throw new DOMException("The operation timed out.", "TimeoutError");
  });
  await rejectsWith(paystackRequest("/balance", { secret: SECRET }), 504);
  stubFetch(() => {
    throw new DOMException("aborted", "AbortError");
  });
  await rejectsWith(paystackRequest("/balance", { secret: SECRET }), 504);
  stubFetch(() => {
    throw new TypeError("fetch failed");
  });
  await rejectsWith(paystackRequest("/balance", { secret: SECRET }), 502);
});

test("path guard rejects absolute / protocol-relative / odd paths without fetching", async () => {
  stubFetch(() => jsonResponse({ status: true, data: null }));
  for (const bad of ["https://evil.example/x", "//evil.example/x", "balance", "/x?u=http://evil", "/a\\b", "/a b"]) {
    await rejectsWith(paystackRequest(bad, { secret: SECRET }), 500);
  }
  assert.equal(calls.length, 0);
});

test("missing secret is refused without fetching", async () => {
  stubFetch(() => jsonResponse({ status: true, data: null }));
  await rejectsWith(paystackRequest("/balance", { secret: "" }), 500);
  assert.equal(calls.length, 0);
});
