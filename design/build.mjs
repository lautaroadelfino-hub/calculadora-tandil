// design/build.mjs
// Compila la biblioteca de piezas de LiquidAR: JS con esbuild, tipos con tsc y
// la hoja de estilos con la CLI de Tailwind. Salida en design/dist/.
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..");
mkdirSync(join(aqui, "dist"), { recursive: true });

await build({
  entryPoints: [join(aqui, "src/index.ts")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  external: ["react", "react-dom", "react/jsx-runtime"],
  outfile: join(aqui, "dist/index.js"),
  logLevel: "info",
});

const bin = (nombre) => join(raiz, "node_modules", ".bin", process.platform === "win32" ? `${nombre}.cmd` : nombre);
execSync(`"${bin("tsc")}" -p "${join(aqui, "tsconfig.json")}"`, { stdio: "inherit", cwd: aqui, shell: true });
execSync(`"${bin("tailwindcss")}" -i "${join(aqui, "src/styles.css")}" -o "${join(aqui, "dist/styles.css")}"`, { stdio: "inherit", cwd: aqui, shell: true });
console.log("liquidar-ui: dist/index.js, dist/*.d.ts y dist/styles.css listos");
