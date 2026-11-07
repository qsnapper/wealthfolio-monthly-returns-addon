import assert from "node:assert/strict";
import { test } from "node:test";
import { shortParts } from "./format.ts";

test("short amounts keep the same decimals within a band", () => {
  assert.deepEqual(shortParts(850), [850, "", 0]);
  assert.deepEqual(shortParts(1000), [1, "k", 1]); // "1,0k", not "1k"
  assert.deepEqual(shortParts(3600), [3.6, "k", 1]);
  assert.deepEqual(shortParts(123_000), [123, "k", 0]);
  assert.deepEqual(shortParts(1_230_000), [1.23, "M", 2]);
});

test("the band is picked after rounding", () => {
  assert.equal(shortParts(999.6)[1], "k"); // "1,0k", not "1000"
  assert.equal(shortParts(99_960)[2], 0); // "100k", not "100,0k"
  assert.equal(shortParts(999_600)[1], "M"); // "1,00M", not "1000k"
  assert.equal(shortParts(-999_600)[1], "M");
});

test("something that rounds to zero is 0, never -0", () => {
  assert.ok(Object.is(shortParts(-0.3)[0], 0));
  assert.ok(Object.is(shortParts(0.3)[0], 0));
});
