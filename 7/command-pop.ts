const segmentTable = {
  local: "LCL",
  argument: "ARG",
  this: "THIS",
  that: "THAT",
};

export default function commandPop(command: string, filename: string) {
  command = command.replace("pop ", "");
  const [segment, idx] = command.split(" ");

  if (segment == "static") return popToLabel(filename + idx);
  if (segment == "temp") return popToLabel((5 + Number(idx)).toString());
  if (segment == "pointer")
    return idx === "0" ? popToLabel("THIS") : popToLabel("THAT");
  if (segment in segmentTable) {
    const baseAddr = segmentTable[segment as keyof typeof segmentTable];
    return popToSegment(baseAddr, idx);
  }
  return [];
}

function popToLabel(label: string) {
  return ["@SP", "AM=M-1", "D=M", `@${label}`, "M=D"];
}

function popToSegment(baseAddr: string, offset: string) {
  return [
    `@${baseAddr}`,
    "D=M",
    `@${offset}`,
    "D=D+A",
    "@SP",
    "M=M-1",
    "A=M+1",
    "M=D",
    "A=A-1",
    "D=M",
    "A=A+1",
    "A=M",
    "M=D",
  ];
}
