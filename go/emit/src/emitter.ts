// import { EmitContext, emitFile, resolvePath } from "@typespec/compiler";

// export async function $onEmit(context: EmitContext) {
//   if (!context.program.compilerOptions.noEmit) {
//     await emitFile(context.program, {
//       path: resolvePath(context.emitterOutputDir, "output.txt"),
//       content: "Hello world\n",
//     });
//   }
// }

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
import { code, CodeTypeEmitter, Context, EmitterOutput } from "@typespec/compiler/emitter-framework";
import { pascalCase } from "change-case";
import { emitHeader, getDoc, getEncodedName, stripIndent } from "./common.js";

interface Symbol {
  kind: "model" | "union";
  name: string;
  definition: string;
}

interface NamespaceDefinition {
  name: string;
  typespecDefinition: Namespace;
  goName: string;
  symbols: Symbol[];
}




function emitUnion(name: string, doc: string | undefined, type: string, variants: { name: string, doc: string | undefined, value: string }[]): string {
  return stripIndent`
    ${doc !== undefined ? `// ${name} ${doc}` : ""}
    type ${name} ${type}

    const (${variants.map(v => v.doc !== undefined ? `
      // ${v.name} ${v.doc}` : "" + `
      ${v.name} ${name} = ${v.value}`).join("")}
    )


    func (f *${name}) UnmarshalJSON(data []byte) error {
       var v ${type}
       if err := json.Unmarshal(data, &v); err != nil {
         return err
       }
       *f = ${name}(v)
       return nil
     }


    func (f ${name}) MarshalJSON() ([]byte, error) {
      return json.Marshal(f)
    }`;
}

export async function $onEmit(context: EmitContext): Promise<void> {
  const { program } = context;
  const builtInNamespaces = ["", "TypeSpec", "Reflection"];
  const namespaces = new Map<string, NamespaceDefinition>();

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
    }
  });
  interface UnionScope {
    kind: "union";
    name: string;
    doc: string | undefined;
    type: string | undefined;
    variants: { name: string, doc: string | undefined, value: string }[];
  }
  interface OtherScope {
    kind: "model" | "property";
    name: string;
  }
  type Scope = UnionScope | OtherScope;
  for (const namespace of namespaces.values()) {
    const scopes: Scope[] = [];
    navigateTypesInNamespace(namespace.typespecDefinition, {
      model: (model: Model) => {
        scopes.push({ kind: "model", name: model.name });
        console.log(`Model ${model.name}: Start`);
      },
      exitModel: (model: Model) => {
        scopes.pop();
        console.log(`Model ${model.name}: End`);
      },
      modelProperty: (property: ModelProperty) => {
        scopes.push({ kind: "property", name: property.name });
        console.log(`Property ${property.name}: Start`);
      },
      exitModelProperty: (property: ModelProperty) => {
        scopes.pop();
        console.log(`Property ${property.name}: End`);
      },
      union: (union: Union) => {
        const unionName = (() => {
          if (union.name === undefined) {
            /* Anonymous union (inline or alias), we'll best effort name it from the containing scopes */
            if (scopes[scopes.length - 1].kind === "property") {
              const propertyName = scopes[scopes.length - 1].name;
              const modelName = scopes[scopes.length - 2].name;
              return `${pascalCase(modelName)}${(pascalCase(propertyName))}`;
            } else {
              throw new Error("Anonymous union not contained in a property");
            }
          } else {
            return union.name;
          }
        })();
        const doc = getDoc(union);
        scopes.push({ kind: "union", name: unionName, doc, type: undefined, variants: [] });
      },
      exitUnion: (_: Union) => {
        const unionScope = scopes.pop()!;
        if (unionScope.kind !== "union") {
          throw new Error("Expected union scope");
        }
        if (unionScope.type === undefined) {
          throw new Error("Union type not defined");
        }
        namespace.symbols.push({ kind: "union", name: unionScope.name, definition: emitUnion(unionScope.name, unionScope.doc, unionScope.type, unionScope.variants) });
      },
      unionVariant: (variant: UnionVariant) => {
        const unionScope = scopes[scopes.length - 1];
        if (unionScope.kind !== "union") {
          throw new Error("Expected union scope");
        }
        const {type } = variant;
        if (type.kind === "String") {
          const variantName = typeof variant.name === "string" ? variant.name : type.value;
          const fullName = `${pascalCase(unionScope.name)}${pascalCase(variantName)}`;
          const doc = getDoc(variant);
          if (unionScope.type === undefined) {
            unionScope.type = "string";
          } else if (unionScope.type !== "string") {
            throw new Error("Union must contain only one scalar type");
          }
          unionScope.variants.push({ name: fullName, doc, value: `"${type.value}"` });
        } else if (type.kind === "Number") {
          const variantName = typeof variant.name === "string" ? variant.name : type.valueAsString;
          const fullName = `${pascalCase(unionScope.name)}${pascalCase(variantName)}`;
          const doc = getDoc(variant);
          if (unionScope.type === undefined) {
            unionScope.type = "int64";
          } else if (unionScope.type !== "int32" && unionScope.type !== "int64") {
            throw new Error("Union must contain only one scalar type");
          }
          unionScope.variants.push({ name: fullName, doc, value: type.valueAsString });
        } else if (type.kind === "Scalar") {
          unionScope.type = type.name;
        }
      },
      exitUnionVariant: (variant: UnionVariant) => {
        console.log(`Union variant ${variant.name.toString()}: End`);
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

    await program.host.writeFile(namespaceFile,
      emitHeader(namespace.goName, ["encoding/json"]) +
      namespace.symbols.filter(s => ["model", "union"].includes(s.kind)).map(s => s.definition).join("\n\n"));
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
    this.emitter.emitSourceFile
    return {
      scope: sourceFile.globalScope,
    };
  }


  modelDeclaration(model: Model, name: string): EmitterOutput<string> {
    const props = this.emitter.emitModelProperties(model);
    return this.emitter.result.declaration(name, code`type ${name} struct {\n ${props} \n}`);
  }

  modelPropertyLiteral(property: ModelProperty): EmitterOutput<string> {
    const doc = this.getDoc(property);
    const type = this.emitter.emitType(property.type);
    return code`${property.name} ${type} \`json:"${property.name},omitempty"\`\n`;
  }

  private mapScalarToGoType(scalar: Scalar): string {
    const scalarMap: Record<string, string> = {
      'string': 'string',
      'int32': 'int32',
      'int64': 'int64',
      'integer': 'int64',
      'float32': 'float32',
      'float64': 'float64',
      'boolean': 'bool',
      'date': 'time.Time',
      'datetime': 'time.Time',
      'duration': 'time.Duration',
      'uuid': 'string',
      'url': 'string',
      'email': 'string',
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
    const docDecorator = element.decorators.find(d => d.definition?.name === "@doc");
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
        values.push(code`${name}${variantName} ${name} = "${variant.type.value}"`);
      } else if (variant.type.kind === "Number") {
        if (scalar === undefined) {
          scalar = "int64";
        } else if (scalar !== "int32" && scalar !== "int64") {
          throw new Error("Unions must contain only one scalar type");
        }
        values.push(code`${name}${variantName} ${name} = ${variant.type.valueAsString}`);
      } else {
        throw new Error("Unions must contain only numbers or strings");
      }
    }
    if (scalar === undefined) {
      throw new Error("Union must contain a scalar type");
    }

    return this.emitter.result.declaration(name, code`
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
      }`);
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