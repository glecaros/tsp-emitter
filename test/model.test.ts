import { describe, expect, it } from "vitest";
import { baseGetTestData, normalizeCode, scopeGetTestData } from "./common.js";
import { emit } from "./test-host.js";

describe("model generation", () => {
  let getTestData = scopeGetTestData("model", baseGetTestData);

  it("handles simple models", async () => {
    const [input, expected] = await getTestData("basic");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });

  it("handles models with duration fields", async () => {
    const [input, expected] = await getTestData("duration");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });

  it("handles models with references to other models", async () => {
    const [input, expected] = await getTestData("references");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });

  it("handles models with constant fields", async () => {
    const [input, expected] = await getTestData("with-constant-fields");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });

  it("handles models with optional fields", async () => {
    const [input, expected] = await getTestData("optional-fields");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });

  it("handles models with union fields", async () => {
    const [input, expected] = await getTestData("with-union-field");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });

  it("handles models with anonymous union fields", async () => {
    const [input, expected] = await getTestData("with-anonymous-union-field");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });

  it("handles models with constant fields (union variant)", async () => {
    const [input, expected] = await getTestData("with-constant-field-enum");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });

  it("handles models with anonymous model fields", async () => {
    const [input, expected] = await getTestData("with-anonymous-model-field");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });

  it("handles models with array of scalar fields", async () => {
    const [input, expected] = await getTestData("with-array-scalar-field");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });

  it("handles models with array of model fields", async () => {
    const [input, expected] = await getTestData("with-array-model-field");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });

  it("handles models with array of discriminated union fields", async () => {
    const [input, expected] = await getTestData("with-array-discriminated-union-field");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });

  it("handles models with array of enum-like union fields (anonymous)", async () => {
    const [input, expected] = await getTestData("with-array-anonymous-value-union");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });

  it("handles models that inherit from other models", async () => {
    const [input, expected] = await getTestData("inheritance");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });

  it("handles models that inherit from other models that override fields from their parents", async () => {
    const [input, expected] = await getTestData("inheritance-override");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });

  it("handles inheritance-based unions", async () => {
    const [input, expected] = await getTestData("inheritance-discriminator");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });

  it("handles inheritance-based unions and their use", async () => {
    const [input, expected] = await getTestData("inheritance-discriminator-use");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });

  it("handles nullable fields (scalar)", async () => {
    const [input, expected] = await getTestData("nullable-field-scalar");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });

  it("handles nullable fields (value )", async () => {
    const [input, expected] = await getTestData("nullable-field-value-union");
    const results = await emit(input);
    expect(normalizeCode(results["modeltest/models.go"])).toBe(normalizeCode(expected));
  });
});
