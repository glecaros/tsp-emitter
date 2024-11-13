import { pascalCase } from "change-case";
import { ConstantValue, Optional, stripIndent, valueToGo } from "./common.js";
import { ModelPropertyDef, renderValue } from "./model.js";
import { BaseSymbol } from "./symbol.js";
import { integerTypes } from "./built-in.js";

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
        ${variantName(v)} ${name} = ${valueToGo(v.value)}`,
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
  value: ConstantValue;
}

const integers = integerTypes.map((i) => i.name);

export class ValueUnionSymbol implements BaseSymbol {
  public readonly kind: "value_union" = "value_union";
  public type: Optional<BaseSymbol> = undefined;
  public readonly variants: ValueUnionVariant[] = [];

  public constructor(
    public name: string,
    public namespace: Optional<string>,
    public goName: string,
    public doc: Optional<string>,
    public nullable: boolean,
  ) {}

  checkAndSetType(type: BaseSymbol, fromLiteral: boolean): void {
    if (this.type === undefined) {
      this.type = type;
    } else if (this.type !== type) {
      if (fromLiteral && integers.includes(this.type.name) && integers.includes(type.name)) {
        return;
      }
      throw new Error(`Type mismatch for union ${this.name}`);
    }
  }

  emit(): string {
    if (this.type === undefined) {
      throw new Error("Union type not defined");
    }
    return emitValueUnion(this.goName, this.doc, this.type.goName, this.variants);
  }
}

function emitTypeUnion(
  name: string,
  doc: Optional<string>,
  discriminator: DiscriminatorDef,
  variants: TypeUnionVariant[],
): string {
  return stripIndent`
      ${doc !== undefined ? `// ${name} ${doc}` : ""}
      type ${name} interface {
        ${discriminator.goName}() ${discriminator.type.goName}
      }

      func Unmarshal${pascalCase(name)}(data []byte) (${name}, error) {
        var typeCheck struct {
          ${discriminator.goName} ${discriminator.type.goName} \`json:"${discriminator.jsonName}"\`
        }
        if err := json.Unmarshal(data, &typeCheck); err != nil {
          return nil, err
        }

        var result ${name}
        switch typeCheck.${discriminator.goName} {${variants
          .map(
            (v) => `
        case ${renderValue(v.tag.type)}:
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

export interface DiscriminatorDef {
  name: string;
  goName: string;
  jsonName: string;
  type: BaseSymbol;
}

export interface TypeUnionVariant {
  name: string;
  goName: string;
  doc: Optional<string>;
  typeSymbol: BaseSymbol;
  tag: ModelPropertyDef;
}

export class TypeUnionSymbol implements BaseSymbol {
  public readonly kind: "type_union" = "type_union";
  public readonly variants: TypeUnionVariant[] = [];
  public discriminator: Optional<DiscriminatorDef> = undefined;

  public constructor(
    public name: string,
    public namespace: Optional<string>,
    public goName: string,
    public doc: Optional<string>,
    public discriminatorName: string,
    public nullable: boolean,
  ) {}

  emit(): string {
    if (this.discriminator === undefined) {
      throw new Error(`Could not resolve discriminator for ${this.name} union.`);
    }
    return emitTypeUnion(this.name, this.doc, this.discriminator, this.variants);
  }
}

export type UnionSymbol = ValueUnionSymbol | TypeUnionSymbol;
