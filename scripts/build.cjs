const fs=require('node:fs'),path=require('node:path');
const files=require('./app-files.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
fs.rmSync(out,{recursive:true,force:true});
for(const file of files){const target=path.join(out,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);}
fs.writeFileSync(path.join(out,'.nojekyll'),'');
console.log(`Built ${files.length} app assets plus .nojekyll in dist/. No backend, credentials or operational data included.`);
