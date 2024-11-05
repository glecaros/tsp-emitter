import { Optional, stripIndent } from "./common.js";
import { BaseSymbol } from "./symbol.js";

export interface ModelPropertyDef {
  name: string;
  goName: string;
  jsonName: string;
  doc: Optional<string>;
  type: () => BaseSymbol;
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
              .map((m) =>
                m.doc !== undefined
                  ? `
                // ${m.goName} ${m.doc}`
                  : "" +
                    `
                ${m.goName} ${m.type().goName}`,
              )
              .join("")}
            }

            func (m *${this.goName})  UnmarshalJSON(data []byte) error {
                var rawMsg map[string]json.RawMessage
                if err := json.Unmarshal(data, &rawMsg); err != nil {
                    return err
                }${this.properties
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
                return json.Marshal(map[string]interface{}{${this.properties
                  .map(
                    (m) => `
                    "${m.name}": m.${m.goName},`,
                  )
                  .join("")}
                })
            }`;
  }
}
