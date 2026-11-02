const express = require('express');
const crypto = require('crypto');
const router = express.Router();
// Operator-supplied credentials only. Sessions expire on restart.
const signingSecret = crypto.randomBytes(32);
const attempts = new Map();
const permissions = role => role === 'MANAGER' ? ['inventory:read','inventory:write','recipes:read','recipes:write','import:write','reports:read','vendors:read'] : [];
function generateToken(user) {
  const payload = Buffer.from(JSON.stringify({id:user.id,username:user.username,role:user.role,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
  return payload+'.'+crypto.createHmac('sha256',signingSecret).update(payload).digest('base64url');
}
function verifyToken(token) {
  try {
    if(typeof token!=='string'||token.length>4096) return null;
    const parts=token.split('.'); if(parts.length!==2) return null;
    const [payload,signature]=parts;
    const expected=crypto.createHmac('sha256',signingSecret).update(payload).digest('base64url');
    if(signature.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected))) return null;
    const user=JSON.parse(Buffer.from(payload,'base64url').toString());
    if(!Number.isFinite(user.exp)||user.exp<=Date.now()/1000||user.role!=='MANAGER') return null;
    return {...user,permissions:permissions(user.role)};
  } catch { return null; }
}
function equal(a,b) {return crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(),crypto.createHash('sha256').update(b).digest());}
router.post('/login',(req,res)=>{
  if(!process.env.MANAGER_KEY||process.env.MANAGER_KEY.length<24) return res.status(503).json({error:'Configure a private MANAGER_KEY of at least 24 characters.'});
  const now=Date.now(),ip=req.ip;
  for(const [k,v] of attempts) if(now-v.start>60000) attempts.delete(k);
  const attempt=attempts.get(ip)||{start:now,count:0};
  if(attempt.count>=10) return res.status(429).json({error:'Too many attempts; retry in one minute.'});
  attempt.count++;attempts.set(ip,attempt);
  const {username,masterKey}=req.body||{};
  if(typeof username!=='string'||typeof masterKey!=='string') return res.status(400).json({error:'username and masterKey are required'});
  if(username!==(process.env.MANAGER_USERNAME||'manager')||!equal(masterKey,process.env.MANAGER_KEY)) return res.status(401).json({error:'Invalid credentials'});
  attempts.delete(ip);const user={id:'manager',username,role:'MANAGER'};
  return res.json({token:generateToken(user),user:{...user,permissions:permissions(user.role)}});
});
function requirePermission(permission) {return (req,res,next)=>{
  const user=verifyToken(req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]);
  if(!user) return res.status(401).json({error:'Invalid or expired session'});
  if(!user.permissions.includes(permission)) return res.status(403).json({error:'Permission required'});
  req.user=user;next();
};}
router.post('/verify',requirePermission('inventory:read'),(req,res)=>res.json({user:req.user}));
module.exports={router,requirePermission,verifyToken,generateToken};
