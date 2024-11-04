import {
  BooleanLiteral,
  EmitContext,
  Model,
  ModelProperty,
  Namespace,
  navigateProgram,
  navigateTypesInNamespace,
  Program,
  Scalar,
  Union,
  UnionVariant,
} from "@typespec/compiler";
import {
  code,
  CodeTypeEmitter,
  Context,
  EmitterOutput,
} from "@typespec/compiler/emitter-framework";
import { pascalCase } from "change-case";
import {
  emitHeader,
  getDoc,
  getEncodedName,
  Optional,
  stripIndent,
} from "./common.js";
import { emitUnion } from "./union.js";

interface UnionVariantDef {
  name: string;
  goName: Optional<string>;
  doc: Optional<string>;
  value: string;
}

class UnionSymbol {
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

interface ModelPropertyDef {
  name: string;
  goName: string;
  jsonName: string;
  doc: Optional<string>;
  type: string;
}

class ModelSymbol {
  public readonly kind: "model" = "model";
  public readonly properties: ModelPropertyDef[] = [];

  public constructor(
    public name: string,
    public goName: string,
  ) {}

  emit(): string {
    throw new Error("Method not implemented.");
  }
}

type Symbol = UnionSymbol | ModelSymbol;

interface NamespaceDefinition {
  name: string;
  typespecDefinition: Namespace;
  goName: string;
  symbols: Symbol[];
}

class SymbolTable {
  private table: Map<string, Symbol> = new Map();

  push(namespace: string, symbol: Symbol) {
    const key = `${namespace}/${symbol.name}`;
    if (this.table.has(key)) {
      throw new Error(`Duplicate symbol: ${key}`);
    }
    this.table.set(key, symbol);
  }

  find(namespace: string, name: string): Optional<Symbol> {
    const key = `${namespace}/${name}`;
    return this.table.get(key);
  }
}

export async function $onEmit(context: EmitContext): Promise<void> {
  const { program } = context;
  const builtInNamespaces = ["", "TypeSpec", "Reflection"];
  const namespaces = new Map<string, NamespaceDefinition>();
  const symbolTable = new SymbolTable();

  navigateProgram(program, {
    namespace: (namespace: Namespace) => {
      if (builtInNamespaces.includes(namespace.name)) {
        return;
      }
      const encodedName = getEncodedName(namespace, "text/x-go");
      const goName = encodedName || namespace.name;
      namespaces.set(namespace.name, {
        name: namespace.name,
        typespecDefinition: namespace,
        goName: goName || namespace.name,
        symbols: [],
      });
    },
  });
  interface UnionScope {
    kind: "union";
    symbol: UnionSymbol;
  }
  interface PropertyScope {
    kind: "property";
    name: string;
    goName: string;
    jsonName: string;
    doc: Optional<string>;
    type: Optional<string>;
    model: ModelSymbol;
  }
  interface ModelScope {
    kind: "model";
    symbol: ModelSymbol;
  }
  type Scope = UnionScope | PropertyScope | ModelScope;

  for (const namespace of namespaces.values()) {
    const scopes: Scope[] = [];
    navigateTypesInNamespace(namespace.typespecDefinition, {
      model: (model: Model) => {
        const goName =
          getEncodedName(model, "text/x-go") || pascalCase(model.name);
        scopes.push({
          kind: "model",
          symbol: new ModelSymbol(model.name, goName),
        });
        console.log(`Model ${model.name}: Start`);
      },
      exitModel: (model: Model) => {
        scopes.pop();
        console.log(`Model ${model.name}: End`);
      },
      modelProperty: (property: ModelProperty) => {
        const parentScope = scopes[scopes.length - 1];
        if (parentScope.kind !== "model") {
          throw new Error("Expected model scope");
        }
        const doc = getDoc(property);
        const goName =
          getEncodedName(property, "text/x-go") || pascalCase(property.name);
        const jsonName =
          getEncodedName(property, "application/json") || property.name;

        scopes.push({
          kind: "property",
          name: property.name,
          doc,
          type: undefined,
          goName,
          jsonName,
          model: parentScope.symbol,
        });
      },
      exitModelProperty: (_: ModelProperty) => {
        const propertyScope = scopes.pop();
        if (propertyScope?.kind !== "property") {
          throw new Error("Expected property scope");
        }
        const { name, goName, jsonName, doc } = propertyScope;
        if (propertyScope.type === undefined) {
          throw new Error("Property type not defined");
        }

        propertyScope.model.properties.push({
          name,
          goName,
          jsonName,
          doc,
          type: propertyScope.type,
        });
      },
      union: (union: Union) => {
        const [unionName, goName, anonymous] = (() => {
          if (union.name === undefined) {
            /* Anonymous union (inline or alias), we'll best effort name it from the containing scopes */
            const parentScope = scopes[scopes.length - 1];
            if (parentScope.kind === "property") {
              const propertyName = parentScope.name;
              const modelName = parentScope.model.name;
              const generatedName = `${pascalCase(modelName)}${pascalCase(propertyName)}`;
              return [generatedName, generatedName, true];
            } else {
              throw new Error("Anonymous union not contained in a property");
            }
          } else {
            const goName =
              getEncodedName(union, "text/x-go") || pascalCase(union.name);
            return [union.name, goName, false];
          }
        })();
        const doc = getDoc(union);
        scopes.push({
          kind: "union",
          symbol: new UnionSymbol(unionName, goName, doc, anonymous),
        });
      },
      exitUnion: (_: Union) => {
        const unionScope = scopes.pop();
        if (unionScope?.kind !== "union") {
          throw new Error("Expected union scope");
        }
        const { symbol } = unionScope;
        if (symbol.name === undefined) {
          throw new Error("Union type not defined");
        }
        // const symbol: Symbol = { kind: "union", name: unionScope.name, goName: unionScope.goName, definition: emitUnion(unionScope.name, unionScope.doc, unionScope.type, unionScope.variants) };
        /* TODO: combine namespace and symbolTable */
        namespace.symbols.push(symbol);
        symbolTable.push(namespace.name, symbol);
        if (symbol.anonymous) {
          const parentScope = scopes[scopes.length - 1];
          if (parentScope.kind !== "property") {
            throw new Error("Expected property scope");
          }
          parentScope.type = symbol.name;
        }
      },
      unionVariant: (variant: UnionVariant) => {
        const parentScope = scopes[scopes.length - 1];
        if (parentScope.kind !== "union") {
          throw new Error("Expected union scope");
        }
        const { type } = variant;
        const doc = getDoc(variant);
        const goName = getEncodedName(variant, "text/x-go");
        if (type.kind === "String") {
          const variantName =
            typeof variant.name === "string" ? variant.name : type.value;
          if (parentScope.symbol.type === undefined) {
            parentScope.symbol.type = "string";
          } else if (parentScope.symbol.type !== "string") {
            throw new Error("Union must contain only one scalar type");
          }
          parentScope.symbol.variants.push({
            name: variantName,
            goName,
            doc,
            value: `"${type.value}"`,
          });
        } else if (type.kind === "Number") {
          const variantName =
            typeof variant.name === "string"
              ? variant.name
              : type.valueAsString;
          if (parentScope.symbol.type === undefined) {
            parentScope.symbol.type = "int64";
          } else if (
            parentScope.symbol.type !== "int32" &&
            parentScope.symbol.type !== "int64"
          ) {
            throw new Error("Union must contain only one scalar type");
          }
          parentScope.symbol.variants.push({
            name: variantName,
            goName,
            doc,
            value: type.valueAsString,
          });
        } else if (type.kind === "Scalar") {
          parentScope.symbol.type = type.name;
        }
      },
      exitUnionVariant: (_: UnionVariant) => {
        // noop
      },
      scalar: (scalar: Scalar) => {
        console.log(`Scalar ${scalar.name}: Start`);
      },
      exitScalar: (scalar: Scalar) => {
        console.log(`Scalar ${scalar.name}: End`);
      },
      boolean: (scalar: BooleanLiteral) => {
        console.log(`Boolean ${scalar.value}: Start`);
      },
      exitBoolean: (scalar: BooleanLiteral) => {
        console.log(`Boolean ${scalar.value}: End`);
      },
    });
  }

  for (const namespace of namespaces.values()) {
    const namespaceFile = `${context.emitterOutputDir}/${namespace.goName}/models.go`;
    await program.host.mkdirp(
      `${context.emitterOutputDir}/${namespace.goName}`,
    );

    await program.host.writeFile(
      namespaceFile,
      emitHeader(namespace.goName, ["encoding/json"]) +
        namespace.symbols
          .filter((s) => ["model", "union"].includes(s.kind))
          .map((s) => s.emit())
          .join("\n\n"),
    );
    // package ${namespace.goName}

    // import "encoding/json"

    // // This file is generated by the typespec compiler. Do not edit.
    // ` + namespace.symbols.filter(s => s.kind === "model" || s.kind === "union").map(s => s.definition).join("\n\n"));
  }

  // const assetEmitter = createAssetEmitter(program, GoEmitter, context);
  // program.resolveTypeReference()
  // assetEmitter.emitProgram();
  // return await assetEmitter.writeOutput();
}

class GoEmitter extends CodeTypeEmitter {
  // constructor(private program: Program) {}

  // async emit(): Promise<void> {
  //   // Process all types in the program
  //   for (const type of this.program.types.getTypes()) {
  //     if (type instanceof Model) {
  //       this.emitModel(type);
  //     } else if (type instanceof Enum) {
  //       this.emitEnum(type);
  //     } else if (type instanceof Interface) {
  //       this.emitInterface(type);
  //     }
  //   }
  //   return this.output;
  // }
  programContext(program: Program): Context {
    const sourceFile = this.emitter.createSourceFile("test.go");
    this.emitter.emitSourceFile;
    return {
      scope: sourceFile.globalScope,
    };
  }

  modelDeclaration(model: Model, name: string): EmitterOutput<string> {
    const props = this.emitter.emitModelProperties(model);
    return this.emitter.result.declaration(
      name,
      code`type ${name} struct {\n ${props} \n}`,
    );
  }

  modelPropertyLiteral(property: ModelProperty): EmitterOutput<string> {
    const doc = this.getDoc(property);
    const type = this.emitter.emitType(property.type);
    return code`${property.name} ${type} \`json:"${property.name},omitempty"\`\n`;
  }

  private mapScalarToGoType(scalar: Scalar): string {
    const scalarMap: Record<string, string> = {
      string: "string",
      int32: "int32",
      int64: "int64",
      integer: "int64",
      float32: "float32",
      float64: "float64",
      boolean: "bool",
      date: "time.Time",
      datetime: "time.Time",
      duration: "time.Duration",
      uuid: "string",
      url: "string",
      email: "string",
    };
    if (scalarMap[scalar.name] === undefined) {
      throw new Error(`Unsupported scalar type: ${scalar.name}`);
    }

    return scalarMap[scalar.name];
  }

  scalarDeclaration(scalar: Scalar, _name: string): EmitterOutput<string> {
    console.log("scalar");
    this.emitter.getContext()["scalar"] = scalar;
    return this.mapScalarToGoType(scalar);
  }

  private getDoc(element: Union | ModelProperty): string | undefined {
    const docDecorator = element.decorators.find(
      (d) => d.definition?.name === "@doc",
    );
    return docDecorator?.args[0].jsValue?.toString();
  }

  unionDeclaration(union: Union, name: string): EmitterOutput<string> {
    const doc = this.getDoc(union);
    let scalar;
    let values = [];
    for (const entry of union.variants.entries()) {
      if (entry[1].type.kind === "Scalar") {
        scalar = this.mapScalarToGoType(entry[1].type);
        continue;
      }
      const variantName = pascalCase(entry[0].toString());
      const variant = entry[1];
      if (variant.type.kind === "String") {
        if (scalar === undefined) {
          scalar = "string";
        } else if (scalar !== "string") {
          throw new Error("Unions must contain only one scalar type");
        }
        values.push(
          code`${name}${variantName} ${name} = "${variant.type.value}"`,
        );
      } else if (variant.type.kind === "Number") {
        if (scalar === undefined) {
          scalar = "int64";
        } else if (scalar !== "int32" && scalar !== "int64") {
          throw new Error("Unions must contain only one scalar type");
        }
        values.push(
          code`${name}${variantName} ${name} = ${variant.type.valueAsString}`,
        );
      } else {
        throw new Error("Unions must contain only numbers or strings");
      }
    }
    if (scalar === undefined) {
      throw new Error("Union must contain a scalar type");
    }

    return this.emitter.result.declaration(
      name,
      code`
      ${doc !== undefined ? `// ${name} ${doc}` : ""}
      type ${name} ${scalar}

      const (
        ${values.join("\n")}
    )

      func (f  *${name}) UnmarshalJSON(data []byte) error {
        var v ${scalar}
        if err := json.Unmarshal(data, &v); err != nil {
          return err
        }
        *f = ${name}(v)
        return nil
      }

      func (f ${name}) MarshalJSON() ([]byte, error) {
        return json.Marshal(f)
      }`,
    );
  }

  // unionVariant(variant: UnionVariant): EmitterOutput<UnionVariantRepr> {
  //   console.log(variant.name);
  //   console.log(variant.type);
  //   console.log(variant.kind);
  //   return "variant";
  // }
}

interface UnionVariantRepr {
  name: string;
  type: string;
  value: string;
}
