import { createTypeSpecLibrary } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "go-emitter",
  diagnostics: {},
});

export const { reportDiagnostic, createDiagnostic } = $lib;