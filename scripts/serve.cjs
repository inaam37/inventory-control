const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const allowed=new Set(['index.html','csv-utils.js','inventory-engine.js','farmhouse-menu.js','manager.js','safe-html.js','vendor/purify.min.js']);
function createServer(){return http.createServer((req,res)=>{
  const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  if(req.method!=='GET'||!allowed.has(file)){res.writeHead(404);res.end('Not found');return;}
  const contentType=file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8';
  res.writeHead(200,{'Content-Type':contentType,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});fs.createReadStream(path.join(root,file)).pipe(res);
});}
if(require.main===module){const server=createServer();server.listen(Number(process.env.PORT||8000),'127.0.0.1',()=>console.log(`PantryPilot: http://127.0.0.1:${server.address().port}`));}
module.exports={createServer};
