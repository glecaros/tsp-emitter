import {
  EmitContext,
  Model,
  ModelProperty,
  Namespace,
  navigateProgram,
  navigateTypesInNamespace,
  Union,
  UnionVariant,
} from "@typespec/compiler";
import { createRekeyableMap } from "@typespec/compiler/utils";
import { camelCase, pascalCase } from "change-case";
import { emitHeader, getDiscriminator, getDoc, getEncodedName, getLiteralValue, supportedLiteral } from "./common.js";
import { TypeUnionSymbol, UnionSymbol, ValueUnionSymbol } from "./union.js";
import { ModelSymbol, PropertyType } from "./model.js";
import { BaseSymbol, SymbolTable } from "./symbol.js";
import { addBuiltInSymbols, BuiltInSymbol, BuiltInTemplate } from "./built-in.js";

type Symbol = UnionSymbol | ModelSymbol | BuiltInSymbol | BuiltInTemplate;

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

  interface ModelScope {
    type: "model";
    symbol: ModelSymbol;
  }
  interface PropertyScope {
    type: "property";
    name: string;
    model: ModelSymbol;
  }
  interface UnionScope {
    type: "union";
    symbol: UnionSymbol;
  }
  interface UnionVariantScope {
    type: "union-variant";
    name: string;
    union: UnionSymbol;
  }
  type Scope = ModelScope | PropertyScope | UnionScope | UnionVariantScope;

  for (const namespace of namespaces.values()) {
    const scopes: Scope[] = [];
    for (const [name, model] of namespace.typespecDefinition.models) {
      const discriminator = getDiscriminator(model);
      if (discriminator !== undefined) {
        /* For inheritance based unions, we update the program to represent them as proper unions. */
        const modelAsUnion = model as unknown as Union;
        modelAsUnion.kind = "Union";
        modelAsUnion.variants = createRekeyableMap<string, UnionVariant>([]);
        for (const derivedModel of model.derivedModels) {
          const properties = createRekeyableMap<string, ModelProperty>();
          for (const [name, property] of model.properties) {
            properties.set(name, { ...property, model: derivedModel });
          }
          for (const [name, property] of derivedModel.properties) {
            properties.set(name, { ...property, model: derivedModel });
          }
          derivedModel.baseModel = undefined;
          derivedModel.properties = properties;
          const variant: UnionVariant = {
            kind: "UnionVariant",
            name: pascalCase(derivedModel.name),
            entityKind: "Type",
            decorators: [],
            isFinished: true,
            type: derivedModel,
            projections: derivedModel.projections,
            node: undefined,
            union: modelAsUnion,
            projectionsByName: derivedModel.projectionsByName,
          };
          modelAsUnion.variants.set(variant.name, variant);
        }
        namespace.typespecDefinition.unions.set(name, modelAsUnion);
        namespace.typespecDefinition.models.delete(name);
      }
    }
    navigateTypesInNamespace(namespace.typespecDefinition, {
      model: (model: Model) => {
        if (model.name === undefined || model.name === "") {
          const parentScope = scopes[scopes.length - 1];
          if (parentScope.type !== "property") {
            throw new Error("Expected property scope");
          }
          model.name = `${pascalCase(parentScope.model.name)}${pascalCase(parentScope.name)}`;
        }
        const goName = getEncodedName(model, "text/x-go") || pascalCase(model.name);
        const doc = getDoc(model);
        const parent = (() => {
          if (model.baseModel !== undefined) {
            const parent = symbolTable.find(model.baseModel.name, model.baseModel.namespace?.name);
            if (parent === undefined) {
              throw new Error(`Parent model ${model.baseModel.name} not found.`);
            }
            if (parent.kind !== "model") {
              throw new Error(`Parent ${model.baseModel.name} is not a model.`);
            }
            return parent;
          }
          return undefined;
        })();

        const symbol = new ModelSymbol(model.name, model.namespace?.name, goName, doc, parent);
        symbolTable.push(symbol);
        scopes.push({ type: "model", symbol: symbol });
      },
      exitModel: (_: Model) => {
        scopes.pop();
      },
      modelProperty: (property: ModelProperty) => {
        const parentScope = scopes[scopes.length - 1];
        if (parentScope.type !== "model") {
          throw new Error("Expected model scope");
        }
        scopes.push({ type: "property", name: property.name, model: parentScope.symbol });
        const { type } = property;
        if (type.kind === "Model") {
          /* Anonymous unions are not included in the traversal, here we name and add them */
          for (const t of type.templateMapper?.args.values() || []) {
            if (t.entityKind === "Type") {
              if (t.kind === "Union" && t.name === undefined) {
                t.name = `${camelCase(parentScope.symbol.name)}${pascalCase(property.name)}`;
                namespace.typespecDefinition.unions.set(t.name, t);
              }
            }
          }
        }
      },
      exitModelProperty: (_: ModelProperty) => {
        scopes.pop();
      },
      union: (union: Union) => {
        const parentScope = scopes[scopes.length - 1];
        if (union.name === undefined) {
          if (parentScope.type === "property") {
            const propertyName = parentScope.name;
            const modelName = parentScope.model.name;
            const generatedName = `${camelCase(modelName)}${pascalCase(propertyName)}`;
            union.name = generatedName;
          } else {
            throw new Error("Anonymous union not contained in a property");
          }
        }
        const goName = getEncodedName(union, "text/x-go") || pascalCase(union.name);
        const doc = getDoc(union);
        const discriminator = getDiscriminator(union);

        const symbol =
          discriminator !== undefined
            ? new TypeUnionSymbol(union.name, union.namespace?.name, goName, doc, discriminator)
            : new ValueUnionSymbol(union.name, union.namespace?.name, goName, doc);

        symbolTable.push(symbol);
        scopes.push({ type: "union", symbol: symbol });
      },
      exitUnion: (_: Union) => {
        scopes.pop();
      },
    });
  }

  for (const namespace of namespaces.values()) {
    const scopes: Scope[] = [];

    navigateTypesInNamespace(namespace.typespecDefinition, {
      model: (model: Model) => {
        const symbol = symbolTable.find(model.name, model.namespace?.name);
        if (symbol?.kind !== "model") {
          throw new Error(`Model ${model.name} not found.`);
        }
        scopes.push({ type: "model", symbol: symbol });
      },
      exitModel: (_: Model) => {
        const scope = scopes.pop();
        if (scope === undefined || scope.type !== "model") {
          throw new Error("Expected model scope");
        }
        const { symbol } = scope;
        namespace.symbols.push(symbol);
      },
      modelProperty: (property: ModelProperty) => {
        const parentScope = scopes[scopes.length - 1];
        if (parentScope.type !== "model") {
          throw new Error("Expected model scope");
        }
        scopes.push({ type: "property", name: property.name, model: parentScope.symbol });
      },
      exitModelProperty: (property: ModelProperty) => {
        const scope = scopes.pop();
        if (scope?.type !== "property") {
          throw new Error("Expected property scope");
        }
        const { name, model } = scope;
        const goName = getEncodedName(property, "text/x-go") || pascalCase(name);
        const jsonName = getEncodedName(property, "application/json") || name;
        const doc = getDoc(property);
        const { type, optional } = property;
        if (
          type.kind === "Scalar" ||
          type.kind === "Model" ||
          type.kind === "Union" ||
          type.kind === "UnionVariant" ||
          supportedLiteral(type)
        ) {
          const propertyType = ((): PropertyType => {
            if (type.kind === "Scalar" || type.kind === "Model" || type.kind === "Union") {
              if (type.name === undefined) {
                throw new Error("Name of union type not defined");
              }
              const symbol = symbolTable.find(type.name, type.namespace?.name);
              if (symbol === undefined) {
                throw new Error(`Type ${type.name} not found.`);
              }
              if (symbol.kind === "built-in-template") {
                if (type.templateMapper?.args.length !== 1) {
                  throw new Error("Array or Record template must have exactly one argument.");
                }
                const arg = type.templateMapper.args[0];
                if (arg.entityKind !== "Type") {
                  throw new Error("Unsupported arg entity kind");
                }
                if (arg.kind !== "Model" && arg.kind !== "Scalar" && arg.kind !== "Union") {
                  throw new Error("Unsupported arg kind");
                }
                if (arg.name === undefined) {
                  throw new Error("Union name not defined");
                }
                const argSymbol = symbolTable.find(arg.name, arg.namespace?.name);
                if (argSymbol === undefined) {
                  throw new Error(`Type ${arg.name} not found.`);
                }
                return {
                  kind: "template_instance",
                  template: symbol,
                  args: [
                    {
                      kind: "type",
                      symbol: argSymbol,
                    },
                  ],
                };
              } else {
                return {
                  kind: "model",
                  type: symbol,
                };
              }
            } else if (supportedLiteral(type)) {
              const [typeName, value] = getLiteralValue(type);
              const symbol = symbolTable.find(typeName, "TypeSpec");
              if (symbol === undefined) {
                throw new Error(`Type ${typeName} not found.`);
              }
              return {
                kind: "constant",
                type: symbol,
                value,
              };
            } else if (type.kind === "UnionVariant") {
              if (type.union.name === undefined) {
                throw new Error("Name of union type not defined");
              }
              if (!supportedLiteral(type.type)) {
                throw new Error(
                  `Value of constant property ${property.name} of model ${model.name} is of a not supported type.`,
                );
              }
              const symbol = symbolTable.find(type.union.name, type.union.namespace?.name);
              if (symbol === undefined) {
                throw new Error(`Type ${type.union.name} not found.`);
              }
              const [_, value] = getLiteralValue(type.type);
              return {
                kind: "constant",
                type: symbol,
                value: value,
              };
            }
            throw new Error("Unsupported type kind");
          })();
          model.properties.push({
            name: property.name,
            goName,
            jsonName,
            doc,
            type: propertyType,
            optional,
          });
        }
      },
      union: (union: Union) => {
        if (union.name === undefined) {
          throw new Error("Union name not defined");
        }
        const symbol = symbolTable.find(union.name, union.namespace?.name);
        if (symbol?.kind !== "value_union" && symbol?.kind !== "type_union") {
          throw new Error(`Union ${union.name} not found.`);
        }

        scopes.push({ type: "union", symbol });
      },
      exitUnion: (_: Union) => {
        const scope = scopes.pop();
        if (scope === undefined || scope.type !== "union") {
          throw new Error("Expected union scope");
        }
        const { symbol } = scope;
        if (symbol.kind === "type_union") {
          const goNames = new Set<string>();
          const jsNames = new Set<string>();
          const types = new Set<BaseSymbol>();
          for (const variant of symbol.variants) {
            if (variant.tag.type.kind !== "constant") {
              throw new Error(`Discriminator ${variant.tag.name} must be a constant property.`);
            }
            goNames.add(variant.tag.goName);
            jsNames.add(variant.tag.name);
            types.add(variant.tag.type.type);
          }
          if (goNames.size !== 1 || jsNames.size !== 1 || types.size !== 1) {
            throw new Error(
              `The discriminator for all variants of union ${symbol.name} should have the same encoded name and type.`,
            );
          }
          symbol.discriminator = {
            name: symbol.discriminatorName,
            goName: goNames.values().next().value!,
            jsonName: jsNames.values().next().value!,
            type: types.values().next().value!,
          };
        }
        namespace.symbols.push(symbol);
      },
      unionVariant: (variant: UnionVariant) => {
        const parentScope = scopes[scopes.length - 1];
        if (parentScope.type === "property") {
          return;
        }
        if (parentScope.type !== "union") {
          throw new Error("Expected union scope");
        }
        if (parentScope.symbol.kind === "value_union") {
          const { type } = variant;
          if (supportedLiteral(type)) {
            const [typeName, value] = getLiteralValue(type);
            const typeSymbol = symbolTable.find(typeName, "TypeSpec");
            if (typeSymbol === undefined) {
              throw new Error(`Type ${typeName} not found.`);
            }
            parentScope.symbol.checkAndSetType(typeSymbol, true);

            const variantName = typeof variant.name === "string" ? variant.name : camelCase(`${value.value}`);
            const goName = getEncodedName(variant, "text/x-go") || pascalCase(variantName);
            const doc = getDoc(variant);
            parentScope.symbol.variants.push({
              name: variantName,
              goName,
              doc,
              value,
            });
            scopes.push({ type: "union-variant", name: variantName, union: parentScope.symbol });
          } else if (type.kind === "Scalar") {
            const scalarSymbol = symbolTable.find(type.name, type.namespace?.name);
            if (scalarSymbol === undefined) {
              throw new Error(`Type ${type.name} not found.`);
            }
            parentScope.symbol.checkAndSetType(scalarSymbol, false);
            scopes.push({ type: "union-variant", name: scalarSymbol.name, union: parentScope.symbol });
          } else {
            throw new Error(`Unsupported union variant kind ${type.kind}`);
          }
        } else {
          if (variant.type.kind !== "Model") {
            throw new Error(`Types of kind ${variant.type.kind} are not supported for discriminated unions.`);
          }
          scopes.push({ type: "union-variant", name: variant.type.name, union: parentScope.symbol });
        }
      },
      exitUnionVariant: (variant: UnionVariant) => {
        if (scopes[scopes.length - 1].type === "property") {
          return;
        }
        scopes.pop();
        const parentScope = scopes[scopes.length - 1];
        if (parentScope.type !== "union") {
          throw new Error("Expected union scope");
        }
        const { symbol } = parentScope;
        if (symbol.kind === "type_union") {
          if (variant.type.kind !== "Model") {
            throw new Error(`Types of kind ${variant.type.kind} are not supported for discriminated unions.`);
          }
          const variantType = symbolTable.find(variant.type.name, variant.type.namespace?.name);
          if (variantType === undefined) {
            throw new Error(`Type ${variant.type.name} not found.`);
          }
          if (variantType.kind !== "model") {
            throw new Error(`Expected a model symbol as type for the union variant ${variant.type.name}`);
          }
          const discriminatorField = variantType.properties.find((p) => p.name === symbol.discriminatorName);
          if (discriminatorField === undefined) {
            throw new Error(`Could not find discriminator ${symbol.discriminatorName} in variant ${variantType.name}`);
          }
          if (discriminatorField.type.kind !== "constant") {
            throw new Error(
              `Discriminator ${symbol.discriminatorName} in variant ${variantType.name} must be a constant property.`,
            );
          }

          symbol.variants.push({
            name: variantType.name,
            goName: variantType.goName,
            doc: getDoc(variant),
            typeSymbol: variantType,
            tag: discriminatorField,
          });
        }
      },
    });
  }

  for (const namespace of namespaces.values()) {
    const namespaceFile = `${context.emitterOutputDir}/${namespace.goName}/models.go`;
    await program.host.mkdirp(`${context.emitterOutputDir}/${namespace.goName}`);

    const shouldEmit = (s: Symbol): s is UnionSymbol | ModelSymbol =>
      ["model", "value_union", "type_union"].includes(s.kind);

    const includes = namespace.symbols.filter(shouldEmit).flatMap((s) => {
      if (s.kind === "model") {
        return s.properties
          .map((p) => p.type)
          .filter((t) => t.kind === "model")
          .map((t) => t.type as Symbol)
          .filter((t) => t.kind === "built-in")
          .filter((t) => t.include !== undefined)
          .map((t) => t.include!);
      } else {
        return [];
      }
    });

    await program.host.writeFile(
      namespaceFile,
      emitHeader(namespace.goName, ["encoding/json", ...new Set(includes)]) +
        namespace.symbols
          .filter(shouldEmit)
          .map((s) => s.emit())
          .join("\n\n"),
    );
  }
}
