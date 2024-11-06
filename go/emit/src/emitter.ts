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
import { pascalCase } from "change-case";
import { emitHeader, getDoc, getEncodedName, Optional } from "./common.js";
import { UnionSymbol } from "./union.js";
import { ModelSymbol } from "./model.js";
import { SymbolTable } from "./symbol.js";
import { addBuiltInSymbols, BuiltInSymbol } from "./built-in..js";

type Symbol = UnionSymbol | ModelSymbol | BuiltInSymbol;

interface NamespaceDefinition {
  name: string;
  typespecDefinition: Namespace;
  goName: string;
  symbols: Symbol[];
}

export async function $onEmit(context: EmitContext): Promise<void> {
  const { program } = context;
  const builtInNamespaces = ["", "TypeSpec", "Reflection"];
  const namespaces = new Map<string, NamespaceDefinition>();
  const symbolTable = new SymbolTable<Symbol>();
  addBuiltInSymbols(symbolTable);

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
    type: Optional<() => Optional<Symbol>>;
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
        const goName = getEncodedName(model, "text/x-go") || pascalCase(model.name);
        const doc = getDoc(model);
        scopes.push({
          kind: "model",
          symbol: new ModelSymbol(model.name, model.namespace?.name, goName, doc),
        });
        console.log(`Model ${model.name}: Start`);
      },
      exitModel: (model: Model) => {
        const modelScope = scopes.pop();
        if (modelScope?.kind !== "model") {
          throw new Error("Expected model scope");
        }
        const { symbol } = modelScope;
        namespace.symbols.push(symbol);
        symbolTable.push(symbol);
        console.log(`Model ${model.name}: End`);
      },
      modelProperty: (property: ModelProperty) => {
        const parentScope = scopes[scopes.length - 1];
        if (parentScope.kind !== "model") {
          throw new Error("Expected model scope");
        }
        const doc = getDoc(property);
        const goName = getEncodedName(property, "text/x-go") || pascalCase(property.name);
        const jsonName = getEncodedName(property, "application/json") || property.name;

        const { type } = property;

        if (type.kind === "Scalar" || type.kind === "Model") {
          scopes.push({
            kind: "property",
            name: property.name,
            doc,
            type: symbolTable.deferResolve(type.name, type.namespace?.name),
            goName,
            jsonName,
            model: parentScope.symbol,
          });
          return;
        }
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
        const { name, goName, jsonName, doc, model } = propertyScope;
        if (propertyScope.type === undefined) {
          throw new Error("Property type not defined");
        }
        const type = propertyScope.type();
        if (type === undefined) {
          throw new Error(`Could not resolve type of property ${name}  of model ${model.name}.`);
        }

        propertyScope.model.properties.push({
          name,
          goName,
          jsonName,
          doc,
          type: type,
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
            const goName = getEncodedName(union, "text/x-go") || pascalCase(union.name);
            return [union.name, goName, false];
          }
        })();
        const doc = getDoc(union);
        scopes.push({
          kind: "union",
          symbol: new UnionSymbol(unionName, union.namespace?.name, goName, doc, anonymous),
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
        symbolTable.push(symbol);
        if (symbol.anonymous) {
          const parentScope = scopes[scopes.length - 1];
          if (parentScope.kind !== "property") {
            throw new Error("Expected property scope");
          }
          parentScope.type = symbolTable.deferResolve(symbol.name, symbol.namespace);
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
          const variantName = typeof variant.name === "string" ? variant.name : type.value;
          if (parentScope.symbol.type === undefined) {
            parentScope.symbol.type = "string";
          } else if (parentScope.symbol.type !== "string") {
            throw new Error("Union must contain only one scalar type");
          }
          parentScope.symbol.variants.push({
            name: variantName,
            goName: goName || pascalCase(variantName),
            doc,
            value: `"${type.value}"`,
          });
        } else if (type.kind === "Number") {
          const variantName = typeof variant.name === "string" ? variant.name : type.valueAsString;
          if (parentScope.symbol.type === undefined) {
            parentScope.symbol.type = "int64";
          } else if (parentScope.symbol.type !== "int32" && parentScope.symbol.type !== "int64") {
            throw new Error("Union must contain only one scalar type");
          }
          parentScope.symbol.variants.push({
            name: variantName,
            goName: goName || pascalCase(variantName),
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
    await program.host.mkdirp(`${context.emitterOutputDir}/${namespace.goName}`);

    const shouldEmit = (s: Symbol): s is UnionSymbol | ModelSymbol => ["model", "union"].includes(s.kind);

    await program.host.writeFile(
      namespaceFile,
      emitHeader(namespace.goName, ["encoding/json"]) +
        namespace.symbols
          .filter(shouldEmit)
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
