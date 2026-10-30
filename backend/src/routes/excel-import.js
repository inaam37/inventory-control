const router=require('express').Router();
router.all('*',(req,res)=>res.status(501).json({error:'Legacy Excel/AI import is disabled. No paid API is called.'}));
module.exports=router;
