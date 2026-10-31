import "dotenv/config";
import express, {type Request,type Response,type NextFunction} from "express";
import cors from "cors";
import helmet from "helmet";
import {rateLimit} from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt,{type JwtPayload} from "jsonwebtoken";
import {Prisma, PrismaClient} from "@prisma/client";
import {z} from "zod";
import {createTaskSchema,listTaskSchema,loginSchema,registerSchema,updateTaskSchema} from "./validation.js";

const db=new PrismaClient();
const app=express();
app.disable("x-powered-by");
app.use(helmet());
const origin=process.env.CORS_ORIGIN||"http://localhost:5173";
app.use(cors({origin}));
app.use(express.json({limit:"16kb"}));
app.use("/api/auth",rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:"draft-7",legacyHeaders:false}));

const secret=process.env.JWT_SECRET;
if(!secret||secret.length<32)throw new Error("Set JWT_SECRET to a random value of at least 32 characters");

type AuthRequest=Request & {userId?:string};
function auth(req:AuthRequest,res:Response,next:NextFunction):void{
 const value=req.header("authorization")||"";
 if(!value.startsWith("Bearer ")){res.status(401).json({error:"Bearer token required"});return;}
 try{
  const data=jwt.verify(value.slice(7),secret!) as JwtPayload;
  if(typeof data.sub!=="string"){res.status(401).json({error:"Invalid token"});return;}
  req.userId=data.sub;next();
 }catch{res.status(401).json({error:"Invalid or expired token"});}
}
function validationError(err:z.ZodError){return {error:"Validation failed",details:err.flatten()};}
const wrap=(fn:(req:AuthRequest,res:Response)=>Promise<void>)=>(req:AuthRequest,res:Response,next:NextFunction)=>{Promise.resolve(fn(req,res)).catch(next);};

app.get("/api/health",(_req,res)=>res.json({status:"ok",service:"taskflow-api"}));
app.post("/api/auth/register",wrap(async(req,res)=>{
 const v=registerSchema.safeParse(req.body);
 if(!v.success){res.status(400).json(validationError(v.error));return;}
 const {name,email,password}=v.data;
 const passwordHash=await bcrypt.hash(password,12);
 try{
  const user=await db.user.create({data:{name,email,passwordHash},select:{id:true,name:true,email:true}});
  res.status(201).json({user,token:jwt.sign({},secret!,{subject:user.id,expiresIn:"12h"})});
 }catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==="P2002"){res.status(409).json({error:"Email already registered"});return;}throw e;}
}));
app.post("/api/auth/login",wrap(async(req,res)=>{
 const v=loginSchema.safeParse(req.body);
 if(!v.success){res.status(400).json(validationError(v.error));return;}
 const user=await db.user.findUnique({where:{email:v.data.email}});
 if(!user||!(await bcrypt.compare(v.data.password,user.passwordHash))){res.status(401).json({error:"Invalid credentials"});return;}
 res.json({user:{id:user.id,name:user.name,email:user.email},token:jwt.sign({},secret!,{subject:user.id,expiresIn:"12h"})});
}));

app.get("/api/tasks",auth,wrap(async(req,res)=>{
 const v=listTaskSchema.safeParse(req.query);
 if(!v.success){res.status(400).json(validationError(v.error));return;}
 const {page,limit,status,priority}=v.data;
 const where:Prisma.TaskWhereInput={ownerId:req.userId!,...(status?{status}:{}),...(priority?{priority}:{})};
 const [items,total]=await db.$transaction([
  db.task.findMany({where,orderBy:{createdAt:"desc"},skip:(page-1)*limit,take:limit}),
  db.task.count({where})
 ]);
 res.json({items,pagination:{page,limit,total,pages:Math.ceil(total/limit)}});
}));
app.post("/api/tasks",auth,wrap(async(req,res)=>{
 const v=createTaskSchema.safeParse(req.body);
 if(!v.success){res.status(400).json(validationError(v.error));return;}
 const {dueAt,...data}=v.data;
 const task=await db.task.create({data:{...data,ownerId:req.userId!,...(dueAt!==undefined?{dueAt:dueAt===null?null:new Date(dueAt)}:{})}});
 res.status(201).json(task);
}));
app.get("/api/tasks/:id",auth,wrap(async(req,res)=>{
 const task=await db.task.findFirst({where:{id:req.params.id,ownerId:req.userId!}});
 if(!task){res.status(404).json({error:"Task not found"});return;}
 res.json(task);
}));
app.patch("/api/tasks/:id",auth,wrap(async(req,res)=>{
 const v=updateTaskSchema.safeParse(req.body);
 if(!v.success){res.status(400).json(validationError(v.error));return;}
 const {dueAt,...data}=v.data;
 const update=await db.task.updateMany({where:{id:req.params.id,ownerId:req.userId!},data:{...data,...(dueAt!==undefined?{dueAt:dueAt===null?null:new Date(dueAt)}:{})}});
 if(!update.count){res.status(404).json({error:"Task not found"});return;}
 res.json(await db.task.findFirst({where:{id:req.params.id,ownerId:req.userId!}}));
}));
app.delete("/api/tasks/:id",auth,wrap(async(req,res)=>{
 const result=await db.task.deleteMany({where:{id:req.params.id,ownerId:req.userId!}});
 if(!result.count){res.status(404).json({error:"Task not found"});return;}
 res.status(204).end();
}));
app.use((_req,res)=>res.status(404).json({error:"Route not found"}));
app.use((err:unknown,_req:Request,res:Response,_next:NextFunction)=>{
 console.error(err);
 if(err instanceof SyntaxError&&"body" in err){res.status(400).json({error:"Invalid JSON"});return;}
 res.status(500).json({error:"Unexpected server error"});
});
const port=Number(process.env.PORT)||4000;
const server=app.listen(port,()=>console.log(`TaskFlow API listening on http://localhost:${port}`));
async function shutdown(){server.close();await db.$disconnect();}
process.on("SIGINT",()=>{shutdown().then(()=>process.exit(0));});
process.on("SIGTERM",()=>{shutdown().then(()=>process.exit(0));});
