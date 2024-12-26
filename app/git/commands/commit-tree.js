const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
class commit_tree {
    constructor(tree, commit, message) {
        this.treeSHA = tree;
        this.commitSHA = commit;
        this.message = message;
    }
    run() {
        const commitBuffer = Buffer.concat([
            Buffer.from(`tree ${this.treeSHA}\n`),
            Buffer.from(`parent ${this.commitSHA}\n`),
            Buffer.from(`author Hemang Choudhary <coehemang@gmail.com> ${Date.now()} +0000\n`),
            Buffer.from(`committer Hemang Choudhary <coehemang@gmail.com> ${Date.now()} +0000\n\n`),
            Buffer.from(`${this.message}\n`),
        ])
        const header = `commit ${commitBuffer.length}\0`;
        const data = Buffer.concat(Buffer.from(header), commitBuffer);
        const SHAb = crypto.createHash("sha1").update(data).digest("hex");
        const objdir = SHAb.slice(0, 2);
        const objFile = SHAb.slice(2);
        fs.mkdirSync(path.join(process.cwd(), '.git', 'objects', objdir), {
            recursive: true,
        })
        fs.writeFileSync(
            path.join(process.cwd(), '.git', 'objects', objdir, objFile),
            zlib.deflateSync(content),
        );
        process.stdout.write(`${SHAb}\n`);
    }
}
module.exports = commit_tree;