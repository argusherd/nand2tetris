import { createReadStream } from "fs";
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

export async function tokenize(readPath: string): Promise<string[]> {
  const readStream = createReadStream(readPath);
  const reader = createInterface({ input: readStream });

  let tokens: string[] = [];

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

      if (line[i] == '"' || token.startsWith('"')) {
        if (line[i] == '"' && token.startsWith('"')) {
          tokenizedString(token, tokens);
          token = "";
        } else {
          token += line[i];
        }

        continue;
      }

      if (line[i] == " ") {
        tokenizedString(token, tokens);
        token = "";
      } else if (symbol.indexOf(line[i]) > -1 && !token) {
        tokenizedSymbol(line[i], tokens);
      } else if (symbol.indexOf(line[i]) > -1) {
        tokenizedString(token, tokens);
        tokenizedSymbol(line[i], tokens);
        token = "";
      } else {
        token += line[i];
      }
    }
  }

  return tokens;
}

function tokenizedString(token: string, tokens: string[]) {
  let tag = "";

  if (keyword.indexOf(token) > -1) tag = "keyword";
  else if (token.startsWith('"')) tag = "stringConstant";
  else if (!isNaN(+token)) tag = "integerConstant";
  else tag = "identifier";

  const tokenized = `<${tag}>${token.replace(/"/g, "")}</${tag}>`;

  tokens.push(tokenized);

  return tokenized;
}

function tokenizedSymbol(token: string, tokens: string[]) {
  const tokenized = `<symbol>${token.replace("<", "&lt;")}</symbol>`;

  tokens.push(tokenized);

  return tokenized;
}
