import { createReadStream, createWriteStream } from "fs";
import { createInterface } from "readline";

const symbol = [
  "{",
  "}",
  "(",
  ")",
  "[",
  "]",
  ".",
  ",",
  ";",
  "+",
  "-",
  "*",
  "/",
  "&",
  "|",
  "<",
  ">",
  "=",
  "~",
];

const keyword = [
  "class",
  "constructor",
  "function",
  "method",
  "field",
  "static",
  "var",
  "int",
  "char",
  "boolean",
  "void",
  "true",
  "false",
  "null",
  "this",
  "let",
  "do",
  "if",
  "else",
  "while",
  "return",
];

export async function tokenize(
  writePath: string,
  readPath: string
): Promise<string[]> {
  const writer = createWriteStream(writePath);
  const readStream = createReadStream(readPath);
  const reader = createInterface({ input: readStream });

  let tokens: string[] = [];

  writer.write("<tokens>\n");

  for await (let line of reader) {
    line = line.trim();

    if (
      !line ||
      line.startsWith("/**") ||
      line.startsWith("*") ||
      line.endsWith("*/")
    )
      continue;

    let token = "";

    for (let i = 0; i < line.length; i++) {
      if (line[i] == "/" && line[i + 1] == "/") break;
      if (line[i] == " " && !token) continue;

      if (line[i] == '"' && token.startsWith('"')) {
        writer.write(tokenizedString(token, tokens));
        token = "";
      } else if (line[i] == " " && !token.startsWith('"')) {
        writer.write(tokenizedString(token, tokens));
        token = "";
      } else if (symbol.indexOf(line[i]) > -1 && !token) {
        writer.write(tokenizedSymbol(line[i], tokens));
      } else if (symbol.indexOf(line[i]) > -1) {
        writer.write(tokenizedString(token, tokens));
        writer.write(tokenizedSymbol(line[i], tokens));
        token = "";
      } else {
        token += line[i];
      }
    }
  }

  writer.write("</tokens>\n");

  return tokens;
}

function tokenizedString(token: string, tokens: string[]) {
  let tag = "";

  if (keyword.indexOf(token) > -1) tag = "keyword";
  else if (token.startsWith('"')) tag = "stringConstant";
  else if (!isNaN(+token)) tag = "integerConstant";
  else tag = "identifier";

  const tokenized = `<${tag}>${token.replace(/"/g, "")}</${tag}>\n`;

  tokens.push(tokenized);

  return tokenized;
}

function tokenizedSymbol(token: string, tokens: string[]) {
  const tokenized = `<symbol>${token
    .replace("&", "&amp;")
    .replace("<", "&lt;")
    .replace(">", "&gt;")}</symbol>\n`;

  tokens.push(tokenized);

  return tokenized;
}
