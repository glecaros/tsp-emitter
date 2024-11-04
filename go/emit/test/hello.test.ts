import { emit } from "./test-host.js";
import { describe, expect, it } from "vitest";

function normalizeCode(code: string): string {
  return code
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => line.trimEnd())
    .map((line) => line.trimStart())
    .join("\n");
}

describe("scalar union generation", () => {
  it("emit string based unions that don't specify the base type", async () => {
    const results = await emit(`
      namespace mynamespace;

      union TestUnion {
        variant1: "Value1",
        variant2: "Value2",
      }`);
    expect(normalizeCode(results["mynamespace/models.go"])).toBe(
      normalizeCode(`
      package mynamespace;

      import "encoding/json"

      // This file is generated by the typespec compiler. Do not edit.

      type TestUnion string

      const (
        variant1 TestUnion = "Value1"
        variant2 TestUnion = "Value2"
      )

      func (f *TestUnion) UnmarshalJSON(data []byte) error {
         var v string
         if err := json.Unmarshal(data, &v); err != nil {
           return err
         }
         *f = TestUnion(v)
         return nil

        }

      func (f TestUnion) MarshalJSON() ([]byte, error) {

        return json.Marshal(f)
      }
        `),
    );
  });

  it("emit string based unions that specify the base type", async () => {
    const results = await emit(`
      namespace mynamespace;

      union TestUnion {
        string,
        variant1: "Value1",
        variant2: "Value2",
      }`);
    expect(normalizeCode(results["mynamespace/models.go"])).toBe(
      normalizeCode(`
      package mynamespace;

      import "encoding/json"

      // This file is generated by the typespec compiler. Do not edit.

      type TestUnion string

      const (
        variant1 TestUnion = "Value1"
        variant2 TestUnion = "Value2"
      )

      func (f *TestUnion) UnmarshalJSON(data []byte) error {
         var v string
         if err := json.Unmarshal(data, &v); err != nil {
           return err
         }
         *f = TestUnion(v)
         return nil

        }

      func (f TestUnion) MarshalJSON() ([]byte, error) {

        return json.Marshal(f)
      }
        `),
    );
  });
});
