import { defaultConfig } from "../defaultConfig";
import { Validator } from "../services";
import { lintAreaIsDisabled } from "../utils";
import { buildSourceFilePath, runTest, transpile } from "./testHelpers";
import { lintingsByGroup } from "./testHelpers";

describe("Validator should validate name values", () => {
  const lintArea = "name";

  if (lintAreaIsDisabled(lintArea, defaultConfig)) return;

  const sourceFilePath = buildSourceFilePath(lintArea);
  const validator = new Validator(sourceFilePath);

  transpile(validator, sourceFilePath);

  lintingsByGroup[lintArea].forEach(runTest(validator));
});
