import {
    EmitContext,
    EmitEntity,
    EmitterOutput,
    Enum,
    Interface,
    Model,
    ModelProperty,
    Program,
    Type,
  } from "@typespec/compiler";

  export async function $onEmit(context: EmitContext) {
    const { program } = context;
    const emitter = new GoEmitter(program);
    return emitter.emit();
  }

  class GoEmitter {
    private output: EmitterOutput = {};

    constructor(private program: Program) {}

    emit(): EmitterOutput {
      // Process all types in the program
      for (const type of this.program.types.getTypes()) {
        if (type instanceof Model) {
          this.emitModel(type);
        } else if (type instanceof Enum) {
          this.emitEnum(type);
        } else if (type instanceof Interface) {
          this.emitInterface(type);
        }
      }
      return this.output;
    }

    private emitModel(model: Model) {
      const structName = this.getTypeName(model);
      let content = `// ${structName} represents ${model.description || 'a model'}\n`;
      content += `type ${structName} struct {\n`;

      for (const prop of model.properties.values()) {
        content += this.emitModelProperty(prop);
      }

      content += '}\n\n';
      this.output[`${structName}.go`] = content;
    }

    private emitModelProperty(prop: ModelProperty): string {
      const fieldName = this.capitalizeFirstLetter(prop.name);
      const fieldType = this.getGoType(prop.type);
      const jsonTag = `\`json:"${prop.name},omitempty"\``;

      let comment = '';
      if (prop.description) {
        comment = `\t// ${prop.description}\n`;
      }

      return `${comment}\t${fieldName} ${fieldType} ${jsonTag}\n`;
    }

    private emitEnum(enum_: Enum) {
      const enumName = this.getTypeName(enum_);
      let content = `// ${enumName} represents ${enum_.description || 'an enumeration'}\n`;
      content += `type ${enumName} string\n\n`;
      content += 'const (\n';

      for (const [memberName, member] of enum_.members) {
        const goMemberName = `${enumName}_${this.capitalizeFirstLetter(memberName)}`;
        content += `\t${goMemberName} ${enumName} = "${member.value || memberName}"\n`;
      }

      content += ')\n\n';
      this.output[`${enumName}.go`] = content;
    }

    private emitInterface(interface_: Interface) {
      const interfaceName = this.getTypeName(interface_);
      let content = `// ${interfaceName} represents ${interface_.description || 'an interface'}\n`;
      content += `type ${interfaceName} interface {\n`;

      for (const operation of interface_.operations.values()) {
        const returnType = this.getGoType(operation.returnType);
        const params = operation.parameters.map(param =>
          `${this.capitalizeFirstLetter(param.name)} ${this.getGoType(param.type)}`
        ).join(', ');

        content += `\t${this.capitalizeFirstLetter(operation.name)}(${params}) ${returnType}\n`;
      }

      content += '}\n\n';
      this.output[`${interfaceName}.go`] = content;
    }

    private getGoType(type: Type): string {
      // Basic type mapping
      const typeMap: Record<string, string> = {
        'string': 'string',
        'number': 'float64',
        'integer': 'int64',
        'boolean': 'bool',
        'any': 'interface{}',
      };

      if (type.kind === 'Intrinsic') {
        return typeMap[type.name] || 'interface{}';
      }

      if (type.kind === 'Array') {
        const elementType = this.getGoType(type.elementType);
        return `[]${elementType}`;
      }

      // For custom types, use the type name
      return this.getTypeName(type);
    }

    private getTypeName(type: Type): string {
      return type.name;
    }

    private capitalizeFirstLetter(str: string): string {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
  }

  export const emitter = createEmitter({
    name: "go-emitter",
    onEmit: $onEmit,
  });