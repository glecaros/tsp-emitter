import { pascalCase } from "change-case";
import { ConstantValue, Optional, stripIndent, valueToGo } from "./common.js";
import { BaseSymbol } from "./symbol.js";
import { TypeUnionSymbol, UnionSymbol } from "./union.js";

export interface TypeTemplateParameter {
  kind: "type";
  symbol: BaseSymbol;
}

export interface ValueTemplateParameter {
  kind: "value";
  value: ConstantValue;
}

export type TemplateParameter = TypeTemplateParameter | ValueTemplateParameter;

export interface ModelPropertyType {
  kind: "model";
  type: BaseSymbol;
}

export interface ConstantPropertyType {
  kind: "constant";
  type: BaseSymbol;
  value: ConstantValue;
}

export interface TemplateInstancePropertyType {
  kind: "template_instance";
  template: BaseSymbol;
  args: TemplateParameter[];
}

export type PropertyType = ModelPropertyType | ConstantPropertyType | TemplateInstancePropertyType;

export interface ModelPropertyDef {
  name: string;
  goName: string;
  jsonName: string;
  doc: Optional<string>;
  type: PropertyType;
  optional: boolean;
  nullable: boolean;
}

function renderTemplateInstance(type: TemplateInstancePropertyType): string {
  if (type.template.name === "Array") {
    return `[]${type.args[0].kind === "type" ? type.args[0].symbol.goName : valueToGo(type.args[0].value)}`;
  }
  throw new Error(`Unsupported template instance: ${type.template.name}`);
}

function isTypeUnion(type: PropertyType): type is ModelPropertyType {
  return type.kind === "model" && type.type.kind === "type_union";
}

function renderPropertyType(property: ModelPropertyDef): string {
  const { type, optional, nullable } = property;
  const innerType = (() => {
    if (type.kind === "model") {
      return type.type.goName;
    } else if (type.kind === "constant") {
      return type.type.goName;
    } else {
      return renderTemplateInstance(type);
    }
  })();
  if (nullable) {
    return `Nullable[${innerType}]`;
  }
  if (optional) {
    return `*${innerType}`;
  }
  return innerType;
}

export function renderValue(type: PropertyType): string {
  if (type.kind === "constant") {
    return valueToGo(type.value);
  } else {
    throw new Error("Unsupported value");
  }
}

function renderSerializationValue(property: ModelPropertyDef): string {
  if (property.type.kind === "constant") {
    return valueToGo(property.type.value);
  } else if ((property.type.kind === "model") && (property.type.type as any).serializeFunction) {
    return `${(property.type.type as any).serializeFunction}(m.${property.goName})`;
  } else {
    return `m.${property.goName}`;
  }
}

function renderDeserializationFunction(property: ModelPropertyDef): string {
  if ((property.type.kind === "model") && (property.type.type as any).deserializeFunction) {
    return `${(property.type.type as any).deserializeFunction}`;
  } else {
    return "json.Unmarshal";
  }
}

export class ModelSymbol implements BaseSymbol {
  public readonly kind: "model" = "model";
  private readonly properties: ModelPropertyDef[] = [];

  public constructor(
    public name: string,
    public namespace: Optional<string>,
    public goName: string,
    public doc: Optional<string>,
    public parent: Optional<ModelSymbol>,
  ) {}

  addProperty(property: ModelPropertyDef) {
    const isUnion = (type: BaseSymbol): type is UnionSymbol =>
      type.kind === "value_union" || type.kind === "type_union";
    if (property.type.kind === "model" && isUnion(property.type.type)) {
      if (property.type.type.nullable) {
        property.nullable = true;
      }
    }
    this.properties.push(property);
  }

  public getAllProperties(): ModelPropertyDef[] {
    const parentProperties = this.parent !== undefined ? this.parent.getAllProperties() : [];
    const mergedProperties = new Map<string, ModelPropertyDef>();

    for (const prop of parentProperties) {
      mergedProperties.set(prop.name, prop);
    }

    for (const prop of this.properties) {
      mergedProperties.set(prop.name, prop);
    }

    return Array.from(mergedProperties.values());
  }

  emit(): string {
    const allProperties = this.getAllProperties();
    return stripIndent`
            ${this.doc !== undefined ? `// ${this.goName} ${this.doc}"}` : ""}
            type ${this.goName} struct {${
              this.parent !== undefined
                ? `
                ${this.parent.goName}`
                : ""
            }${this.properties
              .filter((m) => m.type.kind !== "constant")
              .map((m) =>
                m.doc !== undefined
                  ? `
                // ${m.goName} ${m.doc}`
                  : "" +
                    `
                ${m.goName} ${renderPropertyType(m)}`,
              )
              .join("")}
            }${this.properties
              .filter((m) => m.type.kind === "constant")
              .map(
                (m) => `

            func (m ${this.goName}) ${m.goName}() ${renderPropertyType(m)} {
                return ${renderValue(m.type)}
            }`,
              )
              .join("")}

            func (m *${this.goName})  UnmarshalJSON(data []byte) error {
                var rawMsg map[string]json.RawMessage
                if err := json.Unmarshal(data, &rawMsg); err != nil {
                    return err
                }${allProperties
                  .filter((m) => m.type.kind !== "constant")
                  .map(
                    (m) => `
                if v, ok := rawMsg["${m.name}"]; ok {${isTypeUnion(m.type) ? `
                    value, err := Unmarshal${pascalCase(m.goName)}(v)
                    if err != nil {
                        return err
                    }
                    ${m.nullable ? `m.${m.goName} = SetNullable(value)` : `m.${m.goName} = value`}` : `
                    if err := ${renderDeserializationFunction(m)}(v, &m.${m.goName}); err != nil {
                        return err
                    }`}
                }`)
                  .join("")}
                return nil
            }

            func (m ${this.goName}) MarshalJSON() ([]byte, error) {
                obj := map[string]interface{}{${allProperties
                  .filter((m) => !m.optional && !m.nullable)
                  .map(
                    (m) => `
                    "${m.jsonName}": ${renderSerializationValue(m)},`,
                  )
                  .join("")}
                }
                ${allProperties.filter((m) => m.nullable).map(
                  (m) => `
                if m.${m.goName}.IsSet() {
                    obj["${m.jsonName}"] = ${renderSerializationValue(m)}
                }`).join("")}
                ${allProperties
                  .filter((m) => m.optional)
                  .map(
                    (m) => `
                if m.${m.goName} != nil {
                    obj["${m.jsonName}"] = ${renderSerializationValue(m)}
                }`,
                  )
                  .join("")}

                return json.Marshal(obj)
            }`;
  }
}
