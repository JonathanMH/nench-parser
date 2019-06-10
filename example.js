const fs = require("fs");
const NenchParser = require("./NenchParser.js");

async function parseNenchLog(filePath) {
  fs.readFile(filePath, "utf8", async (err, content) => {
    const myParser = new NenchParser();
    const parsed = myParser.parse(content);
    console.log(JSON.stringify(parsed.results));
  });
}

parseNenchLog("example/2019-04-20-07_21_49.log")
