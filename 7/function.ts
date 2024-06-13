let returnCount = 1;

export function commandInit() {
  return ["@256", "D=A", "@SP", "M=D", ...commandCall("call Sys.init 0")];
}

export function commandCall(line: string) {
  line = line.replace("call ", "");
  const [funcname, argCount] = line.split(" ");

  const returnLabel = `$${funcname}$ret.${returnCount++}`;

  const pushToStack = (segment: string) => [
    `@${segment}`,
    "D=M",
    "@SP",
    "AM=M+1",
    "A=A-1",
    "M=D",
  ];

  return [
    `@${returnLabel}`,
    "D=A",
    "@SP",
    "AM=M+1",
    "A=A-1",
    `M=D`,
    ...pushToStack("LCL"),
    ...pushToStack("ARG"),
    ...pushToStack("THIS"),
    ...pushToStack("THAT"),
    "@SP",
    "D=M",
    "@5",
    "D=D-A",
    `@${argCount}`,
    "D=D-A",
    "@ARG",
    "M=D",
    "@SP",
    "D=M",
    "@LCL",
    "M=D",
    `@${funcname}`,
    "0;JMP",
    `(${returnLabel})`,
  ];
}

export function commandFunction(line: string) {
  line = line.replace("function ", "");
  const [funcname, localCount] = line.split(" ");

  const asm = [`(${funcname})`];
  for (let i = 0; i < Number(localCount); i++) {
    asm.push("@SP", "AM=M+1", "A=A-1", "M=0");
  }

  return asm;
}

export function commandReturn() {
  const restoreSegment = (segment: string) => [
    "@R13",
    "AM=M-1",
    "D=M",
    `@${segment}`,
    "M=D",
  ];

  return [
    "@LCL",
    "D=M",
    "@R13", // endFrame
    "M=D",
    "@5",
    "A=D-A",
    "D=M",
    "@R14", // retAddr
    "M=D",
    "@SP",
    "AM=M-1",
    "D=M",
    "@ARG",
    "A=M",
    "M=D",
    "@ARG",
    "D=M+1",
    "@SP",
    "M=D",
    ...restoreSegment("THAT"),
    ...restoreSegment("THIS"),
    ...restoreSegment("ARG"),
    ...restoreSegment("LCL"),
    "@R14",
    "A=M",
    "0;JMP",
  ];
}
