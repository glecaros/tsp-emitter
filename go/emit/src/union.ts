import { Optional, stripIndent } from "./common.js";

interface UnionVariantInfo {
  name: string;
  doc: Optional<string>;
  value: string;
}

export function emitUnion(
  name: string,
  doc: Optional<string>,
  type: string,
  variants: UnionVariantInfo[],
): string {
  return stripIndent`
      ${doc !== undefined ? `// ${name} ${doc}` : ""}
      type ${name} ${type}

      const (${variants
        .map((v) =>
          v.doc !== undefined
            ? `
        // ${v.name} ${v.doc}`
            : "" +
              `
        ${v.name} ${name} = ${v.value}`,
        )
        .join("")}
      )


      func (f *${name}) UnmarshalJSON(data []byte) error {
         var v ${type}
         if err := json.Unmarshal(data, &v); err != nil {
           return err
         }
         *f = ${name}(v)
         return nil
       }


      func (f ${name}) MarshalJSON() ([]byte, error) {
        return json.Marshal(f)
      }`;
}
