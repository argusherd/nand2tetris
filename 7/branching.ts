export function commandLabel(line: string) {
  const label = line.replace("label ", "");

  return [`(${label})`];
}

export function commandGoto(line: string) {
  const label = line.replace("goto ", "");

  return [`@${label}`, "0;JMP"];
}

export function commandIfGoto(line: string) {
  const label = line.replace("if-goto ", "");

  return ["@SP", "AM=M-1", "D=M", `@${label}`, "D;JNE"];
}
