import {describe,expect,it} from "vitest";
import {createTaskSchema,listTaskSchema,registerSchema,updateTaskSchema} from "./validation.js";
describe("request validation",()=>{
 it("rejects short passwords",()=>{expect(registerSchema.safeParse({name:"Jane Doe",email:"jane@example.com",password:"123"}).success).toBe(false);});
 it("normalizes email",()=>{const x=registerSchema.parse({name:"Jane Doe",email:" JANE@EXAMPLE.COM ",password:"password123"});expect(x.email).toBe("jane@example.com");});
 it("validates task values",()=>{expect(createTaskSchema.safeParse({title:" ",priority:"URGENT"}).success).toBe(false);expect(createTaskSchema.safeParse({title:"Write tests",priority:"HIGH"}).success).toBe(true);});
 it("rejects empty patch",()=>{expect(updateTaskSchema.safeParse({}).success).toBe(false);});
 it("bounds pagination",()=>{expect(listTaskSchema.parse({page:"2",limit:"20"})).toMatchObject({page:2,limit:20});expect(listTaskSchema.safeParse({limit:"999"}).success).toBe(false);});
});
