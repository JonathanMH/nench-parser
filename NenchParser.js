
const FreqRegExp = RegExp(/^Frequency:\ *([0-9]*.[0-9]*)\ MHz/);
const CPU_ResultRegExp = RegExp(/([0-9]*.?[0-9]*)\ seconds/);
const IO_SeekRegExp = RegExp(
  /min\/avg\/max\/mdev = ([0-9]*.?[0-9]*) (us|ms|s) \/ ([0-9]*.?[0-9]*) (us|ms|s) \/ ([0-9]*.?[0-9]*) (us|ms|s) \/ ([0-9]*.?[0-9]*) (us|ms|s)/
);
const IO_SequentialRegExp = RegExp(
  /generated ([0-9]*\.?[0-9]*) ([a-z]) requests in ([0-9].[0-9]{2}) ([a-z]), ([0-9]+\.?[0-9]*) ([a-z]{3}), ([0-9]*\.?[0-9]*)( [a-z])? iops, ([0-9]*\.[0-9]*) ([a-z]{3}\/?s?)/,
  "i"
);
const DD_ResultRegExp = RegExp(/average: *([0-9]*\.[0-9]*) ([a-z]*\/s)/, "i");

class NenchParser {
  constructor() {

    this.lineNumber = 1;

    this.stages_completed = {
      cpu: false,
      ioping: false,
      disk: false,
      ipv4: false,
      ipv6: false
    };

    this.results = {
      filePath: this.filePath,
      cpu: {
        freq: undefined,
        sha256Time: undefined,
        bzip2Time: undefined,
        aesTime: undefined
      },
      io: {
        seek: {
          min: undefined,
          avg: undefined,
          max: undefined,
          mdev: undefined
        },
        sequentialRead: {
          requests: undefined,
          time: undefined,
          volume: undefined,
          iops: undefined,
          through: undefined
        }
      },
      disk: {
        average: undefined
      }
    };
  }

  parse(content) {
    content.split('\n').forEach((line, index) => {
      if (this.stages_completed.cpu === false) {
        this.parseCPU(line);
      }
      if (this.stages_completed.ioping === false) {
        this.parseIo(line);
      }
      if (this.stages_completed.disk === false) {
        this.parseDisk(line);
      }
      if (
        this.stages_completed.cpu &&
        this.stages_completed.ioping &&
        this.stages_completed.disk
      ) {
        return this.results;
      }
      this.lineNumber++;
    });
    return this;
  }

  /**
   *
   * @param {String} line
   */
  parseCPU(line) {
    if (this.results.cpu.freq === undefined && FreqRegExp.test(line)) {
      this.results.cpu.freq = FreqRegExp.exec(line)[1];
      return;
    }
    if (
      this.results.cpu.sha256Time === undefined &&
      CPU_ResultRegExp.test(line)
    ) {
      this.results.cpu.sha256Time = CPU_ResultRegExp.exec(line)[1];
      return;
    }
    if (
      this.results.cpu.bzip2Time === undefined &&
      CPU_ResultRegExp.test(line)
    ) {
      this.results.cpu.bzip2Time = CPU_ResultRegExp.exec(line)[1];
      return;
    }
    if (this.results.cpu.aesTime === undefined && CPU_ResultRegExp.test(line)) {
      this.results.cpu.aesTime = CPU_ResultRegExp.exec(line)[1];
      this.stages_completed.cpu = true;
      return;
    }
  }

  parseIo(line) {
    if (this.results.io.freq === undefined && IO_SeekRegExp.test(line)) {
      let ioRes = IO_SeekRegExp.exec(line);
      this.results.io.seek = {
        min: this.toMicro(ioRes[1], ioRes[2]),
        avg: this.toMicro(ioRes[3], ioRes[4]),
        max: this.toMicro(ioRes[5], ioRes[6]),
        mdev: this.toMicro(ioRes[7], ioRes[8])
      };
      return;
    }

    if (
      this.results.io.sequentialRead.requests === undefined &&
      IO_SequentialRegExp.test(line)
    ) {
      let seqRes = IO_SequentialRegExp.exec(line);
      this.results.io.sequentialRead = {
        requests: this.toAbsolute(seqRes[1], seqRes[2]),
        time: this.toMicro(seqRes[3], seqRes[4]),
        volume: this.toMiB(seqRes[5], seqRes[6]),
        through: this.toMiBs(seqRes[9], seqRes[10])
      };

      //console.log(this.filePath);
      if (typeof seqRes[8] !== "undefined" && seqRes[8] === " k") {
        this.results.io.sequentialRead.iops = parseFloat(seqRes[7]) * 1000;
      } else if (typeof seqRes[8] === "undefined") {
        this.results.io.sequentialRead.iops = parseFloat(seqRes[7], 10);
      } else {
        console.log("something is going wrong in the parser, abort");
        process.exit();
      }
      if (isNaN(this.results.io.sequentialRead.iops)) {
        console.log(seqRes);
      }
      this.stages_completed.ioping = true;
      return;
    }
  }

  parseDisk(line) {
    if (this.results.disk.average === undefined && DD_ResultRegExp.test(line)) {
      let ddRes = DD_ResultRegExp.exec(line);
      this.results.disk.average = this.toMiBs(ddRes[1], ddRes[2]);
    }
  }

  toMicro(value, unit) {
    if (unit === "s") {
      return value * 1000000;
    }
    if (unit === "ms") {
      return value * 1000;
    }
    if (unit === "us") {
      return value;
    }
  }

  toAbsolute(value, unit) {
    if (unit === "k") {
      return value * 1000;
    }
  }

  toMiB(value, unit) {
    if (unit === "GiB") {
      return value * 1000;
    }
    if (unit === "MiB") {
      return value;
    }
    if (unit === "KiB") {
      return value / 1000;
    }
  }

  toMiBs(value, unit) {
    if (unit === "GiB/s") {
      return this.toMiB(value, "GiB");
    }
    if (unit === "MiB/s") {
      return this.toMiB(value, "MiB");
    }
    if (unit === "KiB/s") {
      return this.toMiB(value, "KiB");
    }
  }
}

module.exports = NenchParser;
