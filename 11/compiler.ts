import { XMLParser } from "fast-xml-parser";

interface Variable {
  name: string;
  type: string | "int" | "char" | "boolean";
  kind: "this" | "static" | "local" | "argument" | "that";
  id: number;
}

interface Subroutine {
  name: string;
  kind: "constructor" | "function" | "method";
  returnType: string;
  params: Record<string, Variable>;
}

let xmlParser = new XMLParser();
let tokens: string[] = [];
let index = 0;
let vmCode = "";
let className = "";
let classParams: Record<string, Variable> = {};
let subroutine: Subroutine = {
  name: "",
  kind: "constructor",
  returnType: "",
  params: {},
};
let labelCount = 0;
let variableCount = {
  this: 0,
  static: 0,
  local: 0,
  argument: 0,
};

export function compile(parsed: string[]): string {
  tokens = parsed;
  index = 0;
  vmCode = "";
  className = "";
  classParams = {};
  labelCount = 0;
  variableCount = {
    this: 0,
    static: 0,
    local: 0,
    argument: 0,
  };

  tokens[index++]; // <class>
  tokens[index++]; // keyword class
  className = xmlParser.parse(tokens[index++])["identifier"]; // identifier className
  tokens[index++]; // symbol {
  compileClassVarDec();
  compileSubroutine();

  return vmCode;
}

function compileClassVarDec() {
  if (tokens[index] != "<classVarDec>") return;

  tokens[index++]; // <classVarDec>

  const kind = xmlParser.parse(tokens[index++])["keyword"]; // 'field'|'static'
  const type = xmlParser.parse(tokens[index++])["identifier"]; // 'int'|'char'|'boolean'|className

  while (tokens[index] != "</classVarDec>") {
    const name = xmlParser.parse(tokens[index++])["identifier"]; // varName

    classParams[name] = {
      kind: kind === "field" ? "this" : "static",
      type,
      name,
      id: kind === "field" ? variableCount.this++ : variableCount.static++,
    };

    tokens[index++]; // symbol ','|';'
  }

  tokens[index++]; // </classVarDec>

  compileClassVarDec();
}

function compileSubroutine() {
  if (tokens[index] != "<subroutineDec>") return;

  subroutine = {
    name: "",
    kind: "constructor",
    returnType: "",
    params: {},
  };
  variableCount.argument = 0;
  variableCount.local = 0;

  tokens[index++]; // <subroutineDec>
  subroutine.kind = xmlParser.parse(tokens[index++])["keyword"]; // keyword 'constructor'|'function'|'method'
  subroutine.returnType = xmlParser.parse(tokens[index++])["keyword"]; // keyword 'void'|type
  subroutine.name = xmlParser.parse(tokens[index++])["identifier"]; // identifier subroutineName
  tokens[index++]; // symbol (
  compileParameterList();
  tokens[index++]; // symbol )
  compileSubroutineBody();
  tokens[index++]; // </subroutineDec>

  compileSubroutine();
}

function compileParameterList() {
  tokens[index++]; // <parameterList>

  if (subroutine.kind === "method") {
    subroutine.params["this"] = {
      type: className,
      kind: "argument",
      name: "this",
      id: variableCount.argument++,
    };
  }

  while (tokens[index] != "</parameterList>") {
    const tag = xmlParser.parse(tokens[index++]);
    const type = tag["keyword"] || tag["identifier"]; // keyword|identifier 'int'|'char'|'boolean'|className
    const varName = xmlParser.parse(tokens[index++])["identifier"]; // identifier varName

    subroutine.params[varName] = {
      type,
      name: varName,
      kind: "argument",
      id: variableCount.argument++,
    };

    if (tokens[index].startsWith("<symbol>")) tokens[index++]; // symbol ,
  }

  tokens[index++]; // </parameterList>
}

function compileSubroutineBody() {
  tokens[index++]; // <subroutineBody>
  tokens[index++]; // symbol '{'
  compileVarDec();
  vmCode += `function ${className}.${subroutine.name} ${variableCount.local}\n`;
  if (subroutine.kind === "constructor") {
    vmCode += `push constant ${variableCount.this ?? 2}\n`;
    vmCode += "call Memory.alloc 1\n";
    vmCode += "pop pointer 0\n";
  }
  if (subroutine.kind === "method") {
    vmCode += "push argument 0\n";
    vmCode += "pop pointer 0\n";
  }
  compileStatements();
  tokens[index++]; // symbol '}'
  tokens[index++]; // </subroutineBody>
}

function compileVarDec() {
  if (tokens[index] != "<varDec>") return;

  tokens[index++]; // <varDec>
  tokens[index++]; // keyword 'var'

  const tag = xmlParser.parse(tokens[index++]);
  const type = tag["keyword"] || tag["identifier"]; // (keyword 'int'|'char'|'boolean'|)|(identifier className)
  while (tokens[index] != "</varDec>") {
    const name = xmlParser.parse(tokens[index++])["identifier"]; // varName

    subroutine.params[name] = {
      type,
      name,
      kind: "local",
      id: variableCount.local++,
    };

    tokens[index++]; // symbol ','|';'
  }

  tokens[index++]; // </varDec>

  compileVarDec();
}

function compileStatements() {
  tokens[index++]; // <statements>

  while (tokens[index] != "</statements>") {
    if (tokens[index] == "<letStatement>") compileLet();
    if (tokens[index] == "<ifStatement>") compileIf();
    if (tokens[index] == "<whileStatement>") compileWhile();
    if (tokens[index] == "<doStatement>") compileDo();
    if (tokens[index] == "<returnStatement>") compileReturn();
  }

  tokens[index++]; // </statements>
}

function compileLet() {
  tokens[index++]; // <letStatement>
  tokens[index++]; // keyword 'let'

  const varName = xmlParser.parse(tokens[index++])["identifier"]; // varName
  const symbol = xmlParser.parse(tokens[index++])["symbol"]; // symbol '='|'['
  const assignee =
    varName in subroutine.params
      ? subroutine.params[varName]
      : classParams[varName];

  // array assignment
  if (symbol == "[") {
    vmCode += `push ${assignee.kind} ${assignee.id}\n`;
    compileExpression();
    vmCode += "add\n";

    tokens[index++]; // symbol ']'
    tokens[index++]; // symbol '='
  }

  compileExpression();

  if (symbol == "[") {
    vmCode += "pop temp 0\n";
    vmCode += "pop pointer 1\n";
    vmCode += "push temp 0\n";
    vmCode += "pop that 0\n";
  } else {
    vmCode += `pop ${assignee.kind} ${assignee.id}\n`;
  }

  tokens[index++]; // symbol ';'
  tokens[index++]; // </letStatement>
}

function compileIf() {
  tokens[index++]; // <ifStatment>
  tokens[index++]; // keyword 'if'
  tokens[index++]; // symbol '('

  const L1 = `${className}.${subroutine.name}.L${labelCount++}`;
  const L2 = `${className}.${subroutine.name}.L${labelCount++}`;
  compileExpression();

  tokens[index++]; // symbol ')'
  tokens[index++]; // symbol '{'

  vmCode += "not\n";
  vmCode += `if-goto ${L1}\n`;
  compileStatements();
  tokens[index++]; // symbol '}'

  vmCode += `goto ${L2}\n`;
  vmCode += `label ${L1}\n`;

  if (tokens[index] != "</ifStatement>") {
    tokens[index++]; // keyword 'else'
    tokens[index++]; // symbol '{'
    compileStatements();
    tokens[index++]; // symbol '}'
  }

  vmCode += `label ${L2}\n`;

  tokens[index++]; // </ifStatment>
}

function compileWhile() {
  tokens[index++]; // <whileStatement>
  tokens[index++]; // keyword while
  tokens[index++]; // symbol '('

  const L1 = `${className}.${subroutine.name}.L${labelCount++}`;
  const L2 = `${className}.${subroutine.name}.L${labelCount++}`;

  vmCode += `label ${L1}\n`;
  compileExpression();
  vmCode += "not\n";

  tokens[index++]; // symbol ')'
  tokens[index++]; // symbol '{'

  vmCode += `if-goto ${L2}\n`;
  compileStatements();
  vmCode += `goto ${L1}\n`;
  vmCode += `label ${L2}\n`;

  tokens[index++]; // symbol '}'
  tokens[index++]; // </whileStatement>
}

function compileDo() {
  tokens[index++]; // <doStatement>
  tokens[index++]; // keyword 'do'

  compileExpression();

  vmCode += "pop temp 0\n";

  tokens[index++]; // symbol ';'
  tokens[index++]; // </doStatement>
}

function compileReturn() {
  tokens[index++]; // <returnStatement>
  tokens[index++]; // keyword 'return'

  if (subroutine.returnType == "void") vmCode += "push constant 0\n";
  else compileExpression();

  vmCode += "return\n";

  tokens[index++]; // symbol ';'
  tokens[index++]; // </returnStatement>
}

function compileExpression() {
  const opTable = {
    "+": "add\n",
    "-": "sub\n",
    "*": "call Math.multiply 2\n",
    "/": "call Math.divide 2\n",
    "&": "and\n",
    "|": "or\n",
    "<": "lt\n",
    ">": "gt\n",
    "=": "eq\n",
  };

  tokens[index++]; // <expression>

  compileTerm();

  while (tokens[index] != "</expression>") {
    const op = xmlParser.parse(tokens[index++])["symbol"]; // symbol op

    compileTerm();

    vmCode += opTable[op as keyof typeof opTable];
  }

  tokens[index++]; // </expression>
}

function compileTerm() {
  const unaryOpTable = { "-": "neg\n", "~": "not\n" };
  const keywordTable = {
    true: "push constant 1\nneg\n",
    false: "push constant 0\n",
    null: "push constant 0\n",
    this: "push pointer 0\n",
  };

  tokens[index++]; // <term>

  // integerConstant
  if (tokens[index].startsWith("<integerConstant>"))
    vmCode += `push constant ${
      xmlParser.parse(tokens[index++])["integerConstant"]
    }\n`;

  // stringConstant
  if (tokens[index].startsWith("<stringConstant>")) {
    const s: string = xmlParser.parse(tokens[index++])["stringConstant"];

    vmCode += `push constant ${s.length}\n`;
    vmCode += "call String.new 1\n";

    for (let i = 0; i < s.length; i++) {
      vmCode += `push constant ${s.charCodeAt(i)}\n`;
      vmCode += "call String.appendChar 2\n";
    }
  }

  // keywordConstant
  if (tokens[index].startsWith("<keyword>")) {
    const keyword = xmlParser.parse(tokens[index++])["keyword"]; // 'true'|'false'|'null'|'this'
    vmCode += keywordTable[keyword as keyof typeof keywordTable];
  }

  // varName
  if (
    tokens[index].startsWith("<identifier>") &&
    tokens[index + 1] == "</term>"
  ) {
    const name = xmlParser.parse(tokens[index++])["identifier"]; // varName
    const variable: Variable =
      name in subroutine.params ? subroutine.params[name] : classParams[name];
    vmCode += `push ${variable.kind} ${variable.id}\n`;
  }

  // varName[]
  if (
    tokens[index].startsWith("<identifier>") &&
    tokens[index + 1] == "<symbol>[</symbol>"
  ) {
    const name = xmlParser.parse(tokens[index++])["identifier"]; // varName
    const variable: Variable =
      name in subroutine.params ? subroutine.params[name] : classParams[name];
    vmCode += `push ${variable.kind} ${variable.id}\n`;
    tokens[index++]; // symbol '['
    compileExpression();
    vmCode += "add\n";
    vmCode += "pop pointer 1\n";
    vmCode += "push that 0\n";
    tokens[index++]; // symbol ']'
  }

  // unaryOp term
  if (tokens[index].startsWith("<symbol>") && tokens[index + 1] == "<term>") {
    const unaryOp = xmlParser.parse(tokens[index++])["symbol"]; // '-'|'~'
    compileTerm();
    vmCode += unaryOpTable[unaryOp as keyof typeof unaryOpTable];
  }

  // subroutineCall
  if (tokens[index].startsWith("<identifier>")) {
    let calleeName = "";
    let n = 0;

    if (tokens[index + 1] == "<symbol>.</symbol>") {
      calleeName = xmlParser.parse(tokens[index++])["identifier"]; // className|varName
      tokens[index++]; // '.'
    }
    const calleeSub = xmlParser.parse(tokens[index++])["identifier"]; // subroutineName

    // calling self method
    if (!calleeName) {
      vmCode += "push pointer 0\n";
      n++;
    }

    // convert varName to className
    if (
      calleeName &&
      (calleeName in subroutine.params || calleeName in classParams)
    ) {
      var variable =
        calleeName in subroutine.params
          ? subroutine.params[calleeName]
          : classParams[calleeName];
      calleeName = variable.type;
      n++;
      vmCode += "push pointer 0\n";
      vmCode += `push ${variable.kind} ${variable.id}\n`;
    }

    tokens[index++]; // '('
    n += compileExpressionList();
    tokens[index++]; // ')'

    vmCode += `call ${calleeName || className}.${calleeSub} ${n}\n`;
  }

  // (expression)
  if (tokens[index].startsWith("<symbol>")) {
    tokens[index++]; // symbol (
    compileExpression();
    tokens[index++]; // symbol )
  }

  tokens[index++]; // </term>
}

function compileExpressionList(): number {
  tokens[index++]; // <expressionList>

  let n = 0;

  while (tokens[index] != "</expressionList>") {
    compileExpression();
    n++;
    if (tokens[index].startsWith("<symbol>")) tokens[index++]; // symbol ','
  }

  tokens[index++]; // </expressionList>

  return n;
}
