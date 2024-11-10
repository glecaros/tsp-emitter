import { ConstantValue, Optional, stripIndent, valueToGo } from "./common.js";
import { BaseSymbol } from "./symbol.js";

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
}

function renderTemplateInstance(type: TemplateInstancePropertyType): string {
  if (type.template.name === "Array") {
    return `[]${type.args[0].kind === "type" ? type.args[0].symbol.goName : valueToGo(type.args[0].value)}`;
  }
  throw new Error(`Unsupported template instance: ${type.template.name}`);
}

function renderPropertyType(type: PropertyType): string {
  if (type.kind === "model") {
    return type.type.goName;
  } else if (type.kind === "constant") {
    return type.type.goName;
  } else {
    return renderTemplateInstance(type);
  }
}

export function renderValue(type: PropertyType): string {
  if (type.kind === "constant") {
    return valueToGo(type.value);
  } else {
    throw new Error("Unsupported value");
  }
}

export class ModelSymbol implements BaseSymbol {
  public readonly kind: "model" = "model";
  public readonly properties: ModelPropertyDef[] = [];

  public constructor(
    public name: string,
    public namespace: Optional<string>,
    public goName: string,
    public doc: Optional<string>,
  ) {}

  emit(): string {
    return stripIndent`
            ${this.doc !== undefined ? `// ${this.goName} ${this.doc}"}` : ""}
            type ${this.goName} struct {${this.properties
              .filter((m) => m.type.kind !== "constant")
              .map((m) =>
                m.doc !== undefined
                  ? `
                // ${m.goName} ${m.doc}`
                  : "" +
                    `
                ${m.goName} ${m.optional ? "*" : ""}${renderPropertyType(m.type)}`,
              )
              .join("")}
            }${this.properties
              .filter((m) => m.type.kind === "constant")
              .map(
                (m) => `

            func (m ${this.goName}) ${m.goName}() ${renderPropertyType(m.type)} {
                return ${renderValue(m.type)}
            }`,
              )
              .join("")}

            func (m *${this.goName})  UnmarshalJSON(data []byte) error {
                var rawMsg map[string]json.RawMessage
                if err := json.Unmarshal(data, &rawMsg); err != nil {
                    return err
                }${this.properties
                  .filter((m) => m.type.kind !== "constant")
                  .map(
                    (m) => `
                if v, ok := rawMsg["${m.name}"]; ok {
                    if err := json.Unmarshal(v, &m.${m.goName}); err != nil {
                        return err
                    }
                }`,
                  )
                  .join("")}
                return nil
            }

            func (m ${this.goName}) MarshalJSON() ([]byte, error) {
                obj := map[string]interface{}{${this.properties
                  .filter((m) => !m.optional)
                  .map(
                    (m) => `
                    "${m.jsonName}": ${m.type.kind === "constant" ? valueToGo(m.type.value) : `m.${m.goName}`},`,
                  )
                  .join("")}
                }
                ${this.properties
                  .filter((m) => m.optional)
                  .map(
                    (m) => `
                if m.${m.goName} != nil {
                    obj["${m.jsonName}"] = m.${m.goName}
                }`,
                  )
                  .join("")}

                return json.Marshal(obj)
            }`;
  }
}
