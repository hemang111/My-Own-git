const path = require("path");
const zlib = require("zlib");
const fs = require('fs');

class create_tree_git{
 constructor(sha){
   this.sha = sha;
 }
 run(){
  const sha = this.sha;
  const directory = sha.slice(0, 2);
  const fileName = sha.slice(2);
  const filePath = path.join(process.cwd(), ".git", "objects", directory, fileName);
  let inflatedContent = zlib.inflateSync(fs.readFileSync(filePath)).toString().split('\0');
  let content = inflatedContent.slice(1).filter(value => value.includes(" "));
  let names = content.map(value => value.split(" ")[1]);
  names.forEach((name) => process.stdout.write(`${name}\n`));
 }
}

module.exports = create_tree_git;