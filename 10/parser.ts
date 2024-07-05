import { WriteStream, createWriteStream } from "fs";

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
let writer: WriteStream;
let tokens: string[];
let index: number;

export function parse(parsable: string[], writePath: string) {
  writer = createWriteStream(writePath);
  tokens = parsable;
  index = 0;

  writer.write("<class>\n");
  writer.write(tokens[index++]); // 'class'
  writer.write(tokens[index++]); // className
  writer.write(tokens[index++]); // '{'
  compileClassVarDec();
  compileSubroutine();
  writer.write(tokens[index++]); // '}'
  writer.write("</class>\n");
}

function compileClassVarDec() {
  const declarations = ["static", "field"];

  if (declarations.indexOf(currentValue()) == -1) return;

  writer.write("<classVarDec>\n");

  while (!tokens[index].includes(";")) {
    writer.write(tokens[index++]);
  }

  writer.write(tokens[index++]); // ';'
  writer.write("</classVarDec>\n");

  compileClassVarDec(); // next class var dec
}

function compileSubroutine() {
  const declarations = ["constructor", "function", "method"];

  if (declarations.indexOf(currentValue()) == -1) return;

  writer.write("<subroutineDec>\n");
  writer.write(tokens[index++]); // 'constructor'|'function'|'method'
  writer.write(tokens[index++]); // 'void'|type
  writer.write(tokens[index++]); // subroutineName
  writer.write(tokens[index++]); // '('
  compileParameterList();
  writer.write(tokens[index++]); // ')'
  compileSubroutineBody();
  writer.write("</subroutineDec>\n");

  compileSubroutine(); // next subroutine dec
}

function compileParameterList() {
  writer.write("<parameterList>\n");
  while (!tokens[index].includes(")")) {
    writer.write(tokens[index++]);
  }
  writer.write("</parameterList>\n");
}

function compileSubroutineBody() {
  writer.write("<subroutineBody>\n");
  writer.write(tokens[index++]); // '{'
  compileVarDec();
  compileStatements();
  writer.write(tokens[index++]); // '}'
  writer.write("</subroutineBody>\n");
}

function compileVarDec() {
  if (!tokens[index].includes("var")) return;

  writer.write("<varDec>\n");
  while (!tokens[index].includes(";")) writer.write(tokens[index++]);
  writer.write(tokens[index++]); // ';'
  writer.write("</varDec>\n");

  compileVarDec(); // next var dec
}

function compileStatements() {
  writer.write("<statements>\n");
  while (!tokens[index].includes("}")) {
    compileLet();
    compileIf();
    compileWhile();
    compileDo();
    compileReturn();
  }
  writer.write("</statements>\n");
}

function compileLet() {
  if (!tokens[index].includes("let")) return;

  writer.write("<letStatement>\n");
  writer.write(tokens[index++]); // 'let'
  writer.write(tokens[index++]); // varName
  if (tokens[index].includes("[")) {
    writer.write(tokens[index++]); // '['
    compileExpression();
    writer.write(tokens[index++]); // ']'
  }
  writer.write(tokens[index++]); // '='
  compileExpression();
  writer.write(tokens[index++]); // ';'
  writer.write("</letStatement>\n");
}

function compileIf() {
  if (!tokens[index].includes("if")) return;

  writer.write("<ifStatement>\n");
  writer.write(tokens[index++]); // 'if'
  writer.write(tokens[index++]); // '('
  compileExpression();
  writer.write(tokens[index++]); // ')'
  writer.write(tokens[index++]); // '{'
  compileStatements();
  writer.write(tokens[index++]); // '}'

  if (tokens[index].includes("else")) {
    writer.write(tokens[index++]); // 'else'
    writer.write(tokens[index++]); // '{'
    compileStatements();
    writer.write(tokens[index++]); // '}'
  }

  writer.write("</ifStatement>\n");
}

function compileWhile() {
  if (!tokens[index].includes("while")) return;

  writer.write("<whileStatement>\n");
  writer.write(tokens[index++]); // 'while'
  writer.write(tokens[index++]); // '('
  compileExpression();
  writer.write(tokens[index++]); // ')'
  writer.write(tokens[index++]); // '{'
  compileStatements();
  writer.write(tokens[index++]); // '}'
  writer.write("</whileStatement>\n");
}

function compileDo() {
  if (!tokens[index].includes("do")) return;

  writer.write("<doStatement>\n");
  writer.write(tokens[index++]); // 'do'
  writer.write(tokens[index++]); // subroutineName|(className|varName)

  if (tokens[index].includes(".")) {
    writer.write(tokens[index++]); // '.'
    writer.write(tokens[index++]); // subroutineName
  }

  writer.write(tokens[index++]); // '('
  compileExpressionList();
  writer.write(tokens[index++]); // ')'
  writer.write(tokens[index++]); // ';'
  writer.write("</doStatement>\n");
}

function compileReturn() {
  if (!tokens[index].includes("return")) return;

  writer.write("<returnStatement>\n");
  writer.write(tokens[index++]); // 'return'
  if (!tokens[index].includes(";")) compileExpression();
  writer.write(tokens[index++]); // ';'
  writer.write("</returnStatement>\n");
}

function compileExpression() {
  var op = ["+", "-", "*", "/", "&", "|", "<", ">", "="];

  writer.write("<expression>\n");
  compileTerm();
  while (op.indexOf(currentValue()) > -1) {
    writer.write(tokens[index++]); // op
    compileTerm();
  }
  writer.write("</expression>\n");
}

function compileTerm() {
  var unaryOp = ["-", "~"];
  writer.write("<term>\n");
  if (unaryOp.indexOf(currentValue()) > -1) {
    writer.write(tokens[index++]); // unaryOp
    compileTerm();
  } else if (tokens[index].includes("(")) {
    writer.write(tokens[index++]); // '('
    compileExpression();
    writer.write(tokens[index++]); // ')'
  } else {
    writer.write(tokens[index++]); // integerConstant|stringConstant|keywordConstant|varName|subroutineName|className

    if (tokens[index].includes("[")) {
      writer.write(tokens[index++]); // '['
      compileExpression();
      writer.write(tokens[index++]); // ']'
    } else if (tokens[index].includes("(")) {
      writer.write(tokens[index++]); // '('
      compileExpressionList();
      writer.write(tokens[index++]); // ')'
    } else if (tokens[index].includes(".")) {
      writer.write(tokens[index++]); // '.'
      writer.write(tokens[index++]); // subroutineName
      writer.write(tokens[index++]); // '('
      compileExpressionList();
      writer.write(tokens[index++]); // ')'
    }
  }
  writer.write("</term>\n");
}

function compileExpressionList() {
  writer.write("<expressionList>\n");

  if (tokens[index].includes(")")) {
    writer.write("</expressionList>\n");
    return;
  }

  compileExpression();
  while (tokens[index].includes(",")) {
    writer.write(tokens[index++]); // ','
    compileExpression();
  }
  writer.write("</expressionList>\n");
}

function currentValue() {
  return tokens[index]
    .substring(tokens[index].indexOf(">") + 1, tokens[index].lastIndexOf("<"))
    .replace("&lt;", "<")
    .replace("&gt;", ">")
    .replace("&amp;", "&");
}
