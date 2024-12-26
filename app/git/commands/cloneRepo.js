const fs = require("fs");
const path = require("path");
const https = require("https");
const zlib = require("zlib");
const crypto = require("crypto");

class CloneRepo {
    constructor(repoUrl, cloneDir) {
        this.repoUrl = repoUrl;
        this.cloneDir = cloneDir;
    }

    async run() {
        try {
            // Step 1: Initialize .git directory
            this.initializeGitDir();

            // Step 2: Fetch repository refs (branches, etc.)
            const refs = await this.fetchRefs();

            // Step 3: Download the packfile
            const packfile = await this.downloadPackfile();

            // Step 4: Unpack and store the objects
            await this.unpackPackfile(packfile);

            // Step 5: Write the Git metadata
            this.writeGitMetadata(refs);

            process.stdout.write(`Repository cloned into ${this.cloneDir}\n`);
        } catch (error) {
            process.stdout.write("Error during clone operation: " + error.message + "\n");
        }
    }

    initializeGitDir() {
        fs.mkdirSync(path.join(this.cloneDir, ".git"), { recursive: true });
        fs.mkdirSync(path.join(this.cloneDir, ".git", "objects"), { recursive: true });
        fs.mkdirSync(path.join(this.cloneDir, ".git", "refs"), { recursive: true });
        fs.mkdirSync(path.join(this.cloneDir, ".git", "refs", "heads"), { recursive: true });
        fs.writeFileSync(path.join(this.cloneDir, ".git", "HEAD"), "ref: refs/heads/main\n");
        process.stdout.write(".git directory initialized.\n");
    }

    // Step 2: Fetch repository refs
    fetchRefs() {
        return new Promise((resolve, reject) => {
            const refsUrl = `${this.repoUrl}/info/refs?service=git-upload-pack`;

            const client = this.repoUrl.startsWith("https") ? https : http;

            client.get(refsUrl, (res) => {
                let data = "";
                res.on("data", (chunk) => {
                    data += chunk;
                });
                res.on("end", () => {
                    const refs = this.parseRefs(data);
                    resolve(refs);
                });
            }).on("error", (err) => {
                reject(new Error("Error fetching refs: " + err.message));
            });
        });
    }

    parseRefs(refsData) {
        const refs = {};
        const lines = refsData.split("\n");
        lines.forEach((line) => {
            const [sha, ref] = line.split("\t");
            if (ref && ref.startsWith("refs/heads/")) {
                refs[ref.slice(11)] = sha; // Only interested in heads (branches)
            }
        });
        return refs;
    }

    // Step 3: Download the packfile
    downloadPackfile() {
        return new Promise((resolve, reject) => {
            const packfileUrl = `${this.repoUrl}/git-upload-pack`;

            const client = this.repoUrl.startsWith("https") ? https : http;

            const req = client.request(packfileUrl, {
                method: "POST",
                headers: {
                    "User-Agent": "Custom-Git-Clone",
                    "Content-Type": "application/x-git-upload-pack-request",
                    "Accept-Encoding": "gzip, deflate",
                }
            }, (res) => {
                let data = [];
                res.on("data", (chunk) => {
                    data.push(chunk);
                });
                res.on("end", () => {
                    const rawData = Buffer.concat(data); // Ensure we get the entire packfile
                    process.stdout.write(`Packfile size: ${rawData.length} bytes\n`); // Log the size for debugging
                    resolve(rawData);
                });
            });

            req.on("error", (err) => {
                reject(new Error("Error downloading packfile: " + err.message));
            });

            req.end();
        });
    }

    // Step 4: Unpack the downloaded packfile
    async unpackPackfile(packfile) {
        try {
            const decompressedPackfile = zlib.inflateSync(packfile); // Decompress the packfile
            const objectsDir = path.join(this.cloneDir, ".git", "objects");

            // Check decompressed packfile size
            process.stdout.write(`Decompressed packfile size: ${decompressedPackfile.length} bytes\n`);

            let offset = 0;
            while (offset < decompressedPackfile.length) {
                const objectHeader = this.readObjectHeader(decompressedPackfile, offset);
                const objectData = decompressedPackfile.slice(offset + objectHeader.size);
                const objectHash = crypto.createHash("sha1").update(objectData).digest("hex");

                const objectDir = objectHash.slice(0, 2);
                const objectFile = objectHash.slice(2);

                // Log object details for debugging
                process.stdout.write(`Unpacking object: ${objectHash} (type: ${objectHeader.type}, size: ${objectData.length} bytes)\n`);

                // Store the object
                fs.mkdirSync(path.join(objectsDir, objectDir), { recursive: true });
                fs.writeFileSync(
                    path.join(objectsDir, objectDir, objectFile),
                    zlib.deflateSync(objectData) // Store the object in a compressed format
                );

                offset += objectHeader.size + objectData.length;
            }

            process.stdout.write("Packfile unpacked and objects stored.\n");
        } catch (error) {
            process.stdout.write("Error unpacking the packfile: " + error.message + "\n");
        }
    }

    // Read object header (Git object format)
    readObjectHeader(packfile, offset) {
        const header = packfile.slice(offset, offset + 12);
        const objectType = header[0]; // Object type (commit, tree, blob)
        const size = header.readUInt32BE(4); // Size of the object

        return {
            type: objectType,
            size: size,
        };
    }

    // Step 5: Write Git metadata (e.g., HEAD, refs/heads)
    writeGitMetadata(refs) {
        const gitDir = path.join(this.cloneDir, ".git");
        const headPath = path.join(gitDir, "HEAD");
        fs.writeFileSync(headPath, "ref: refs/heads/main\n");

        const refsDir = path.join(gitDir, "refs", "heads");
        for (const [branch, sha] of Object.entries(refs)) {
            const refPath = path.join(refsDir, branch);
            fs.writeFileSync(refPath, sha);
            process.stdout.write(`Written ref for ${branch} with hash ${sha}\n`);
        }
    }
}

module.exports = CloneRepo;
