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

            // Step 2: Fetch repository refs
            const refs = await this.fetchRefs();

            // Step 3: Request and download the packfile
            const packfile = await this.downloadPackfile(refs);

            // Step 4: Unpack and store the objects
            await this.unpackPackfile(packfile);

            process.stdout.write(`Repository cloned into ${this.cloneDir}\n`);
        } catch (error) {
            process.stdout.write("Error during clone operation: " + error.message + "\n");
        }
    }

    initializeGitDir() {
        fs.mkdirSync(path.join(this.cloneDir, ".git"), { recursive: true });
        fs.mkdirSync(path.join(this.cloneDir, ".git", "objects"), { recursive: true });
        fs.mkdirSync(path.join(this.cloneDir, ".git", "refs"), { recursive: true });
        fs.writeFileSync(path.join(this.cloneDir, ".git", "HEAD"), "ref: refs/heads/main\n");
        process.stdout.write(".git directory initialized.\n");
    }

    fetchRefs() {
        return new Promise((resolve, reject) => {
            const refsUrl = `${this.repoUrl}/info/refs?service=git-upload-pack`;

            https.get(refsUrl, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Failed to fetch refs. Status code: ${res.statusCode}`));
                    return;
                }

                let data = "";
                res.on("data", (chunk) => {
                    data += chunk;
                });
                res.on("end", () => {
                    if (!data.includes("# service=git-upload-pack")) {
                        reject(new Error("Unexpected refs response format."));
                        return;
                    }

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
        let startParsing = false;

        for (const line of lines) {
            if (line.includes("# service=git-upload-pack")) {
                startParsing = true;
                continue;
            }

            if (startParsing && line.trim()) {
                const [sha, ref] = line.split("\t");
                if (ref && ref.startsWith("refs/heads/")) {
                    refs[ref.slice(11)] = sha;
                }
            }
        }
        return refs;
    }

    downloadPackfile(refs) {
        return new Promise((resolve, reject) => {
            const packfileUrl = `${this.repoUrl}/git-upload-pack`;

            const payload = this.buildGitUploadPackRequest(refs);

            const req = https.request(packfileUrl, {
                method: "POST",
                headers: {
                    "User-Agent": "Custom-Git-Clone",
                    "Content-Type": "application/x-git-upload-pack-request",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Length": payload.length,
                },
            }, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Failed to download packfile. Status code: ${res.statusCode}`));
                    return;
                }

                let data = [];
                res.on("data", (chunk) => {
                    data.push(chunk);
                });
                res.on("end", () => {
                    const rawData = Buffer.concat(data);
                    resolve(rawData);
                });
            });

            req.on("error", (err) => {
                reject(new Error("Error downloading packfile: " + err.message));
            });

            req.write(payload);
            req.end();
        });
    }

    buildGitUploadPackRequest(refs) {
        const lines = [
            "0000", // Flush packet
        ];

        for (const branch in refs) {
            lines.push(`want ${refs[branch]}\n`);
        }
        lines.push("done\n"); // End of request

        return Buffer.from(lines.join(""));
    }

    async unpackPackfile(packfile) {
        try {
            const decompressed = zlib.inflateSync(packfile);
            const objectsDir = path.join(this.cloneDir, ".git", "objects");

            let offset = 0;
            while (offset < decompressed.length) {
                const header = this.readObjectHeader(decompressed, offset);
                const objectData = decompressed.slice(offset + header.size);

                const hash = crypto.createHash("sha1").update(objectData).digest("hex");
                const dir = hash.slice(0, 2);
                const file = hash.slice(2);

                fs.mkdirSync(path.join(objectsDir, dir), { recursive: true });
                fs.writeFileSync(
                    path.join(objectsDir, dir, file),
                    zlib.deflateSync(objectData),
                );

                offset += header.size + objectData.length;
            }

            process.stdout.write("Packfile unpacked and objects stored.\n");
        } catch (error) {
            process.stdout.write("Error unpacking the packfile: " + error.message + "\n");
        }
    }

    readObjectHeader(packfile, offset) {
        const header = packfile.slice(offset, offset + 12);
        const type = header[0]; // Placeholder for object type
        const size = header.readUInt32BE(4); // Placeholder for object size

        return {
            type,
            size,
        };
    }
}

module.exports = CloneRepo;
