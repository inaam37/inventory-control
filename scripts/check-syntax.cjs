const fs=require('node:fs'), path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');let count=0;
const acorn=require('acorn');
function sinks(code){
  const tree=acorn.parse(code,{ecmaVersion:'latest'});
  function walk(n){if(!n||typeof n!=='object')return;
    if(n.type==='AssignmentExpression'&&n.left.type==='MemberExpression'&&n.left.property.name==='innerHTML'&&!(n.right.type==='CallExpression'&&n.right.callee.name==='safeHTML'))throw new Error('Unsafe legacy HTML assignment');
    if(n.type==='CallExpression'&&n.callee.type==='MemberExpression'&&n.callee.property.name==='write'&&!(n.arguments[0]?.type==='CallExpression'&&n.arguments[0].callee.name==='safeHTML'))throw new Error('Unsafe print HTML');
    for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}
  }walk(tree);
}
function check(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','vendor'].includes(entry.name))continue;const file=path.join(dir,entry.name);if(entry.isDirectory())check(file);else if(/\.(js|cjs)$/.test(file)&&!file.includes('/frontend/')){const code=fs.readFileSync(file,'utf8');new vm.Script(code,{filename:file});if(entry.name==='csv-utils.js'||entry.name==='manager.js')sinks(code);count++;}}}
check(root);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1].trim()){new vm.Script(match[1]);sinks(match[1]);count++;}
if(!fs.readFileSync(path.join(root,'vendor/purify.min.js')).equals(fs.readFileSync(path.join(root,'node_modules/dompurify/dist/purify.min.js'))))throw new Error('Vendored DOMPurify differs from the locked dependency');
console.log(`${count} JavaScript sources parse.`);
