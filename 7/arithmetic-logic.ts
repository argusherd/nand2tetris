let comparisonCounter = 0;

export function commandAdd() {
  return ["@SP", "AM=M-1", "D=M", "A=A-1", "M=D+M"];
}

export function commandSub() {
  return ["@SP", "AM=M-1", "D=-M", "A=A-1", "M=D+M"];
}

export function commandNeg() {
  return ["@SP", "A=M-1", "M=-M"];
}

export function commandEq() {
  return commandComparision("JEQ");
}

export function commandGt() {
  return commandComparision("JGT");
}

export function commandLt() {
  return commandComparision("JLT");
}

function commandComparision(jump: string) {
  return [
    "@SP",
    "AM=M-1",
    "D=M",
    "A=A-1",
    "D=M-D",
    "M=-1",
    `@comparison${comparisonCounter}`,
    `D;${jump}`,
    "@SP",
    "A=M-1",
    "M=0",
    `(comparison${comparisonCounter++})`,
  ];
}

export function commandAnd() {
  return ["@SP", "AM=M-1", "D=M", "A=A-1", "M=D&M"];
}

export function commandOr() {
  return ["@SP", "AM=M-1", "D=M", "A=A-1", "M=D|M"];
}

export function commandNot() {
  return ["@SP", "A=M-1", "M=!M"];
}
