import { CompilerHost, Diagnostic, resolvePath } from "@typespec/compiler";
import {
  createTestHost,
  createTestWrapper,
  expectDiagnosticEmpty,
} from "@typespec/compiler/testing";
import { GoEmitterTestLibrary } from "../src/testing/index.js";

export async function createGoEmitterTestHost() {
  return createTestHost({
    libraries: [GoEmitterTestLibrary],
  });
}

export async function createGoEmitterTestRunner() {
  const host = await createGoEmitterTestHost();

  return createTestWrapper(host, {
    compilerOptions: {
      noEmit: false,
      emit: ["go-emitter"],
    },
  });
}

async function readDir(
  host: CompilerHost,
  directory: string,
): Promise<Record<string, string>> {
  const files = await host.readDir(directory);
  const result: Record<string, string> = {};
  for (const file of files) {
    const stat = await host.stat(resolvePath(directory, file));
    if (stat.isDirectory()) {
      const subDir = await readDir(host, resolvePath(directory, file));
      for (const subFile in subDir) {
        result[resolvePath(file, subFile)] = subDir[subFile];
      }
      continue;
    }
    result[file] = (await host.readFile(resolvePath(directory, file))).text;
  }
  return result;
}

export async function emitWithDiagnostics(
  code: string,
): Promise<[Record<string, string>, readonly Diagnostic[]]> {
  const runner = await createGoEmitterTestRunner();
  await runner.compileAndDiagnose(code, {
    outputDir: "tsp-output",
  });
  const emitterOutputDir = "./tsp-output/go-emitter";

  const result = await readDir(runner.program.host, emitterOutputDir);
  // const files = await runner.program.host.readDir(emitterOutputDir);

  // const result: Record<string, string> = {};
  // for (const file of files) {
  //   const stat = await runner.program.host.stat(resolvePath(emitterOutputDir, file));

  //   if (isDir(resolvePath(emitterOutputDir, file))) {
  //     continue;
  //   }
  //   result[file] = (await runner.program.host.readFile(resolvePath(emitterOutputDir, file))).text;
  // }
  return [result, runner.program.diagnostics];
}

export async function emit(code: string): Promise<Record<string, string>> {
  const [result, diagnostics] = await emitWithDiagnostics(code);
  expectDiagnosticEmpty(diagnostics);
  return result;
}
