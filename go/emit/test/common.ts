import fs from "fs/promises";
import path from "path";

export function normalizeCode(code: string): string {
    return code
        .replace(/\r\n/g, "\n")
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => line.trimEnd())
        .map((line) => line.trimStart())
        .join("\n");
}

async function readTestData(prefix: string): Promise<[string, string]> {
    const inputPath = `${prefix}.tsp`;
    const outputPath = `${prefix}.go`;
    const input = await fs.readFile(inputPath, "utf-8");
    const output = await fs.readFile(outputPath, "utf-8");
    return [input, output];
}

export function baseGetTestData(prefix: string): Promise<[string, string]> {
    const fullPrefix = path.join(__dirname, "data", prefix);
    return readTestData(fullPrefix);
}

export function scopeGetTestData(
    prefix: string,
    getTestData: (path: string) => Promise<[string, string]>,
) {
    return async (file: string) => {
        return getTestData(path.join(prefix, file));
    };
}