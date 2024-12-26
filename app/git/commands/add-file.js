
const HashwriteCommand = require("./hash-write");

class add_file{
    constructor(pathfile){
        this.path = pathfile;
    }
    run(){
       const command = new HashwriteCommand(this.path);
       command.run();
       console.log("File Successfull Commited")
    }
}
module.exports = add_file;