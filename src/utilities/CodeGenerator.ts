
export default class CodeGenerator {
  public context: void;

  public scopeStack: void[] = [];

  public startOfIndentLevel?: boolean;
  public indentWidth = 2;
  public indentLevel = 0;

  public output = '';

  constructor(context: void) {
    this.context = context;
  }

  public pushScope(scope: void) {
    this.scopeStack.push(scope);
  }

  public popScope() {
    return this.scopeStack.pop();
  }

  public print(maybeString?: string) {
    if (maybeString) {
      this.output += maybeString;
    }
  }

  public printNewline() {
    if (this.output) {
      this.print('\n');
      this.startOfIndentLevel = false;
    }
  }

  public printNewlineIfNeeded() {
    if (!this.startOfIndentLevel) {
      this.printNewline();
    }
  }

  public printOnNewline(maybeString?: string) {
    if (maybeString) {
      this.printNewline();
      this.printIndent();
      this.print(maybeString);
    }
  }

  public printIndent() {
    const indentation = ' '.repeat(this.indentLevel * this.indentWidth);
    this.output += indentation;
  }

  public withIndent(closure?: () => any) {
    if (!closure) {
      return;
    }

    this.indentLevel++;
    this.startOfIndentLevel = true;
    closure();
    this.indentLevel--;
  }

  public withinBlock(closure?: () => any, open = ' {', close = '}') {
    this.print(open);
    this.withIndent(closure);
    this.printOnNewline(close);
  }
}
