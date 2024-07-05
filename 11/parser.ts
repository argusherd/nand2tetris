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

let parsed: string[] = [];
let tokens: string[];
let index: number;

export function parse(parsable: string[]): string[] {
  tokens = parsable;
  index = 0;
  parsed = [];

  parsed.push("<class>");
  parsed.push(tokens[index++]); // 'class'
  parsed.push(tokens[index++]); // className
  parsed.push(tokens[index++]); // '{'
  compileClassVarDec();
  compileSubroutine();
  parsed.push(tokens[index++]); // '}'
  parsed.push("</class>");

  return parsed;
}

function compileClassVarDec() {
  const declarations = ["static", "field"];

  if (declarations.indexOf(currentValue()) == -1) return;

  parsed.push("<classVarDec>");

  while (!tokens[index].includes(";")) {
    parsed.push(tokens[index++]);
  }

  parsed.push(tokens[index++]); // ';'
  parsed.push("</classVarDec>");

  compileClassVarDec(); // next class var dec
}

function compileSubroutine() {
  const declarations = ["constructor", "function", "method"];

  if (declarations.indexOf(currentValue()) == -1) return;

  parsed.push("<subroutineDec>");
  parsed.push(tokens[index++]); // 'constructor'|'function'|'method'
  parsed.push(tokens[index++]); // 'void'|type
  parsed.push(tokens[index++]); // subroutineName
  parsed.push(tokens[index++]); // '('
  compileParameterList();
  parsed.push(tokens[index++]); // ')'
  compileSubroutineBody();
  parsed.push("</subroutineDec>");

  compileSubroutine(); // next subroutine dec
}

function compileParameterList() {
  parsed.push("<parameterList>");
  while (!tokens[index].includes(")")) {
    parsed.push(tokens[index++]);
  }
  parsed.push("</parameterList>");
}

function compileSubroutineBody() {
  parsed.push("<subroutineBody>");
  parsed.push(tokens[index++]); // '{'
  compileVarDec();
  compileStatements();
  parsed.push(tokens[index++]); // '}'
  parsed.push("</subroutineBody>");
}

function compileVarDec() {
  if (!tokens[index].includes("var")) return;

  parsed.push("<varDec>");
  while (!tokens[index].includes(";")) parsed.push(tokens[index++]);
  parsed.push(tokens[index++]); // ';'
  parsed.push("</varDec>");

  compileVarDec(); // next var dec
}

function compileStatements() {
  parsed.push("<statements>");
  while (!tokens[index].includes("}")) {
    compileLet();
    compileIf();
    compileWhile();
    compileDo();
    compileReturn();
  }
  parsed.push("</statements>");
}

function compileLet() {
  if (!tokens[index].includes("let")) return;

  parsed.push("<letStatement>");
  parsed.push(tokens[index++]); // 'let'
  parsed.push(tokens[index++]); // varName
  if (tokens[index].includes("[")) {
    parsed.push(tokens[index++]); // '['
    compileExpression();
    parsed.push(tokens[index++]); // ']'
  }
  parsed.push(tokens[index++]); // '='
  compileExpression();
  parsed.push(tokens[index++]); // ';'
  parsed.push("</letStatement>");
}

function compileIf() {
  if (!tokens[index].includes("if")) return;

  parsed.push("<ifStatement>");
  parsed.push(tokens[index++]); // 'if'
  parsed.push(tokens[index++]); // '('
  compileExpression();
  parsed.push(tokens[index++]); // ')'
  parsed.push(tokens[index++]); // '{'
  compileStatements();
  parsed.push(tokens[index++]); // '}'

  if (tokens[index].includes("else")) {
    parsed.push(tokens[index++]); // 'else'
    parsed.push(tokens[index++]); // '{'
    compileStatements();
    parsed.push(tokens[index++]); // '}'
  }

  parsed.push("</ifStatement>");
}

function compileWhile() {
  if (!tokens[index].includes("while")) return;

  parsed.push("<whileStatement>");
  parsed.push(tokens[index++]); // 'while'
  parsed.push(tokens[index++]); // '('
  compileExpression();
  parsed.push(tokens[index++]); // ')'
  parsed.push(tokens[index++]); // '{'
  compileStatements();
  parsed.push(tokens[index++]); // '}'
  parsed.push("</whileStatement>");
}

function compileDo() {
  if (!tokens[index].includes("do")) return;

  parsed.push("<doStatement>");
  parsed.push(tokens[index++]); // 'do'
  compileExpression();
  parsed.push(tokens[index++]); // ';'
  parsed.push("</doStatement>");
}

function compileReturn() {
  if (!tokens[index].includes("return")) return;

  parsed.push("<returnStatement>");
  parsed.push(tokens[index++]); // 'return'
  if (!tokens[index].includes(";")) compileExpression();
  parsed.push(tokens[index++]); // ';'
  parsed.push("</returnStatement>");
}

function compileExpression() {
  var op = ["+", "-", "*", "/", "&", "|", "&lt;", ">", "="];

  parsed.push("<expression>");
  compileTerm();
  while (op.indexOf(currentValue()) > -1) {
    parsed.push(tokens[index++]); // op
    compileTerm();
  }
  parsed.push("</expression>");
}

function compileTerm() {
  var unaryOp = ["-", "~"];
  parsed.push("<term>");
  if (unaryOp.indexOf(currentValue()) > -1) {
    parsed.push(tokens[index++]); // unaryOp
    compileTerm();
  } else if (tokens[index].includes("(")) {
    parsed.push(tokens[index++]); // '('
    compileExpression();
    parsed.push(tokens[index++]); // ')'
  } else {
    parsed.push(tokens[index++]); // integerConstant|stringConstant|keywordConstant|varName|subroutineName|className

    if (tokens[index].includes("[")) {
      parsed.push(tokens[index++]); // '['
      compileExpression();
      parsed.push(tokens[index++]); // ']'
    } else if (tokens[index].includes("(")) {
      parsed.push(tokens[index++]); // '('
      compileExpressionList();
      parsed.push(tokens[index++]); // ')'
    } else if (tokens[index].includes(".")) {
      parsed.push(tokens[index++]); // '.'
      parsed.push(tokens[index++]); // subroutineName
      parsed.push(tokens[index++]); // '('
      compileExpressionList();
      parsed.push(tokens[index++]); // ')'
    }
  }
  parsed.push("</term>");
}

function compileExpressionList() {
  parsed.push("<expressionList>");

  if (tokens[index].includes(")")) {
    parsed.push("</expressionList>");
    return;
  }

  compileExpression();
  while (tokens[index].includes(",")) {
    parsed.push(tokens[index++]); // ','
    compileExpression();
  }
  parsed.push("</expressionList>");
}

function currentValue() {
  return tokens[index].substring(
    tokens[index].indexOf(">") + 1,
    tokens[index].lastIndexOf("<")
  );
}
