import { Optional, stripIndent } from "./common.js";
import { BaseSymbol } from "./symbol.js";

export type ConstantValue = BooleanValue | StringValue | NumberValue;

export interface BooleanValue {
  type: "boolean";
  value: boolean;
}

export interface StringValue {
  type: "string";
  value: string;
}

export interface NumberValue {
  type: "number";
  value: number;
}

function valueToGo(value: ConstantValue): string {
  if (value.type === "boolean" || value.type === "number") {
    return `${value.value}`;
  } else {
    return `"${value.value}"`;
  }
}

export interface ModelPropertyDef {
  name: string;
  goName: string;
  jsonName: string;
  doc: Optional<string>;
  type: BaseSymbol;
  optional: boolean;
  isConstant: boolean;
  value: Optional<ConstantValue>;
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
            type ${this.goName} struct {${this.properties.filter(m => !m.isConstant)
              .map((m) =>
                m.doc !== undefined
                  ? `
                // ${m.goName} ${m.doc}`
                  : "" +
                    `
                ${m.goName} ${m.optional ? "*" : "" }${m.type.goName}`,
              )
              .join("")}
            }${this.properties.filter(m => m.isConstant).map(m => `

            func (m ${this.goName}) ${m.goName}() ${m.type.goName} {
                return ${valueToGo(m.value!)}
            }`).join("")}

            func (m *${this.goName})  UnmarshalJSON(data []byte) error {
                var rawMsg map[string]json.RawMessage
                if err := json.Unmarshal(data, &rawMsg); err != nil {
                    return err
                }${this.properties
                    .filter(m => !m.isConstant)
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
                obj := map[string]interface{}{${this.properties.filter(m => !m.optional).map(m => `
                    "${m.jsonName}": ${m.isConstant ? valueToGo(m.value!) : `m.${m.goName}`},`).join("")}
                }
                ${this.properties.filter(m => m.optional).map(m => `
                if m.${m.goName} != nil {
                    obj["${m.jsonName}"] = m.${m.goName}
                }`).join("")}

                return json.Marshal(obj)
            }`;
  }
}
