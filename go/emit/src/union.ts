import { pascalCase } from "change-case";
import { ConstantValue, Optional, stripIndent, valueToGo } from "./common.js";
import { ModelPropertyDef } from "./model.js";
import { BaseSymbol } from "./symbol.js";

function emitValueUnion(name: string, doc: Optional<string>, type: string, variants: ValueUnionVariant[]): string {
  const variantName = (v: ValueUnionVariant) => {
    return `${name}${v.goName}`;
  };
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

export interface ValueUnionVariant {
  name: string;
  goName: string;
  doc: Optional<string>;
  value: string;
}

export class ValueUnionSymbol implements BaseSymbol {
  public readonly kind: "value_union" = "value_union";
  public type: Optional<string> = undefined;
  public readonly variants: ValueUnionVariant[] = [];

  public constructor(
    public name: string,
    public namespace: Optional<string>,
    public goName: string,
    public doc: Optional<string>,
    public anonymous: boolean,
  ) {}

  emit(): string {
    if (this.type === undefined) {
      throw new Error("Union type not defined");
    }
    return emitValueUnion(this.goName, this.doc, this.type, this.variants);
  }
}

function emitTypeUnion(
  name: string,
  doc: Optional<string>,
  discriminator: ModelPropertyDef,
  variants: TypeUnionVariant[],
): string {
  return stripIndent`
      ${doc !== undefined ? `// ${name} ${doc}` : ""}
      type ${name} interface {
        ${discriminator.goName}() ${discriminator.type!()!.goName}
      }

      func Unmarshal${pascalCase(name)}(data []byte) (${name}, error) {
        var typeCheck struct {
          ${discriminator.goName} ${discriminator.type!()!.goName} \`json:"${discriminator.jsonName}"\`
        }
        if err := json.Unmarshal(data, &typeCheck); err != nil {
          return nil, err
        }

        var result ${name}
        switch typeCheck.${discriminator.goName} {${variants
          .map(
            (v) => `
        case ${valueToGo(v.tag)}:
          var v ${v.typeSymbol.goName}
          if err := json.Unmarshal(data, &v); err != nil {
            return nil, err
          }
          result = v
          `,
          )
          .join("")}
        }
        return result,  nil
      }`;
}

export interface TypeUnionVariant {
  name: string;
  goName: string;
  doc: Optional<string>;
  typeSymbol: BaseSymbol;
  tag: ConstantValue;
}

export class TypeUnionSymbol implements BaseSymbol {
  public readonly kind: "type_union" = "type_union";
  public readonly variants: TypeUnionVariant[] = [];
  public discriminator: Optional<ModelPropertyDef> = undefined;

  public constructor(
    public name: string,
    public namespace: Optional<string>,
    public goName: string,
    public doc: Optional<string>,
  ) {}

  emit(): string {
    if (this.discriminator === undefined) {
      throw new Error(`Could not resolve discriminator for ${this.name} union.`);
    }
    return emitTypeUnion(this.name, this.doc, this.discriminator, this.variants);
  }
}

export type UnionSymbol = ValueUnionSymbol | TypeUnionSymbol;
