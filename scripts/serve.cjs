const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const allowed=new Set(require('./app-files.cjs'));
function createServer({directory=root,prefix=''}={}){return http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(prefix && !pathname.startsWith(prefix+'/')){res.writeHead(404);res.end('Not found');return;}
  const file=pathname.slice(prefix.length+1)||'index.html';
  if(req.method!=='GET'||!allowed.has(file)){res.writeHead(404);res.end('Not found');return;}
  const contentType=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.txt')?'text/plain; charset=utf-8':'text/javascript; charset=utf-8';
  res.writeHead(200,{'Content-Type':contentType,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});fs.createReadStream(path.join(directory,file)).pipe(res);
});}
if(require.main===module){const server=createServer();server.listen(Number(process.env.PORT||8000),'127.0.0.1',()=>console.log(`PantryPilot: http://127.0.0.1:${server.address().port}`));}
module.exports={createServer};
