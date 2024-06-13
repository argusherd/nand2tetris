import {
  WriteStream,
  createReadStream,
  createWriteStream,
  existsSync,
  readdirSync,
  statSync,
} from "fs";
import { basename, extname, join } from "path";
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
import { commandGoto, commandIfGoto, commandLabel } from "./branching";
import commandPop from "./command-pop";
import commandPush from "./command-push";
import {
  commandCall,
  commandFunction,
  commandInit,
  commandReturn,
} from "./function";

const argv = process.argv.slice(2);
const inputPath = argv.at(0) ?? "";

if (!argv.length || !existsSync(inputPath))
  throw new Error(
    "No directory or file path proveded: npm run translate {PATH}"
  );

const filestat = statSync(inputPath);

let lineWriter: WriteStream;

if (filestat.isDirectory()) {
  const filename = basename(inputPath) + ".asm";
  const output = join(inputPath, filename);
  lineWriter = createWriteStream(output);

  lineWriter.write(commandInit().join("\n") + "\n");

  readdirSync(inputPath).forEach((file) => {
    if (!file.includes(".vm")) return;

    translate(join(inputPath, file));
  });
} else if (filestat.isFile()) {
  const extension = extname(inputPath);

  if (extension != ".vm")
    throw new Error("No .vm file proveded: npm run translate {FILENAME.vm}");

  lineWriter = createWriteStream(inputPath.replace(".vm", ".asm"));
  translate(inputPath);
}

function translate(filepath: string) {
  const readerInput = createReadStream(filepath);
  const lineReader = createInterface({ input: readerInput });
  const filename = basename(filepath, ".vm");

  lineReader.on("line", (line) => {
    line = line.split("/").at(0) ?? "";
    line = line.trim();

    if (!line.length || line.startsWith("/")) return;

    let content: string[] = [];

    if (line.startsWith("push")) content = commandPush(line, filename);
    if (line.startsWith("pop")) content = commandPop(line, filename);
    if (line.startsWith("add")) content = commandAdd();
    if (line.startsWith("sub")) content = commandSub();
    if (line.startsWith("neg")) content = commandNeg();
    if (line.startsWith("eq")) content = commandEq();
    if (line.startsWith("gt")) content = commandGt();
    if (line.startsWith("lt")) content = commandLt();
    if (line.startsWith("and")) content = commandAnd();
    if (line.startsWith("or")) content = commandOr();
    if (line.startsWith("not")) content = commandNot();
    if (line.startsWith("label")) content = commandLabel(line);
    if (line.startsWith("goto")) content = commandGoto(line);
    if (line.startsWith("if-goto")) content = commandIfGoto(line);
    if (line.startsWith("function")) content = commandFunction(line);
    if (line.startsWith("call")) content = commandCall(line);
    if (line.startsWith("return")) content = commandReturn();

    lineWriter.write(content.join("\n") + "\n");
  });
}
