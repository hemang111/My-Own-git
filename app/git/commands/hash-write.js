const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

class HashwriteCommand {
    constructor(file){
        this.file = file;
        // console.log(file);
    }
    run(){
        const {size} = fs.statSync(this.file);
        const content = `blob ${size}\0${fs.readFileSync(this.file).toString()}`;
        const SHAb = crypto.createHash("sha1").update(content).digest("hex");
        const objdir = SHAb.slice(0,2);
        const objFile = SHAb.slice(2);
        fs.mkdirSync(path.join(process.cwd(),'.git','objects',objdir),{
            recursive : true,
        })
        fs.writeFileSync(
            path.join(process.cwd(), '.git', 'objects', objdir, objFile),
            zlib.deflateSync(content),
        );
        process.stdout.write(`${SHAb}\n`);
        }
}
module.exports = HashwriteCommand;