import { createReadStream, createWriteStream, existsSync } from "fs";
import { basename, dirname, extname } from "path";
import { createInterface } from "readline";

const argv = process.argv.slice(2);
const asmPath = argv.at(0) ?? "";
const extension = extname(asmPath);

if (!argv.length || !existsSync(asmPath) || extension != ".asm")
  throw new Error("No .asm file proveded: npm run translate {FILE.asm}");

const outputPath = `${dirname(asmPath)}/${basename(asmPath).replace(
  ".asm",
  ".hack"
)}`;
const lineWriter = createWriteStream(outputPath);

const jumpTable = {
  null: "000",
  JGT: "001",
  JEQ: "010",
  JGE: "011",
  JLT: "100",
  JNE: "101",
  JLE: "110",
  JMP: "111",
};

const compTable = {
  "0": "0101010",
  "1": "0111111",
  "-1": "0111010",
  D: "0001100",
  A: "0110000",
  M: "1110000",
  "!D": "0001101",
  "!A": "0110001",
  "!M": "1110001",
  "D+1": "0011111",
  "A+1": "0110111",
  "M+1": "1110111",
  "D-1": "0001110",
  "A-1": "0110010",
  "M-1": "1110010",
  "D+A": "0000010",
  "D+M": "1000010",
  "D-A": "0010011",
  "D-M": "1010011",
  "A-D": "0000111",
  "M-D": "1000111",
  "D&A": "0000000",
  "D&M": "1000000",
  "D|A": "0010101",
  "D|M": "1010101",
};

const symbolTable: Record<string, number> = {
  R0: 0,
  R1: 1,
  R2: 2,
  R3: 3,
  R4: 4,
  R5: 5,
  R6: 6,
  R7: 7,
  R8: 8,
  R9: 9,
  R10: 10,
  R11: 11,
  R12: 12,
  R13: 13,
  R14: 14,
  R15: 15,
  SCREEN: 16384,
  KDB: 24576,
  SP: 0,
  LCL: 1,
  ARG: 2,
  THIS: 3,
  THAT: 4,
};

const scannerInput = createReadStream(asmPath);
const lineScanner = createInterface({ input: scannerInput });
let currentLine = 0;

lineScanner.on("line", (line) => {
  line = line.trim();

  if (!line.length || line.startsWith("/")) return;

  if (line.startsWith("(")) {
    const symbol = line.replace("(", "").replace(")", "");
    symbolTable[symbol] = currentLine;
    return;
  }

  currentLine++;
});

lineScanner.on("close", () => {
  const readerInput = createReadStream(asmPath);
  const lineReader = createInterface({ input: readerInput });

  lineReader.on("line", (line) => {
    line = line.trim();

    if (!line.length || line.startsWith("/") || line.startsWith("(")) return;

    if (line.startsWith("@")) outputAInstruction(line.replace("@", ""));
    else outputCInstruction(line);
  });
});

let variableAdress = 16;

function outputAInstruction(line: string) {
  let address = 0;

  if (isNaN(+line)) {
    if (line in symbolTable === false) symbolTable[line] = variableAdress++;

    address = symbolTable[line];
  } else {
    address = Number(line);
  }

  lineWriter.write((address >>> 0).toString(2).padStart(16, "0") + "\n");
}

function outputCInstruction(line: string) {
  const forJump = line.split(";");

  const jump = (forJump.at(1) ?? "null") as keyof typeof jumpTable;
  const jumpBin = jumpTable[jump];

  const destComp = forJump.at(0)?.split("=");

  if (!destComp) return;

  const dest = destComp.length === 1 ? "null" : destComp.at(0);
  const comp = destComp.length === 1 ? destComp.at(0) : destComp.at(1);
  const compBin = compTable[comp as keyof typeof compTable];

  const toA = dest?.includes("A") ? "1" : "0";
  const toD = dest?.includes("D") ? "1" : "0";
  const toM = dest?.includes("M") ? "1" : "0";
  const destBin = toA + toD + toM;

  lineWriter.write("111" + compBin + destBin + jumpBin + "\n");
}
