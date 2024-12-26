const path = require("path");
const zlib = require("zlib");
const fs = require("fs");

class create_tree_git {
  constructor(flag,sha) {
    this.flag = flag;
    this.sha = sha;
  }

  run() {
    const flag = this.flag;
    const sha = this.sha;
    const folder =  sha.slice(0,2);
    const file = sha.slice(2);
    const folderpath = path.join(process.cwd(),".git","objects",folder);
    const filepath = path.join(folderpath,file);
    if(!fs.existsSync(folderpath)) throw new Error(`Not a valid object name ${sha}`);
    if(!fs.existsSync(filepath)) throw new Error(`Not a valid object name ${sha}`);
    const filedata = fs.readFileSync(filepath);
    const outputBuffer = zlib.inflateSync(filedata);
    const output = outputBuffer.toString().split('\0');
    
    const treeContent = output.slice(1).filter(e=> e.includes(" "));
    const names  = treeContent.map((e) => e.split(" ")[1]);
    names.forEach(name=> process.stdout.write(`${name}\n`))
}
}
module.exports = create_tree_git;
