const router=require('express').Router();
router.get('/',(req,res)=>res.json({message:'Local API scaffold; browser workspace is the supported manager app. API inventory is in-memory and not synchronized with the browser.',endpoints:['items','recipes','reports']}));
module.exports=router;
