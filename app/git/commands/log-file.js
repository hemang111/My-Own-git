const path = require("path");
const fs = require("fs");
const zlib = require("zlib");
const readline = require("readline");

function getCurrentHead() {
    const branch = fs.readFileSync(path.join(process.cwd(), ".git", "HEAD")).toString().trim();
    return fs.readFileSync(path.join(process.cwd(), ".git", `${branch.slice(5)}`)).toString().trim();
}

class log_git {
    constructor() {
        this.currentHash = getCurrentHead();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
    }

    displayCommit(hash) {
        console.log('\x1b[33m%s\x1b[0m', `commit ${hash}`);
        try {
            const commitData = zlib.inflateSync(fs.readFileSync(path.join(process.cwd(), ".git", "objects", `${hash.slice(0, 2)}`, `${hash.slice(2)}`))).toString();
            console.log(commitData);
            process.stdout.write(":");
            const match = commitData.match(/parent(?:\s+)([0-9a-f]{40})/);
            return match ? match[1] : null;
        } catch (error) {
            console.error('\x1b[31m%s\x1b[0m', `Error reading commit ${hash}: ${error.message}`);
            return null;
        }
    }

    run() {
        if (!this.currentHash) {
            console.log("No initial commit found.");
            this.rl.close();
            return;
        }

        this.displayCommit(this.currentHash);

        this.rl.on("line", () => {
            if (this.currentHash) {
                this.currentHash = this.displayCommit(this.currentHash);
                if (!this.currentHash) {
                    console.log("End of commit history.");
                    this.rl.close();
                }
            }
        });

        this.rl.on("SIGINT", () => {
            console.log("\nExiting.");
            this.rl.close();
        });
    }
}


module.exports = log_git;