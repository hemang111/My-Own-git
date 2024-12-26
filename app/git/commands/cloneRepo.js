const fs = require("fs");
const path = require("path");
const https = require("https");
const zlib = require("zlib");

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

            // Step 3: Download the packfile
            const packfile = await this.downloadPackfile(refs);

            // Step 4: Unpack and store objects
            await this.unpackPackfile(packfile);

            process.stdout.write(`Repository cloned into ${this.cloneDir}\n`);
        } catch (error) {
            process.stdout.write(`Error during clone operation: ${error.message}\n`);
        }
    }

    initializeGitDir() {
        const gitDir = path.join(this.cloneDir, ".git");
        fs.mkdirSync(gitDir, { recursive: true });
        fs.mkdirSync(path.join(gitDir, "objects"), { recursive: true });
        fs.mkdirSync(path.join(gitDir, "refs", "heads"), { recursive: true });
        fs.writeFileSync(path.join(gitDir, "HEAD"), "ref: refs/heads/main\n");
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
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    if (!data.includes("# service=git-upload-pack")) {
                        reject(new Error("Unexpected refs response format."));
                        return;
                    }

                    const refs = this.parseRefs(data);
                    resolve(refs);
                });
            }).on("error", (err) => {
                reject(new Error(`Error fetching refs: ${err.message}`));
            });
        });
    }

    parseRefs(data) {
        const refs = {};
        const lines = data.split("\n");
        for (const line of lines) {
            const [sha, ref] = line.split("\t");
            if (ref && ref.startsWith("refs/heads/")) {
                refs[ref.slice(11)] = sha; // Only include branch heads
            }
        }
        if (Object.keys(refs).length === 0) {
            throw new Error("No branches found in the repository.");
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
                    "Content-Length": payload.length,
                },
                timeout: 10000,
            }, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Failed to download packfile. Status code: ${res.statusCode}`));
                    return;
                }

                const chunks = [];
                res.on("data", (chunk) => chunks.push(chunk));
                res.on("end", () => resolve(Buffer.concat(chunks)));
            });

            req.on("error", (err) => reject(new Error(`Error downloading packfile: ${err.message}`)));
            req.on("timeout", () => {
                req.destroy();
                reject(new Error("Request timed out"));
            });

            req.write(payload);
            req.end();
        });
    }

    buildGitUploadPackRequest(refs) {
        const capabilities = "side-band-64k multi_ack thin-pack ofs-delta";
        const requestLines = [];

        for (const branch in refs) {
            requestLines.push(this.formatPacket(`want ${refs[branch]} ${capabilities}`));
        }
        requestLines.push(this.formatPacket("done"));
        requestLines.push("0000"); // Flush packet

        return Buffer.from(requestLines.join(""));
    }

    formatPacket(line) {
        const length = (line.length + 4).toString(16).padStart(4, "0");
        return length + line;
    }

    async unpackPackfile(packfile) {
        try {
            const decompressed = zlib.inflateSync(packfile);
            const objectsDir = path.join(this.cloneDir, ".git", "objects");

            let offset = 0;
            while (offset < decompressed.length) {
                const objectHeader = this.readObjectHeader(decompressed, offset);
                const objectData = decompressed.slice(offset + objectHeader.headerSize, offset + objectHeader.totalSize);

                const hash = this.computeObjectHash(objectHeader.type, objectData);
                const dir = hash.slice(0, 2);
                const file = hash.slice(2);

                fs.mkdirSync(path.join(objectsDir, dir), { recursive: true });
                fs.writeFileSync(path.join(objectsDir, dir, file), zlib.deflateSync(objectData));

                offset += objectHeader.totalSize;
            }

            process.stdout.write("Packfile unpacked and objects stored.\n");
        } catch (error) {
            process.stdout.write(`Error unpacking packfile: ${error.message}\n`);
        }
    }

    readObjectHeader(data, offset) {
        // Simplified parsing logic for object header
        const type = data[offset]; // Simplified for example; adjust for actual types
        const size = data.readUInt32BE(offset + 1); // Adjust as needed
        const headerSize = 5; // Example size; calculate correctly based on Git object encoding
        return { type, size, headerSize, totalSize: headerSize + size };
    }

    computeObjectHash(type, data) {
        const header = `${type} ${data.length}\0`;
        return crypto.createHash("sha1").update(header + data).digest("hex");
    }
}

module.exports = CloneRepo;
