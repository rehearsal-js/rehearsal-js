import { assert } from "chai";
import { suite } from "mocha";
import {
  strPositionalReplacement,
} from "../src/utils";


suite("utils", () => {
  it("strPositionalReplacement()", () => {
    const str1a = "Try changing type '{0}'.";
    const str2a = "Try changing type '{0}' to type '{1}'.";
    const str3a = "Try changing type '{0}' to type '{1}' and '{2}'.";
    const result1a = strPositionalReplacement(str1a, ["string"]);
    const result1b = strPositionalReplacement(str1a, ["any", "unknown", "string", "any"]);
    const result2a = strPositionalReplacement(str2a, ["string", "number"]);
    const result3a = strPositionalReplacement(str3a, ["string", "number", "string"]);
    assert.equal(result1a, "Try changing type 'string'.");
    assert.equal(result1b, "Try changing type 'any'.");
    assert.equal(result2a, "Try changing type 'string' to type 'number'.");
    assert.equal(result3a, "Try changing type 'string' to type 'number' and 'string'.");
  });
});



