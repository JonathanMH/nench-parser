# Nench Parser (for Node.js)

This is an (incomplete) parser for [Nench][nench] log files for Node.js. I needed it for writing a blog post about comparing VPS performance, so I thought maybe somebody else might need this as well :)

Here's an example of how to use the parser:

```javascript
const fs = require("fs");
const NenchParser = require("./NenchParser.js");

async function parseNenchLog(filePath) {
  fs.readFile(filePath, "utf8", async (err, content) => {
    const myParser = new NenchParser();
    const parsed = myParser.parse(content);
    console.log(JSON.stringify(parsed.results));
  });
}

parseNenchLog("example/2019-04-20-07_21_49.log");
```

This is an exmple of how you can automate running nench on the server and capture all nench log output (also the cpu timings) to a log file:

```bash
#!/bin/bash

sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y time bzip2 wget

wget -O nench.sh wget.racing/nench.sh

chmod +x nench.sh

for ((n=1;n<11;n++))
TIMESTAMP=$(date "+%Y-%m-%d-%H_%M_%S")
touch "$TIMESTAMP.log"
# output rewriting necessary for the CPU timing logging to go where it should
exec 3>&1 4>&2 1>"$TIMESTAMP.log" 2>&1
./nench.sh
exec 1>&3 2>&4
```

[nench]: https://github.com/n-st/nench
