const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const zlib = require("zlib");

function writeFileBlob(currentPath) {
    const contents = fs.readFileSync(currentPath);
    const len = contents.length;
    const header = `blob ${len}\0`;
    const blob = Buffer.concat([Buffer.from(header), contents]);
    const SHAb = crypto.createHash("sha1").update(blob).digest("hex");
    const objdir = SHAb.slice(0, 2);
    const objFile = SHAb.slice(2);
    const complete_path = path.join(process.cwd(), ".git", "objects", objdir);

    if (!fs.existsSync(complete_path)) fs.mkdirSync(complete_path);
    const data = zlib.deflateSync(blob);
    fs.writeFileSync(path.join(complete_path, objFile), data);
    return SHAb;
}

class write_tree_git {
    constructor() {}

    run() {
        function yaartree(basePath) {
            const result = [];
            const dirContents = fs.readdirSync(basePath);

            for (const dirContent of dirContents) {
                if (dirContent.includes(".git")) continue;
                const currentPath = path.join(basePath, dirContent);
                let stat = fs.statSync(currentPath);

                if (stat.isDirectory()) {
                    const sha = yaartree(currentPath);
                    if (sha) {
                        result.push({
                            mode: "40000",  // Directory mode
                            basename: path.basename(currentPath),
                            sha,
                        });
                    }
                } else if (stat.isFile()) {
                    const sha = writeFileBlob(currentPath);
                    result.push({
                        mode: "100644",  // File mode
                        basename: path.basename(currentPath),
                        sha,
                    });
                }
            }

            if (result.length === 0) {
                return null;
            }

            // Creating the tree object
            const treeData = result.reduce((acc, current) => {
                const { mode, basename, sha } = current;
                return Buffer.concat([
                    acc,
                    Buffer.from(`${mode} ${basename}\0`), // null-terminated basename
                    Buffer.from(sha, "hex"),
                ]);
            }, Buffer.alloc(0));

            // Creating the tree object header and final buffer
            const tree = Buffer.concat([
                Buffer.from(`tree ${treeData.length}\0`), // tree header with length
                treeData,
            ]);

            const hash = crypto.createHash("sha1").update(tree).digest("hex");
            const objdir = hash.slice(0, 2);
            const objFile = hash.slice(2);
            const complete_path = path.join(process.cwd(), ".git", "objects", objdir);

            if (!fs.existsSync(complete_path)) fs.mkdirSync(complete_path);
            const data = zlib.deflateSync(tree); // Compressing the tree object
            fs.writeFileSync(path.join(complete_path, objFile), data);

            return hash;
        }

        const sha = yaartree(process.cwd());
        process.stdout.write(sha);
    }
}

module.exports = write_tree_git;
