import assert from "assert";
import { CLIEngine } from "eslint";
import { includes, keys } from "lodash";
import path from "path";

import schemaJson from "./schema.json";
import plugin, { processors } from "../src";

function execute(file) {
  const cli = new CLIEngine({
    extensions: [".gql", ".graphql"],
    baseConfig: {
      rules: {
        "graphql/required-fields": {
          schemaJson,
          env: "literal",
          requiredFields: ["id"]
        }
      }
    },
    ignore: false,
    useEslintrc: false
  });
  cli.addPlugin("eslint-plugin-graphql", plugin);
  return cli.executeOnFiles([
    path.join(__dirname, "__fixtures__", `${file}.graphql`)
  ]);
}

describe("processors", () => {
  it("should define processors", () => {
    const extensions = keys(processors);

    assert(includes(extensions, ".gql"));
    assert(includes(extensions, ".graphql"));
  });

  it("should escape backticks and prepend internalTag", () => {
    const query = "query { someValueWith` }";
    const expected = "ESLintPluginGraphQLFile`query { someValueWith\\` }`";
    const preprocess = processors[".gql"].preprocess;
    const result = preprocess(query);

    assert.equal(result, expected);
  });

  it("should filter only graphql/* rules ", () => {
    const messages = [
      { ruleId: "no-undef" },
      { ruleId: "semi" },
      { ruleId: "graphql/randomString" },
      { ruleId: "graphql/template-strings" }
    ];
    const expected = { ruleId: "graphql/template-strings" };
    const postprocess = processors[".gql"].postprocess;
    const result = postprocess(messages);

    assert.equal(result.length, 1);
    assert.equal(result[0].ruleId, expected.ruleId);
  });

  describe("graphql/required-fields", () => {
    describe("valid", () => {
      [
        "required-fields-valid-no-id",
        "required-fields-valid-id",
        "required-fields-valid-array"
      ].forEach(filename => {
        it(`does not warn on file ${filename}`, () => {
          const results = execute(filename);
          assert.equal(results.errorCount, 0);
        });
      });
    });

    describe.only("invalid", () => {
      [
        "required-fields-invalid-no-id",
        "required-fields-invalid-array"
      ].forEach(filename => {
        it(`warns on file ${filename}`, () => {
          const results = execute(filename);
          assert.equal(results.errorCount, 1);
        });
      });
    });
  });
});
