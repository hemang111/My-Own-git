const fs = require("fs");
const path = require("path");
const GitClient = require("./git/client")
const {CatFileCommand} = require("./git/commands");
const client = new GitClient();
// You can use print statements as follows for debugging, they'll be visible when running tests.
console.error("Logs from your program will appear here!");

// Uncomment this block to pass the first stage
const command = process.argv[2];

switch (command) {
  case "init":
    createGitDirectory();
    break;
  case "catfile":
    Catit();
    break;  
  default:
    throw new Error(`Unknown command ${command}`);
}

function createGitDirectory() {
  fs.mkdirSync(path.join(process.cwd(), ".git"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), ".git", "objects"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), ".git", "refs"), { recursive: true });

  fs.writeFileSync(path.join(process.cwd(), ".git", "HEAD"), "ref: refs/heads/main\n");
  console.log("Initialized git directory");
}
function Catit(){
    const flag = process.argv[3];
    const shahash = process.argv[4];4
    const command = new CatFileCommand(flag,shahash);
    client.run(command);
}
// objects are stored in objects dir
// blob -> file data
// head -> current branch