import { z } from "zod";
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128)
}).strict();
export const loginSchema = registerSchema.pick({email:true,password:true});
export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  status: z.enum(["TODO","IN_PROGRESS","DONE"]).optional(),
  priority: z.enum(["LOW","MEDIUM","HIGH"]).optional(),
  dueAt: z.string().datetime({offset:true}).nullable().optional()
}).strict();
export const updateTaskSchema = createTaskSchema.partial().refine(data=>Object.keys(data).length>0,"Specify at least one field");
export const listTaskSchema = z.object({
  status: z.enum(["TODO","IN_PROGRESS","DONE"]).optional(),
  priority: z.enum(["LOW","MEDIUM","HIGH"]).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10)
});
