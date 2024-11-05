import { Optional } from "./common.js";

export interface BaseSymbol {
  kind: string;
  name: string;
  goName: string;
  namespace: Optional<string>;
}

export class SymbolTable<T extends BaseSymbol> {
  private table: Map<string, T> = new Map();

  private getKey(name: string, namespace: Optional<string>) {
    return namespace ? `${namespace}$$${name}` : `$$global$$${name}`;
  }

  push(symbol: T) {
    const key = this.getKey(symbol.name, symbol.namespace);
    if (this.table.has(key)) {
      throw new Error(`Duplicate symbol: ${key}`);
    }
    this.table.set(key, symbol);
  }

  find(name: string, namespace: Optional<string> = undefined): Optional<T> {
    const key = this.getKey(name, namespace);
    return this.table.get(key);
  }

  deferResolve(name: string, namespace: Optional<string>): () => T {
    const self = this;
    return () => {
      const resolved = self.find(name, namespace);
      if (resolved === undefined) {
        throw new Error(`Could not resolve symbol ${name}`);
      }
      return resolved;
    };
  }
}
