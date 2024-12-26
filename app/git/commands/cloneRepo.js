class CloneRepo {
    constructor(repositoryUrl, destinationPath) {
      this.repositoryUrl = repositoryUrl;
      this.destinationPath = destinationPath;
    }
  
    run() {
      const { exec } = require('child_process');
  
      exec(`git clone ${this.repositoryUrl} ${this.destinationPath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
      });
    }
  }
  
  module.exports = CloneRepo;