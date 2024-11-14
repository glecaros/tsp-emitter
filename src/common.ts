import {
  BaseType,
  BooleanLiteral,
  DecoratorApplication,
  DecoratorArgument,
  NumericLiteral,
  StringLiteral,
  Type,
} from "@typespec/compiler";

export function stripIndent(strings: TemplateStringsArray, ...values: any[]): string {
  const fullString = strings.reduce((acc, str, i) => acc + str + (values[i] || ""), "").replace(/^\n+/g, "");

  const match = fullString.match(/^[ \t]*(?=\S)/gm);
  if (!match) return fullString;

  const indent = Math.min(...match.map((el) => el.length));
  const regex = new RegExp(`^[ \\t]{${indent}}`, "gm");

  return indent > 0 ? fullString.replace(regex, "") : fullString;
}

export function emitHeader(packageName: string, imports: string[]): string {
  return stripIndent`
        package ${packageName}
        ${
          imports.length > 1
            ? `
        import (${imports
          .map(
            (i) => `
            "${i}"`,
          )
          .join("")}
        )`
            : imports
                .map(
                  (i) => `
        import \"${i}\"`,
                )
                .join("\n")
        }

        // This file is generated by the typespec compiler. Do not edit.`;
}

export function emitNullable(): string {
  return stripIndent`
        type Nullable[T any] struct {
            value *T
            isSet bool
        }

        func SetNullable[T any](v T) Nullable[T] {
            return Nullable[T]{value: &v, isSet: true}
        }

        func UnsetNullable[T any]() Nullable[T] {
            return Nullable[T]{isSet: false}
        }

        func NullNullable[T any]() Nullable[T] {
            return Nullable[T]{isSet: true}
        }

        func (n Nullable[T]) IsSet() bool {
            return n.isSet
        }

        func (n Nullable[T]) Value() T {
            return *n.value
        }

        func (n *Nullable[T]) SetValue(v T) {
            n.value = &v
            n.isSet = true
        }

        func (o Nullable[T]) MarshalJSON() ([]byte, error) {
            if o.isSet && o.value == nil {
                return []byte("null"), nil
            }
            return json.Marshal(o.value)
        }

        func (o *Nullable[T]) UnmarshalJSON(data []byte) error {
            o.isSet = true
            return json.Unmarshal(data, &o.value)
        }`;
}

export function emitPtr(): string {
  return stripIndent`
        func Ptr[T any](v T) *T {
            return &v
        }`
}

export type Optional<T> = T | undefined;

interface Decorated {
  decorators: DecoratorApplication[];
}

function getDecoratorArgs(element: Decorated, decoratorName: string): DecoratorArgument[][] {
  return element.decorators.filter((d) => d.definition?.name === decoratorName).map((d) => d.args);
}

function getDecoratorArg(
  element: Decorated,
  decoratorName: string,
  predicate: (args: DecoratorArgument[]) => boolean,
): DecoratorArgument[] | undefined {
  const filtered = getDecoratorArgs(element, decoratorName).filter(predicate);
  if (filtered.length === 0) {
    return undefined;
  }
  return filtered[0];
}

export function getDoc(element: Decorated): Optional<string> {
  const docDecorator = getDecoratorArg(element, "@doc", (args) => args.length === 1);
  return docDecorator?.at(0)?.jsValue?.toString();
}

export function getEncodedName(element: Decorated, mimeType: string): Optional<string> {
  const encodedName = getDecoratorArg(
    element,
    "@encodedName",
    (args) => args.length === 2 && args[0].jsValue === mimeType,
  );
  return encodedName?.at(1)?.jsValue as Optional<string>;
}

export function getDiscriminator(element: Decorated): Optional<string> {
  const discriminator = getDecoratorArg(element, "@discriminator", (args) => args.length === 1);
  return discriminator?.at(0)?.jsValue?.toString();
}

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

export function valueToGo(value: ConstantValue): string {
  if (value.type === "boolean" || value.type === "number") {
    return `${value.value}`;
  } else {
    return `"${value.value}"`;
  }
}

export function getLiteralValue(literal: BooleanLiteral | NumericLiteral | StringLiteral): [string, ConstantValue] {
  if (literal.kind === "Boolean") {
    return [
      "boolean",
      {
        type: "boolean",
        value: literal.value,
      },
    ];
  } else if (literal.kind === "String") {
    return [
      "string",
      {
        type: "string",
        value: literal.value,
      },
    ];
  } else {
    if (literal.numericValue.isInteger) {
      return [
        "integer",
        {
          type: "number",
          value: literal.value,
        },
      ];
    } else {
      return [
        "numeric",
        {
          type: "number",
          value: literal.value,
        },
      ];
    }
  }
}

export function supportedLiteral(type: Type): type is BooleanLiteral | NumericLiteral | StringLiteral {
  return ["Boolean", "Number", "String"].includes(type.kind);
}

interface MetadataStore {
  goEmitterMetadata: Map<string, string>;
}

export function storeMetadata(element: BaseType, key: string, value: string): void {
  const metadataStore = element as unknown as MetadataStore;
  if (!metadataStore.goEmitterMetadata) {
    metadataStore.goEmitterMetadata = new Map();
  }
  metadataStore.goEmitterMetadata.set(key, value);
}

export function getMetadata(element: BaseType, key: string): Optional<string> {
  const metadataStore = element as unknown as MetadataStore;
  return metadataStore.goEmitterMetadata?.get(key);
}
