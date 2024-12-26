const fs = require("fs");
const path = require("path");
const axios = require("axios");
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
            const packfile = await this.downloadPackfile();
            this.unpackPackfile(packfile);

            // Step 4: Write Git metadata (e.g., HEAD, refs/heads)
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

    // Step 2: Fetch repository references (e.g., branches)
    async fetchRefs() {
        const refsUrl = `${this.repoUrl}/info/refs?service=git-upload-pack`;

        try {
            const response = await axios.get(refsUrl, {
                headers: { 'User-Agent': 'Custom-Git-Clone' },
            });
            console.log("Fetched refs.");
            return response.data; // Assuming response is in the format of references
        } catch (error) {
            throw new Error("Error fetching refs: " + error.message);
        }
    }

    // Step 3: Download the packfile using the git-upload-pack service
    async downloadPackfile() {
        const packfileUrl = `${this.repoUrl}/git-upload-pack`;

        try {
            const response = await axios.post(packfileUrl, null, {
                headers: {
                    'User-Agent': 'Custom-Git-Clone',
                    'Content-Type': 'application/x-git-upload-pack-request',
                },
                responseType: 'arraybuffer',
            });
            console.log("Downloaded packfile.");
            return response.data; // Return the raw packfile data
        } catch (error) {
            throw new Error("Error downloading packfile: " + error.message);
        }
    }

    // Step 4: Unpack the downloaded packfile and store Git objects
    unpackPackfile(packfile) {
        const decompressedPackfile = zlib.inflateSync(packfile); // Decompress the packfile
        const objectsDir = path.join(this.cloneDir, ".git", "objects");

        // Assume each object is stored in a file after decompression (simplified for the example)
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
        Object.entries(refs).forEach(([ref, hash]) => {
            const refPath = path.join(refsDir, ref);
            fs.writeFileSync(refPath, hash);
            console.log(`Written ref for ${ref} with hash ${hash}`);
        });
    }
}

module.exports = CloneRepo;
