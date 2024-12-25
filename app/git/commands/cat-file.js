const path = require("path");
const fs = require('fs');
const zlib = require("zlib");
const { error } = require("console");
class CatFileCommand {
    constructor(flag, shahash) {
        this.flag = flag;
        this.shahash = shahash;
    }
    run() {
        const flag = this.flag;
        const hash = this.shahash;
        switch (flag) {
            case '-p': {
                const folder = hash.slice(0, 2);
                const file = hash.slice(2);
                const completePath = path.join(
                    process.cwd(),
                    ".git",
                    "objects",
                    folder, 
                    file
                );
                if(fs.existsSync(completePath)){
                  throw new Error(`Not a valid object name ${hash}`);
                }
                const fileContents =fs.readFileSync(completePath);
                const outputBuffer = zlib.inflateSync(fileContents);
                process.stdout.write(outputBuffer.toString().split("/x00")[1]);
            }
            break;
       
        }
    }
}

module.exports = CatFileCommand;