const fs = require("fs");
const path = require("path");
const GitClient = require("./git/client")
const { CatFileCommand, HashwriteCommand, create_tree_git, write_tree_git, commit_tree, CloneRepo, add_file,log_git} = require("./git/commands");
const { console } = require("inspector");
const client = new GitClient();
// You can use print statements as follows for debugging, they'll be visible when running tests.
console.error("Logs from your program will appear here!");

// Uncomment this block to pass the first stage
const command = process.argv[2];
switch (command) {
  case "init":
    createGitDirectory();
    break;
  case "cat-file":
    Catit();
    break;
  case "hash-object": {
    const file = process.argv[4];
    const command = new HashwriteCommand(file);
    client.run(command);
  }
    break;
  case "ls-tree": {
    const flag = process.argv[3];
    const sha = process.argv[4];
    if (!sha) {
      sha = flag;
      flag = null;
    }
    if (flag === "--name-only" && !sha) return;
    const command = new create_tree_git(flag, sha);
    client.run(command);
  }
    break;
  case "write-tree": {
    const command = new write_tree_git();
    client.run(command);
  }
    break;
  case 'commit-tree': {
    const tree_sha = process.argv[3];
    const commit_sha = process.argv[5];
    const commit_message = process.argv[7];
    const command = new commit_tree(tree_sha, commit_sha, commit_message);
    client.run(command);
  }
    break;
  case "clone": {
    const repoUrl = process.argv[3];  // GitHub repository URL (e.g., https://github.com/user/repo)
    const cloneDir = process.argv[4]; // Directory where the repo should be cloned
    const command = new CloneRepo(repoUrl, cloneDir);
    client.run(command);
  }
    break;
  case "add": {
    const path = process.argv[3];
    if (path != ".") {
      if (!fs.existsSync(path)) {
        throw new Error("File Path Does not Exist");
      }
      const command = new add_file(path);
      client.run(command);
    }
    else if (path == ".") {
      const command = new write_tree_git();
      client.run(command);
    }
  }
    break;
  case "log":{
     const command = new log_git();
     client.run(command);
  }
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
function Catit() {
  const flag = process.argv[3];
  const shahash = process.argv[4];
  const command = new CatFileCommand(flag, shahash);
  client.run(command);
}
// objects are stored in objects dir
// blob -> file data
// head -> current branch