import assert from "node:assert/strict";
import { describe, it } from "node:test";

import * as json from "./json.ts";

// Note the fact that the type assertions in this test compile is also part of
// the test.

const sampleJsonText = JSON.stringify({
  first: "one",
  second: 2,
  third: true,
  fourth: null,
  fifth: ["three", 4, true],
  sixth: {
    seventh: "five",
    eighth: 6,
  },
});

const isDefined = <Type>(value: Type | undefined): value is Type => {
  return value !== undefined;
};
/**
 * A type asserting helper for checking values are not undefined.
 */
const assertDefined = <Type>(value: Type | undefined): Type => {
  if (isDefined(value)) {
    return value;
  } else {
    assert.fail("unexpected undefined");
  }
};

describe("jsonParse", () => {
  it("can parse", () => {
    const sampleJson: json.Json = json.jsonParse(sampleJsonText);
    assert.equal(json.jsonTypeOf(sampleJson), "object");
    // toJsonObject acquires the correct type if possible, or returns undefined
    const jsonObject: json.JsonObject = assertDefined(
      json.toJsonObject(sampleJson),
    );

    // check that acquiring the wrong type doesn't work
    assert.equal(json.toJsonString(sampleJson), undefined);
    assert.equal(json.toJsonNumber(sampleJson), undefined);
    assert.equal(json.toJsonBoolean(sampleJson), undefined);
    assert.equal(json.toJsonNull(sampleJson), undefined);
    assert.equal(json.toJsonArray(sampleJson), undefined);

    // further checks acquiring the other types
    const jsonString: string = assertDefined(
      json.toJsonString(assertDefined(jsonObject["first"])),
    );
    assert.equal(jsonString, "one");
    assert.equal(json.toJsonObject(jsonString), undefined);
    const jsonNumber: number = assertDefined(
      json.toJsonNumber(assertDefined(jsonObject["second"])),
    );
    assert.equal(jsonNumber, 2);
    const jsonBoolean: boolean = assertDefined(
      json.toJsonBoolean(assertDefined(jsonObject["third"])),
    );
    assert.equal(jsonBoolean, true);
    const jsonNull: null = assertDefined(
      json.toJsonNull(assertDefined(jsonObject["fourth"])),
    );
    assert.equal(jsonNull, null);
    const jsonArray: json.Json[] = assertDefined(
      json.toJsonArray(assertDefined(jsonObject["fifth"])),
    );
    const arrayedJsonString: string = assertDefined(
      json.toJsonString(assertDefined(jsonArray[0])),
    );
    assert.equal(arrayedJsonString, "three");
    const arrayedJsonNumber: number = assertDefined(
      json.toJsonNumber(assertDefined(jsonArray[1])),
    );
    assert.equal(arrayedJsonNumber, 4);
    const arrayedJsonBoolean: boolean = assertDefined(
      json.toJsonBoolean(assertDefined(jsonArray[2])),
    );
    assert.equal(arrayedJsonBoolean, true);
    const jsonSubObject: json.JsonObject = assertDefined(
      json.toJsonObject(assertDefined(jsonObject["sixth"])),
    );
    const fieldJsonString: string = assertDefined(
      json.toJsonString(assertDefined(jsonSubObject["seventh"])),
    );
    assert.equal(fieldJsonString, "five");
    const fieldJsonNumber: number = assertDefined(
      json.toJsonNumber(assertDefined(jsonSubObject["eighth"])),
    );
    assert.equal(fieldJsonNumber, 6);
  });

  it("throws for misparse", () => {
    assert.throws(() => json.jsonParse("{"));
  });
});

describe("jsonTypeOf", () => {
  it("reports correct types", () => {
    assert.equal(json.jsonTypeOf(""), "string");
    assert.equal(json.jsonTypeOf(0), "number");
    assert.equal(json.jsonTypeOf(false), "boolean");
    assert.equal(json.jsonTypeOf(null), "null");
    assert.equal(json.jsonTypeOf([]), "array");
    assert.equal(json.jsonTypeOf({}), "object");
  });
});
