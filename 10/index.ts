import { existsSync, readdirSync, statSync } from "fs";
import { extname, join } from "path";
import { parse } from "./parser";
import { tokenize } from "./tokenizer";

const argv = process.argv.slice(2);
const inputPath = argv.at(0) ?? "";

if (!argv.length || !existsSync(inputPath))
  throw new Error("No directory or file path proveded: npm run compile {PATH}");

const filestat = statSync(inputPath);

if (filestat.isDirectory()) {
  readdirSync(inputPath).forEach(async (file) => {
    if (!file.includes(".jack")) return;

    const jackReadPath = join(inputPath, file);
    const tokenWritePath = jackReadPath.replace(".jack", ".token.xml");
    const compileWritePath = jackReadPath.replace(".jack", ".parse.xml");
    const tokens = await tokenize(tokenWritePath, jackReadPath);
    parse(tokens, compileWritePath);
  });
} else if (filestat.isFile()) {
  const extension = extname(inputPath);

  if (extension != ".jack")
    throw new Error(
      "No .jack file proveded: npm run translate {FILENAME.jack}"
    );

  (async () => {
    const tokenWritePath = inputPath.replace(".jack", ".token.xml");
    const compileWritePath = inputPath.replace(".jack", ".parse.xml");
    const tokens = await tokenize(tokenWritePath, inputPath);
    parse(tokens, compileWritePath);
  })();
}
