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
            // Step 1: Initialize the .git directory
            this.initializeGitDir();

            // Step 2: Fetch repository references (e.g., branches, tags)
            const refs = await this.fetchRefs();

            // Step 3: Download the packfile and unpack the objects
            const packfile = await this.downloadPackfile(refs);

            // Step 4: Unpack and store objects
            this.unpackPackfile(packfile);

            // Step 5: Write Git metadata (e.g., HEAD, refs/heads)
            this.writeGitMetadata(refs);

            console.log(`Repository cloned into ${this.cloneDir}`);
        } catch (error) {
            console.error("Error during clone operation:", error.message);
        }
    }

    // Step 1: Initialize the .git directory structure
    initializeGitDir() {
        fs.mkdirSync(path.join(this.cloneDir, ".git"), { recursive: true });
        fs.mkdirSync(path.join(this.cloneDir, ".git", "objects"), { recursive: true });
        fs.mkdirSync(path.join(this.cloneDir, ".git", "refs"), { recursive: true });
        fs.mkdirSync(path.join(this.cloneDir, ".git", "refs", "heads"), { recursive: true });
        fs.writeFileSync(path.join(this.cloneDir, ".git", "HEAD"), "ref: refs/heads/main\n");
        console.log(".git directory initialized.");
    }

    // Step 2: Fetch repository references (e.g., branches, tags)
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

    // Parse the refs response (for simplicity, we'll extract just the main branch)
    parseRefs(refsData) {
        // For simplicity, we'll extract the first ref (main branch)
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

    // Step 3: Download the packfile using the git-upload-pack service
    downloadPackfile(refs) {
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
                    resolve(Buffer.concat(data)); // Return the raw packfile data as a Buffer
                });
            });

            req.on("error", (err) => {
                reject(new Error("Error downloading packfile: " + err.message));
            });

            req.end(); // End the request
        });
    }

    // Step 4: Unpack the downloaded packfile and store Git objects
    unpackPackfile(packfile) {
        const decompressedPackfile = zlib.inflateSync(packfile); // Decompress the packfile
        const objectsDir = path.join(this.cloneDir, ".git", "objects");

        // The packfile format needs to be parsed correctly. Here we're assuming a simplified format.
        // In reality, you'd need to parse the packfile to extract objects and store them accordingly.
        const objectHash = crypto.createHash("sha1").update(decompressedPackfile).digest("hex");
        const objectDir = objectHash.slice(0, 2);
        const objectFile = objectHash.slice(2);

        fs.mkdirSync(path.join(objectsDir, objectDir), { recursive: true });
        fs.writeFileSync(
            path.join(objectsDir, objectDir, objectFile),
            zlib.deflateSync(decompressedPackfile),
        );
        console.log(`Unpacked packfile and stored object with SHA1: ${objectHash}`);
    }

    // Step 5: Write Git metadata such as HEAD and refs
    writeGitMetadata(refs) {
        const gitDir = path.join(this.cloneDir, ".git");
        const headPath = path.join(gitDir, "HEAD");
        fs.writeFileSync(headPath, "ref: refs/heads/main\n");

        const refsDir = path.join(gitDir, "refs", "heads");
        for (const [branch, sha] of Object.entries(refs)) {
            const refPath = path.join(refsDir, branch);
            fs.writeFileSync(refPath, sha);
            console.log(`Written ref for ${branch} with hash ${sha}`);
        }
    }
}

module.exports = CloneRepo;
