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
        inflatedContent = zlib.inflateSync(fileContent).toString().split("\0");
      } catch (e) {
        throw new Error(`Failed to decompress the Git object file: ${e.message}`);
      }

      // Extract and process the tree object content
      let content = inflatedContent.slice(1).filter((value) => value.includes(" "));
      if (content.length === 0) {
        throw new Error("The decompressed content does not appear to be a valid tree object.");
      }

      let names = content.map((value) => value.split(" ")[1]);
      names.forEach((name) => process.stdout.write(`${name}\n`));
    } catch (error) {
      process.stderr.write(`Error: ${error.message}\n`);
    }
  }
}

module.exports = create_tree_git;
