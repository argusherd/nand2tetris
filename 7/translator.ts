import { createReadStream, createWriteStream } from "fs";
import { basename } from "path";
import { createInterface } from "readline";
import {
  commandAdd,
  commandAnd,
  commandEq,
  commandGt,
  commandLt,
  commandNeg,
  commandNot,
  commandOr,
  commandSub,
} from "./arithmetic-logic";
import pop from "./command-pop";
import commandPush from "./command-push";

export function translate(filepath: string) {
  const outputPath = filepath.replace(".vm", ".asm");
  const lineWriter = createWriteStream(outputPath);
  const readerInput = createReadStream(filepath);
  const lineReader = createInterface({ input: readerInput });
  const filename = basename(filepath, ".vm");

  lineReader.on("line", (line) => {
    line = line.trim();

    if (!line.length || line.startsWith("/")) return;

    let content: string[] = [];

    if (line.startsWith("push")) content = commandPush(line, filename);
    if (line.startsWith("pop")) content = pop(line, filename);
    if (line.startsWith("add")) content = commandAdd();
    if (line.startsWith("sub")) content = commandSub();
    if (line.startsWith("neg")) content = commandNeg();
    if (line.startsWith("eq")) content = commandEq();
    if (line.startsWith("gt")) content = commandGt();
    if (line.startsWith("lt")) content = commandLt();
    if (line.startsWith("and")) content = commandAnd();
    if (line.startsWith("or")) content = commandOr();
    if (line.startsWith("not")) content = commandNot();

    lineWriter.write(content.join("\n") + "\n");
  });
}
