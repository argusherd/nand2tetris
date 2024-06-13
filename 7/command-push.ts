const segmentTable = {
  local: "LCL",
  argument: "ARG",
  this: "THIS",
  that: "THAT",
};

export default function commandPush(command: string, filename: string) {
  command = command.replace("push ", "");
  const [segment, idx] = command.split(" ");

  if (segment == "constant") return pushConstant(idx);
  if (segment == "static") return pushFromLabel(filename + idx);
  if (segment == "temp") return pushFromLabel((5 + Number(idx)).toString());
  if (segment == "pointer")
    return idx === "0" ? pushFromLabel("THIS") : pushFromLabel("THAT");
  if (segment in segmentTable) {
    const baseAddr = segmentTable[segment as keyof typeof segmentTable];
    return pushFromSegment(baseAddr, idx);
  }

  return [];
}

function pushConstant(idx: string) {
  return [`@${idx}`, "D=A", "@SP", "A=M", "M=D", "@SP", "M=M+1"];
}

function pushFromLabel(label: string) {
  return [`@${label}`, "D=M", "@SP", "M=M+1", "A=M-1", "M=D"];
}

function pushFromSegment(baseAddr: string, offset: string) {
  return [
    `@${baseAddr}`,
    "D=M",
    `@${offset}`,
    "A=D+A",
    "D=M",
    "@SP",
    "A=M",
    "M=D",
    "@SP",
    "M=M+1",
  ];
}
