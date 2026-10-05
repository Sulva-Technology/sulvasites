import { test } from "node:test";
import assert from "node:assert/strict";
import { canInvite, canRemove, postLoginRoute, tabsForRole, isUuid, isEmailExistsError } from "../src/lib/siteAccess.ts";

test("postLoginRoute", () => {
  assert.equal(postLoginRoute({ isAdmin: true, mustChangePassword: true, memberships: [] }), "/change-password");
  assert.equal(postLoginRoute({ isAdmin: true, mustChangePassword: false, memberships: [] }), "/admin/sites");
  assert.equal(postLoginRoute({ isAdmin: false, mustChangePassword: false, memberships: [{ siteId: "a", role: "staff" }] }), "/dashboard/a");
  assert.equal(postLoginRoute({ isAdmin: false, mustChangePassword: false, memberships: [{ siteId: "a", role: "owner" }, { siteId: "b", role: "staff" }] }), "/dashboard");
  assert.equal(postLoginRoute({ isAdmin: false, mustChangePassword: false, memberships: [] }), "/no-access");
});

test("tabsForRole", () => {
  assert.deepEqual(tabsForRole("owner"), ["overview", "content", "inbox", "business", "team"]);
  assert.deepEqual(tabsForRole("admin"), ["overview", "content", "inbox", "business", "team"]);
  assert.deepEqual(tabsForRole("staff"), ["overview", "inbox", "business"]);
});

test("tabsForRole with shop", () => {
  assert.deepEqual(tabsForRole("owner", { shop: true }), ["overview", "content", "shop", "inbox", "business", "team"]);
  assert.deepEqual(tabsForRole("admin", { shop: true }), ["overview", "content", "shop", "inbox", "business", "team"]);
  assert.deepEqual(tabsForRole("staff", { shop: true }), ["overview", "shop", "inbox", "business"]);
  assert.deepEqual(tabsForRole("staff", { shop: false }), ["overview", "inbox", "business"]);
});

test("canInvite", () => {
  assert.equal(canInvite("admin", "owner"), true);
  assert.equal(canInvite("owner", "staff"), true);
  assert.equal(canInvite("owner", "owner"), false);
  assert.equal(canInvite("staff", "staff"), false);
});

test("canRemove", () => {
  assert.deepEqual(canRemove("owner", { role: "staff", userId: "s" }, { actorId: "o", ownerCount: 1 }), { ok: true });
  assert.equal(canRemove("owner", { role: "owner", userId: "o2" }, { actorId: "o", ownerCount: 2 }).ok, false);
  assert.equal(canRemove("staff", { role: "staff", userId: "s" }, { actorId: "x", ownerCount: 1 }).ok, false);
  assert.equal(canRemove("admin", { role: "owner", userId: "o" }, { actorId: "a", ownerCount: 1 }).ok, false);
  assert.deepEqual(canRemove("admin", { role: "owner", userId: "o" }, { actorId: "a", ownerCount: 2 }), { ok: true });
});

test("isUuid", () => {
  assert.equal(isUuid("0b5a1c2e-1111-4222-8333-444455556666"), true);
  assert.equal(isUuid("not-a-uuid"), false);
  assert.equal(isUuid("1; drop table sites"), false);
  assert.equal(isUuid(undefined), false);
});

test("isEmailExistsError", () => {
  assert.equal(isEmailExistsError({ code: "email_exists" }), true);
  assert.equal(isEmailExistsError({ message: "A user with this email address has already been registered" }), true);
  assert.equal(isEmailExistsError({ code: "weak_password", message: "Password too short" }), false);
  assert.equal(isEmailExistsError(null), false);
});
