import ts from "typescript";
import { masterConfig } from "..";
import { LINTINGS } from "../lintings";
import { Logger, Traverser } from "../services";
import {
  lintAreaIsDisabled,
  lintingIsDisabled,
  isRegularNode,
  lintIssueIsDisabled,
  logLevelIsDisabled,
  lintingIsExcepted,
} from "../utils";
import { Collector } from "./Collector";
import { Selector } from "./Selector";
import * as subValidators from "./subValidators";

export class Validator {
  public logs: Log[] = [];
  private currentNode: ts.Node;

  /**
   * Path to test file in `src/tests/input/`.
   */
  public testSourceFilePath: string | undefined;

  constructor(testSourceFilePath?: string) {
    this.testSourceFilePath = testSourceFilePath;
  }

  public setNode(node: ts.Node) {
    this.currentNode = node;
    return this;
  }

  public run() {
    Collector.run(this.currentNode);

    Object.values(subValidators).forEach((subValidator) => {
      if (lintAreaIsDisabled(subValidator.lintArea, masterConfig)) return;
      this.runSubValidator(subValidator);
    });
  }

  private runSubValidator(constructor: SubValidatorConstructor) {
    const SubValidator = Logger(constructor);
    const logs = new SubValidator().run(this.currentNode);

    if (logs?.length) this.logs.push(...logs);
  }

  /**
   * Run checks _after_ the source file AST has been traversed.
   */
  public postTraversalChecks(sourceFile: ts.SourceFile) {
    const { tsIgnores, toDos } = Collector;

    if (tsIgnores.length) {
      tsIgnores.forEach(({ line, text }) => {
        this.addToLogs(LINTINGS.TS_IGNORE, { line, text });
      });
    }

    if (toDos.length) {
      toDos.forEach(({ line, text }) => {
        this.addToLogs(LINTINGS.TODO, { line, text });
      });
    }

    const { sourceFileHasContinueOnFail } = Collector;

    const nodeName = Traverser.sourceFilePath.split("/").pop();

    if (isRegularNode(nodeName) && !sourceFileHasContinueOnFail) {
      let line = Selector.lineNumber(sourceFile.getChildAt(0));

      line += 1; // TODO: Find out why this offset is needed

      this.addToLogs(LINTINGS.MISSING_CONTINUE_ON_FAIL, {
        line,
        text: "<large excerpt omitted>",
      });
    }
  }

  /**
   * Add logs during the final run, i.e. during the post-traversal checks.
   */
  private addToLogs(
    linting: Linting,
    { line, text }: { line: number; text: string }
  ) {
    if (
      lintIssueIsDisabled(linting.lintIssue, masterConfig) ||
      logLevelIsDisabled(linting.logLevel, masterConfig) ||
      lintingIsDisabled(linting, masterConfig) ||
      lintingIsExcepted(linting, line, Collector.exceptions)
    )
      return;

    this.logs.push({
      message: linting.message,
      lintAreas: linting.lintAreas,
      lintIssue: linting.lintIssue,
      line: line,
      excerpt: text,
      sourceFilePath: this.testSourceFilePath ?? Traverser.sourceFilePath,
      logLevel: linting.logLevel,
      ...(linting.details && { details: linting.details }),
    });
  }
}
