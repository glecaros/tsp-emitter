import {
  BooleanLiteral,
  EmitContext,
  Model,
  ModelProperty,
  Namespace,
  navigateProgram,
  navigateTypesInNamespace,
  Scalar,
  Union,
  UnionVariant,
} from "@typespec/compiler";
import { pascalCase } from "change-case";
import {
  ConstantValue,
  emitHeader,
  getDiscriminator,
  getDoc,
  getEncodedName,
  getLiteralValue,
  Optional,
  supportedLiteral,
} from "./common.js";
import { TypeUnionSymbol, UnionSymbol, ValueUnionSymbol } from "./union.js";
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
    discriminator: Optional<string>;
  }
  interface PropertyScope {
    kind: "property";
    name: string;
    goName: string;
    jsonName: string;
    doc: Optional<string>;
    optional: boolean;
    type: Optional<() => Optional<Symbol>>;
    model: ModelSymbol;
  }
  interface ConstantPropertyScope {
    kind: "constant-property";
    name: string;
    goName: string;
    jsonName: string;
    doc: Optional<string>;
    type: Optional<() => Optional<Symbol>>;
    value: Optional<ConstantValue>;
    model: ModelSymbol;
  }
  interface ModelScope {
    kind: "model";
    symbol: ModelSymbol;
  }
  type Scope = UnionScope | PropertyScope | ConstantPropertyScope | ModelScope;

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

        const { type, optional } = property;

        if (type.kind === "Scalar" || type.kind === "Model") {
          scopes.push({
            kind: "property",
            name: property.name,
            doc,
            type: symbolTable.deferResolve(type.name, type.namespace?.name),
            goName,
            jsonName,
            optional,
            model: parentScope.symbol,
          });
          return;
        } else if (type.kind === "Boolean" || type.kind === "String" || type.kind === "Number") {
          const [typeName, value] = getLiteralValue(type);
          scopes.push({
            kind: "constant-property",
            name: property.name,
            doc,
            type: symbolTable.deferResolve(typeName, "TypeSpec"),
            goName,
            jsonName,
            value,
            model: parentScope.symbol,
          });
        } else if (type.kind === "Union") {
          scopes.push({
            kind: "property",
            name: property.name,
            doc,
            type: type.name === undefined ? undefined : symbolTable.deferResolve(type.name, type.namespace?.name),
            goName,
            jsonName,
            optional,
            model: parentScope.symbol,
          });
        } else if (type.kind === "UnionVariant") {
          scopes.push({
            kind: "constant-property",
            name: property.name,
            doc,
            type: undefined,
            goName,
            jsonName,
            value: undefined,
            model: parentScope.symbol,
          });
        } else {
          throw new Error(`Unsupported property kind ${type.kind}`);
        }
      },
      exitModelProperty: (property: ModelProperty) => {
        const propertyScope = scopes.pop();
        if (propertyScope?.kind === "property") {
          const { name, goName, jsonName, doc, model, optional } = propertyScope;
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
            type: () => type,
            optional,
            isConstant: false,
            value: undefined,
          });
        } else if (propertyScope?.kind === "constant-property") {
          if (property.type.kind === "UnionVariant") {
            const { type } = property.type;
            if (!supportedLiteral(type)) {
              throw new Error(
                `Value of constant property ${propertyScope.name} of model  ${propertyScope.model.name} is of a not supported type.`,
              );
            }
            const [typeName, value] = getLiteralValue(type);
            propertyScope.type = symbolTable.deferResolve(
              property.type.union.name!,
              property.type.union.namespace?.name,
            );
            propertyScope.value = value;
          }
          const { name, goName, jsonName, doc, type, model, value } = propertyScope;
          if (type === undefined) {
            throw new Error(`Could not resolve type of property ${name}  of model ${model.name}.`);
          }
          propertyScope.model.properties.push({
            name,
            goName,
            jsonName,
            doc,
            type,
            optional: false,
            isConstant: true,
            value,
          });
        } else {
          throw new Error("Expected property scope");
        }
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
        const discriminator = getDiscriminator(union);
        if (discriminator === undefined) {
          scopes.push({
            kind: "union",
            discriminator: undefined,
            symbol: new ValueUnionSymbol(unionName, union.namespace?.name, goName, doc, anonymous),
          });
        } else {
          scopes.push({
            kind: "union",
            discriminator: discriminator,
            symbol: new TypeUnionSymbol(unionName, union.namespace?.name, goName, doc),
          });
        }
      },
      exitUnion: (_: Union) => {
        const unionScope = scopes.pop();
        if (unionScope?.kind === "union") {
          const { symbol } = unionScope;
          if (symbol.name === undefined) {
            throw new Error("Union type not defined");
          }

          /* TODO: combine namespace and symbolTable */
          namespace.symbols.push(symbol);
          symbolTable.push(symbol);
          if (symbol.kind === "value_union" && symbol.anonymous) {
            const parentScope = scopes[scopes.length - 1];
            if (parentScope.kind !== "property") {
              throw new Error("Expected property scope");
            }
            parentScope.type = symbolTable.deferResolve(symbol.name, symbol.namespace);
          }
        }
      },
      unionVariant: (variant: UnionVariant) => {
        const parentScope = scopes[scopes.length - 1];
        if (parentScope.kind === "union") {
          const { type } = variant;
          const doc = getDoc(variant);
          const goName = getEncodedName(variant, "text/x-go");
          if (parentScope.symbol.kind === "value_union") {
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
            } else {
              throw new Error(`Types of kind ${type.kind} are not supported for value unions.`);
            }
          }
        }
      },
      exitUnionVariant: (variant: UnionVariant) => {
        const parentScope = scopes[scopes.length - 1];

        if (parentScope.kind === "union") {
          // throw new Error("Expected union scope");
          if (parentScope.symbol.kind !== "type_union") {
            /* We only resolve type unions in the exit to ensure types are defined */
            return;
          }
          const { type } = variant;
          if (type.kind !== "Model") {
            throw new Error(`Types of kind ${type.kind} are not supported for type unions.`);
          }

          const doc = getDoc(variant);
          const goName = getEncodedName(variant, "text/x-go");
          const variantName = typeof variant.name === "string" ? variant.name : type.name;
          const variantType = symbolTable.find(type.name, type.namespace?.name);
          if (variantType === undefined) {
            throw new Error(`Type ${type.name} not found.`);
          }
          if (variantType.kind !== "model") {
            throw new Error(`Expected a model symbol as type for the union variant ${variantName}`);
          }
          const discriminatorField = variantType.properties.find((p) => p.name === parentScope.discriminator);
          if (discriminatorField === undefined) {
            throw new Error(`Could not find discriminator ${parentScope.discriminator} in variant ${variantName}`);
          }
          if (parentScope.symbol.discriminator === undefined) {
            parentScope.symbol.discriminator = discriminatorField;
          } else {
            const compatible =
              parentScope.symbol.discriminator.type!() === discriminatorField.type!() &&
              parentScope.symbol.discriminator.isConstant === discriminatorField.isConstant;
            if (!compatible) {
              throw new Error(
                `Discriminator ${parentScope.discriminator} in variant ${variantName} does not match the union discriminator.`,
              );
            }
          }
          parentScope.symbol.variants.push({
            name: variantName,
            goName: goName || pascalCase(variantName),
            doc,
            typeSymbol: variantType,
            tag: discriminatorField.value!,
          });
        }
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

    const shouldEmit = (s: Symbol): s is UnionSymbol | ModelSymbol =>
      ["model", "value_union", "type_union"].includes(s.kind);

    await program.host.writeFile(
      namespaceFile,
      emitHeader(namespace.goName, ["encoding/json"]) +
        namespace.symbols
          .filter(shouldEmit)
          .map((s) => s.emit())
          .join("\n\n"),
    );
  }
}
