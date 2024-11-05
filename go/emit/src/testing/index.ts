import { resolvePath } from "@typespec/compiler";
import { createTestLibrary, TypeSpecTestLibrary } from "@typespec/compiler/testing";
import { fileURLToPath } from "url";

export const GoEmitterTestLibrary: TypeSpecTestLibrary = createTestLibrary({
  name: "go-emitter",
  packageRoot: resolvePath(fileURLToPath(import.meta.url), "../../.."),
});
