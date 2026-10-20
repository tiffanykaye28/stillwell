// Isolated live integration checks. Creates only temporary QA records and removes
// them in finally; never edits an existing student's records or sends email.
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
if(process.env.STILLWELL_POLISH_SETUP!=="true")process.exit(0);
const base=process.env.SUPABASE_URL.trim().replace(/\/$/,"");
const key=process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
const apiKey=process.env.SUPABASE_SECRET_KEY.trim();
const run=randomUUID(),password=randomUUID()+"Aa9!";
const users=[], cleanup=[];
async function http(path,{token,method="GET",body,admin=false,prefer}={}){
 const r=await fetch(base+path,{method,headers:{apikey:admin?key:apiKey,...(admin||token?{Authorization:`Bearer ${admin?key:token}`}:{ }),"Content-Type":"application/json",...(prefer?{Prefer:prefer}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
 const text=await r.text();
 return {status:r.status,data:text?JSON.parse(text):null};
}
async function account(role){
 const email=`${role}-${users.length}-${run}@qa.stillwell.invalid`;
 const created=await http("/auth/v1/admin/users",{admin:true,method:"POST",body:{email,password,email_confirm:true,user_metadata:{display_name:"Temporary QA account",adult_confirmed:true,policy_version:"1"}}});
 assert.equal(created.status,200,"QA account creation");const id=created.data.id;users.push(id);
 if(role!=="student"){const patch=await http(`/rest/v1/profiles?id=eq.${id}`,{admin:true,method:"PATCH",body:{role}});assert.equal(patch.status,204);}
 const login=await http("/auth/v1/token?grant_type=password",{method:"POST",body:{email,password}});
 assert.equal(login.status,200,"QA password authentication");
 return {id,token:login.data.access_token};
}
let passed=false;
try{
 const a=await account("student"),b=await account("student"),c=await account("counselor"),admin=await account("admin");
 const mood=await http("/rest/v1/mood_entries",{token:a.token,method:"POST",prefer:"return=representation",body:{user_id:a.id,entry_date:new Date().toISOString().slice(0,10),mood:"Anxious",intensity:3,note:"Synthetic integration-test note"}});
 assert.equal(mood.status,201);
 for(const person of [b,c,admin]){
   const hidden=await http(`/rest/v1/mood_entries?user_id=eq.${a.id}`,{token:person.token});
   assert.equal(hidden.status,200);assert.deepEqual(hidden.data,[],"Other roles cannot read private mood notes");
 }
 const own=await http(`/rest/v1/mood_entries?id=eq.${mood.data[0].id}`,{token:a.token});assert.equal(own.data.length,1,"Mood persists on a fresh request");
 const denied=await http(`/rest/v1/profiles?id=eq.${a.id}`,{token:a.token,method:"PATCH",body:{role:"admin"}});assert(denied.status>=400,"Student cannot set own role");
 const template=await http("/rest/v1/assessments",{token:admin.token,method:"POST",prefer:"return=representation",body:{title:"QA temporary "+run,questions:["I made time to rest.","I could ask for support."]}});
 assert.equal(template.status,201);const tid=template.data[0].id;cleanup.push(["assessments",tid]);
 const result=await http("/rest/v1/assessment_results",{token:a.token,method:"POST",prefer:"return=representation",body:{user_id:a.id,assessment_id:tid,answers:[1,2],score:999,max_score:999}});
 assert.equal(result.status,201);assert.equal(result.data[0].score,3);assert.equal(result.data[0].max_score,6);
 const privateResults=await http(`/rest/v1/assessment_results?user_id=eq.${a.id}`,{token:c.token});assert.deepEqual(privateResults.data,[]);
 const removed=await http(`/rest/v1/assessments?id=eq.${tid}`,{token:admin.token,method:"DELETE"});assert.equal(removed.status,204);
 const preserved=await http(`/rest/v1/assessment_results?id=eq.${result.data[0].id}`,{token:a.token});assert.equal(preserved.data[0].assessment_id,null);assert.equal(preserved.data[0].questions_snapshot.length,2);
 const appointment=await http("/rest/v1/appointments",{token:a.token,method:"POST",prefer:"return=representation",body:{user_id:a.id,student_name:"Temporary QA account",requested_at:new Date(Date.now()+86400000).toISOString(),mode:"Online",reason:"General wellbeing",status:"pending",sharing_consent:true}});
 assert.equal(appointment.status,201);const aid=appointment.data[0].id;
 const forbidden=await http("/rest/v1/rpc/set_appointment_status",{token:b.token,method:"POST",body:{appointment_id:aid,new_status:"confirmed"}});assert(forbidden.status>=400);
 for(const status of ["confirmed","completed"]){const update=await http("/rest/v1/rpc/set_appointment_status",{token:c.token,method:"POST",body:{appointment_id:aid,new_status:status}});assert(update.status<300);}
 const studentView=await http(`/rest/v1/appointments?id=eq.${aid}`,{token:a.token});assert.equal(studentView.data[0].status,"completed");
 const resource=await http("/rest/v1/resources",{token:c.token,method:"POST",prefer:"return=representation",body:{title:"QA temporary "+run,category:"QA",body:"Synthetic educational resource."}});
 assert.equal(resource.status,201);const rid=resource.data[0].id;cleanup.push(["resources",rid]);
 const edit=await http(`/rest/v1/resources?id=eq.${rid}`,{token:c.token,method:"PATCH",body:{body:"Updated synthetic resource."}});assert.equal(edit.status,204);
 const resourceView=await http(`/rest/v1/resources?id=eq.${rid}`,{token:a.token});assert.equal(resourceView.data[0].body,"Updated synthetic resource.");
 const roles=await http("/rest/v1/rpc/admin_set_role",{token:admin.token,method:"POST",body:{target_user:b.id,new_role:"counselor"}});assert(roles.status<300);
 const changed=await http(`/rest/v1/profiles?id=eq.${b.id}`,{token:admin.token});assert.equal(changed.data[0].role,"counselor");
 passed=true;
} finally {
 let failures=0;
 for(const [table,id] of cleanup){const r=await http(`/rest/v1/${table}?id=eq.${id}`,{admin:true,method:"DELETE"});if(r.status>=300)failures++;}
 for(const id of users){const r=await http(`/auth/v1/admin/users/${id}`,{admin:true,method:"DELETE"});if(r.status>=300)failures++;}
 assert.equal(failures,0,"Temporary QA record cleanup");
 console.log(`Live integration checks ${passed?"passed":"failed"}; temporary QA accounts and records removed.`);
}
