const fs = require("fs");
const path = require("path");
const translate = require("google-translate-api-x");

const exts = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".html"]);
const ignore = ["node_modules", ".git", "dist", "build", ".next", "out", "coverage", ".turbo", ".cache"];
const cjk = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF]+/g;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir)) {
    if (ignore.includes(e)) continue;
    const full = path.join(dir, e);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (exts.has(path.extname(full))) out.push(full);
  }
  return out;
}

async function processFile(file) {
  let text = fs.readFileSync(file, "utf8");
  let matches = text.match(cjk);
  if (!matches) return false;

  let unique = [...new Set(matches)];
  for (const phrase of unique) {
    try {
      let res = await translate(phrase, { from: "zh-CN", to: "en" });
      console.log(`${file}: "${phrase}" → "${res.text}"`);
      text = text.replace(new RegExp(phrase, "g"), res.text);
    } catch (err) {
      console.error("Error translating:", phrase, err.message);
    }
  }

  fs.writeFileSync(file, text, "utf8");
  return true;
}

function hasCJK() {
  const files = walk(path.resolve(process.cwd(), "src"));
  let found = false;
  for (const file of files) {
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    for (const [i, line] of lines.entries()) {
      if (cjk.test(line)) {
        console.log(`Remaining CJK found: ${file}:${i + 1} -> ${line.trim().slice(0, 120)}`);
        found = true;
      }
    }
  }
  return found;
}

(async () => {
  let round = 0;
  do {
    round++;
    console.log(`Starting translation round ${round}`);
    const files = walk(path.resolve(process.cwd(), "src"));
    let translated = false;
    for (const file of files) {
      const changed = await processFile(file);
      if (changed) translated = true;
    }
    if (!translated) break;
  } while (hasCJK());
  console.log("All Chinese characters have been translated.");
})();
