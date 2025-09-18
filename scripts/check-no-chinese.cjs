const fs = require("fs");
const path = require("path");

const exts = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".scss", ".html"
]);

const ignore = [
  "node_modules", ".git", "dist", "build", ".next", "out", "coverage", ".turbo", ".cache"
];

const cjk = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF]/;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir)) {
    if (ignore.includes(e)) continue;
    const full = path.join(dir, e);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (exts.has(path.extname(full))) {
      out.push(full);
    }
  }
  return out;
}

let bad = [];
for (const file of walk(path.resolve(process.cwd(), "src"))) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((ln, i) => {
    if (cjk.test(ln)) {
      bad.push(`${file}:${i + 1}: ${ln.trim().slice(0, 120)}`);
    }
  });
}

if (bad.length) {
  console.error("Chinese characters detected:\n" + bad.join("\n"));
  process.exit(1);
} else {
  console.log("No Chinese characters detected!.");
}
