const assert = require("node:assert/strict");
const fs = require("node:fs");

const root = new URL("../", `file://${__filename}`);
const read = file => fs.readFileSync(new URL(file, root), "utf8");
const pkg = JSON.parse(read("package.json"));
const version = "1.3.0";

assert.equal(pkg.version, version);
assert.match(read("index.html"), new RegExp(`v${version.replaceAll(".", "\\.")}`));
assert.match(read("README.md"), new RegExp(`v${version.replaceAll(".", "\\.")}`));
assert.match(read("CHANGELOG.md"), new RegExp(`当前公告[\\s\\S]*v${version.replaceAll(".", "\\.")}`));
assert.match(read("CHANGELOG.md"), /历史公告[\s\S]*v1\.2\.4[\s\S]*v1\.2\.3[\s\S]*v1\.2\.2[\s\S]*v1\.2\.1[\s\S]*v1\.2\.0[\s\S]*v1\.1\.0[\s\S]*v1\.0\.1[\s\S]*v1\.0\.0[\s\S]*v0\.9\.1/);

console.log(`发布信息测试通过：v${version} 与当前、历史公告一致。`);
