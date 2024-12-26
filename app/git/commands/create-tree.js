const path = require("path");
const zlib = require("zlib");
const fs = require("fs");

class create_tree_git {
  constructor(sha) {
    this.sha = sha;
  }

  run() {
    try {
      const sha = this.sha;

      // Validate the SHA
      if (!/^[0-9a-f]{40}$/.test(sha)) {
        throw new Error("Invalid SHA1 hash provided. It must be a 40-character hexadecimal string.");
      }

      const directory = sha.slice(0, 2);
      const fileName = sha.slice(2);
      const filePath = path.join(process.cwd(), ".git", "objects", directory, fileName);

      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`Git object file not found: ${filePath}`);
      }

      // Read and decompress the file
      const fileContent = fs.readFileSync(filePath);
      let inflatedContent;

      try {
        inflatedContent = zlib.inflateSync(fileContent);
      } catch (e) {
        throw new Error(`Failed to decompress the Git object file: ${e.message}`);
      }

      // Parse the decompressed content
      const headerEnd = inflatedContent.indexOf(0); // Locate the end of the header
      if (headerEnd === -1) {
        throw new Error("Malformed tree object: Missing header.");
      }

      const treeContent = inflatedContent.slice(headerEnd + 1); // Skip the header
      let offset = 0;

      while (offset < treeContent.length) {
        // Read the mode (e.g., "100644", "40000")
        const spaceIndex = treeContent.indexOf(0x20, offset);
        if (spaceIndex === -1) break;

        const mode = treeContent.slice(offset, spaceIndex).toString("utf8");
        offset = spaceIndex + 1;

        // Read the filename (null-terminated)
        const nullIndex = treeContent.indexOf(0x00, offset);
        if (nullIndex === -1) break;

        const filename = treeContent.slice(offset, nullIndex).toString("utf8");
        offset = nullIndex + 21; // Skip the filename and SHA (20 bytes + null terminator)

        // Output the filename
        process.stdout.write(`${filename}\n`);
      }
    } catch (error) {
      process.stderr.write(`Error: ${error.message}\n`);
    }
  }
}

module.exports = create_tree_git;
