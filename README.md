# Custom Git Implementation in Node.js  

[![progress-banner](https://backend.codecrafters.io/progress/git/cb366319-4a2c-4c83-8ed8-9b1808880d96)](https://app.codecrafters.io/users/codecrafters-bot?r=2qF)  

This project implements a simplified version of Git in Node.js. The goal is to understand Git internals by building essential functionalities like initializing a repository, hashing objects, and creating trees and commits.  

This project is my solution for the [**"Build Your Own Git" Challenge**](https://app.codecrafters.io/challenges/git).  



## Features  

- **Initialize Repository (`init`)**: Sets up a `.git` directory with the necessary structure.  
- **Hash Files (`hash-object`)**: Creates a blob object for a file and stores it in the `.git/objects` directory.  
- **Inspect Objects (`cat-file -p`)**: Reads and displays Git objects (e.g., blobs, trees).  
- **Write Tree (`write-tree`)**: Generates a tree object from the current directory structure.  
- **Commit Tree (`commit-tree`)**: Creates a commit object with a tree and parent commit hash.  
- **List Tree Objects (`ls-tree --name-only`)**: Displays the names of files in a tree object.  


## Getting Started  

### Prerequisites  

- Node.js v18+  

### Installation  

1. Clone this repository to your local machine:  
   ```bash  
   git clone https://github.com/your-username/your-repo.git  
   cd your-repo  
   ```  

2. Run the program:  
   ```bash  
   node index.js <command> [args]  
   ```  



## Usage  

Once the program is set up, you can use the following commands:  

### Initialize Repository  
```bash  
node index.js init  
```  
Sets up a `.git` directory in the current folder.  

### Inspect Objects  
```bash  
node index.js cat-file -p <sha>  
```  
Displays the content of the specified object.  

### Hash Files  
```bash  
node index.js hash-object <file-path>  
```  
Hashes a file and stores it as a blob object.  

### Write a Tree  
```bash  
node index.js write-tree  
```  
Creates a tree object representing the current directory.  

### Create a Commit  
```bash  
node index.js commit-tree <tree-sha> -p <parent-sha> -m "<commit-message>"  
```  
Creates a commit object using a tree, parent commit, and message.  

### List Tree Objects  
```bash  
node index.js ls-tree --name-only <sha>  
```  
Lists only the names of files in a tree object.  



## Notes  

- Objects are stored in the `.git/objects` directory.  
- The `HEAD` file points to the current branch (`refs/heads/main`).  



## License  

This project is licensed under the MIT License.  

