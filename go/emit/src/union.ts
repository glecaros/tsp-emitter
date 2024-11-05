import { Optional, stripIndent } from "./common.js";

function emitUnion(
  name: string,
  doc: Optional<string>,
  type: string,
  variants: UnionVariantDef[],
): string {
    const variantName = (v: UnionVariantDef) => {
        return `${name}${v.goName}`;
    }
  return stripIndent`
      ${doc !== undefined ? `// ${name} ${doc}` : ""}
      type ${name} ${type}

      const (${variants
        .map((v) =>
          v.doc !== undefined
            ? `
        // ${variantName(v)} ${v.doc}`
            : "" +
              `
        ${variantName(v)} ${name} = ${v.value}`,
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


export interface UnionVariantDef {
    name: string;
    goName: string;
    doc: Optional<string>;
    value: string;
  }

  export class UnionSymbol {
    public readonly kind: "union" = "union";
    public type: Optional<string> = undefined;
    public readonly variants: UnionVariantDef[] = [];

    public constructor(
      public name: string,
      public goName: Optional<string>,
      public doc: Optional<string>,
      public anonymous: boolean,
    ) {}

    emit(): string {
      if (this.type === undefined) {
        throw new Error("Union type not defined");
      }
      return emitUnion(this.name, this.doc, this.type, this.variants);
    }
  }