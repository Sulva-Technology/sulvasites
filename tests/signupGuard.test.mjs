import { test } from "node:test";
import assert from "node:assert/strict";

import { canStartSite, evaluateTrialSignup } from "../src/lib/billing/signupGuard.ts";

const prior = (over = {}) => ({ emailTrials: 0, phoneTrials: 0, deviceTrials: 0, businessMatches: 0, ipLastHour: 0, ipLastDay: 0, ...over });

test("hard denials", () => {
  assert.equal(evaluateTrialSignup({ email: null, disposable: false, prior: prior() }).allow, false);
  const disposable = evaluateTrialSignup({ email: "a@mailinator.com", disposable: true, prior: prior() });
  assert.deepEqual([disposable.allow, disposable.status], [false, 400]);
  const reused = evaluateTrialSignup({ email: "a@gmail.com", disposable: false, prior: prior({ emailTrials: 1 }) });
  assert.deepEqual([reused.allow, reused.status], [false, 409]);
  const burst = evaluateTrialSignup({ email: "a@gmail.com", disposable: false, prior: prior({ ipLastHour: 5 }) });
  assert.deepEqual([burst.allow, burst.status], [false, 429]);
});

test("soft signals only flag", () => {
  const r = evaluateTrialSignup({
    email: "a@gmail.com", disposable: false,
    prior: prior({ phoneTrials: 1, deviceTrials: 1, businessMatches: 1, ipLastDay: 1 }),
  });
  assert.equal(r.allow, true);
  assert.deepEqual(r.flags, ["phone_reused", "device_reused", "business_match", "ip_repeat"]);
  assert.deepEqual(evaluateTrialSignup({ email: "a@gmail.com", disposable: false, prior: prior() }), { allow: true, flags: [] });
});

test("one unpaid site per account; only the first site gets a trial", () => {
  assert.deepEqual(canStartSite([]), { ok: true, trial: true });
  assert.deepEqual(canStartSite([{ status: "active" }, { status: "manual" }]), { ok: true, trial: false });
  assert.deepEqual(canStartSite([{ status: "archived" }]), { ok: true, trial: false });
  const blocked = canStartSite([{ status: "active" }, { status: "paused", businessName: "Ada's Kitchen" }]);
  assert.deepEqual(blocked, { ok: false, error: "Activate Ada's Kitchen before adding another site." });
  assert.equal(canStartSite([{ status: "trialing" }]).ok, false);
});
