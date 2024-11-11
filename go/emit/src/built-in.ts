import { Optional } from "./common.js";
import { BaseSymbol, SymbolTable } from "./symbol.js";

export class BuiltInSymbol implements BaseSymbol {
  public readonly kind: "built-in" = "built-in";
  public readonly namespace: "TypeSpec" = "TypeSpec";

  public constructor(
    public readonly name: string,
    public readonly goName: string,
    public readonly include?: Optional<string>
  ) {}
}

export class BuiltInTemplate implements BaseSymbol {
  public readonly kind: "built-in-template" = "built-in-template";
  public readonly namespace: "TypeSpec" = "TypeSpec";

  public constructor(
    public readonly name: string,
    public readonly goName: string,
  ) {}
}

export const integerTypes = [
  new BuiltInSymbol("integer", "int64"),
  new BuiltInSymbol("int64", "int64"),
  new BuiltInSymbol("int32", "int32"),
  new BuiltInSymbol("int16", "int16"),
  new BuiltInSymbol("int8", "int8"),
  new BuiltInSymbol("safeint", "int64"),
  new BuiltInSymbol("uint64", "uint64"),
  new BuiltInSymbol("uint32", "uint32"),
  new BuiltInSymbol("uint16", "uint16"),
  new BuiltInSymbol("uint8", "uint8"),
];

export const builtInTemplates = [new BuiltInTemplate("Array", "Array"), new BuiltInTemplate("Record", "Record")];

export const builtInSymbols = [
  new BuiltInSymbol("numeric", "float64"),
  new BuiltInSymbol("float", "float64"),
  ...integerTypes,
  new BuiltInSymbol("float32", "float32"),
  new BuiltInSymbol("float64", "float64"),
  // new BuiltInSymbol("decimal", ""),
  // new BuiltInSymbol("decimal128", ""),
  // new BuiltInSymbol("plainDate", ""),
  // new BuiltInSymbol("plainTime", ""),
  // new BuiltInSymbol("utcDateTime", ""),
  // new BuiltInSymbol("offsetDateTime", ""),
  new BuiltInSymbol("duration", "time.Duration", "time"),
  // new BuiltInSymbol("bytes", ""),
  new BuiltInSymbol("string", "string"),
  new BuiltInSymbol("boolean", "bool"),
  ...builtInTemplates,
];

export function addBuiltInSymbols<T extends BaseSymbol | BuiltInTemplate>(
  symbolTable: SymbolTable<T | BuiltInSymbol | BuiltInTemplate>,
) {
  builtInSymbols.forEach((s) => symbolTable.push(s));
}
