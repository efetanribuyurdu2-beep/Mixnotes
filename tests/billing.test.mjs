import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import { createHmac } from 'node:crypto';

globalThis.billingEnv={MIXNOTES_FOUNDER_EMAIL:'founder@example.com'};
const plugin={name:'workers',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'workers',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env=globalThis.billingEnv;',loader:'js'}));}};
async function load(entry){const r=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'esm',plugins:[plugin]});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));}
const core=await load('db/workspace.ts'),route=await load('app/api/billing/[operation]/route.ts'),billing=await load('db/billing.ts'),membership=await load('db/membership.ts');
const keys={STRIPE_SECRET_KEY:'sk_test_secret',STRIPE_WEBHOOK_SECRET:'whsec_test',STRIPE_PRICE_MONTHLY:'price_month',STRIPE_PRICE_YEARLY:'price_year'};
function setup(configured=true){const sql=new DatabaseSync(':memory:');for(const q of core.schemaStatements)sql.exec(q);
 globalThis.billingEnv.DB={async batch(s){sql.exec('BEGIN');try{const r=[];for(const x of s)r.push(await x.run());sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}},prepare(query){return {args:[],bind(...args){return {...this,args};},async all(){return {results:sql.prepare(query).all(...this.args)};},async first(){return sql.prepare(query).get(...this.args)||null;},async run(){return {meta:{changes:Number(sql.prepare(query).run(...this.args).changes)}};}};}};
 for(const k of Object.keys(keys))delete globalThis.billingEnv[k];if(configured)Object.assign(globalThis.billingEnv,keys);return sql;}
const owner=async(email)=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(email))).toString('hex');
const ctx=operation=>({params:Promise.resolve({operation})});
const req=(op,{email='dj@example.com',method='POST',body,headers={}}={})=>new Request('https://mixnotes.test/api/billing/'+op,{method,body,headers:{...(email?{'oai-authenticated-user-email':email}:{}),origin:'https://mixnotes.test',...headers}});
const sign=(payload,t=Math.floor(Date.now()/1000),secret='whsec_test')=>`t=${t},v1=${createHmac('sha256',secret).update(`${t}.${payload}`).digest('hex')}`;
const webhook=(event,signature)=>{const payload=JSON.stringify(event);return route.POST(new Request('https://mixnotes.test/api/billing/webhook',{method:'POST',body:payload,headers:{'stripe-signature':signature??sign(payload)}}),ctx('webhook'));};

test('Stripe signatures are verified, constant-time and replay-bounded',async()=>{
 const payload='{"a":1}',now=Date.now();
 assert.equal(await billing.verifyStripeSignature(payload,sign(payload,Math.floor(now/1000)),'whsec_test',now),true);
 assert.equal(await billing.verifyStripeSignature(payload+' ',sign(payload),'whsec_test',now),false);
 assert.equal(await billing.verifyStripeSignature(payload,sign(payload,Math.floor(now/1000),'whsec_other'),'whsec_test',now),false);
 assert.equal(await billing.verifyStripeSignature(payload,sign(payload,Math.floor(now/1000)-301),'whsec_test',now),false);
 assert.equal(await billing.verifyStripeSignature(payload,null,'whsec_test',now),false);
 assert.equal(await billing.verifyStripeSignature(payload,'t=abc,v1=00','whsec_test',now),false);
});

test('Billing stays off without keys and never exposes secrets',async()=>{
 setup(false);
 const status=await (await route.GET(req('status',{method:'GET'}),ctx('status'))).json();
 assert.equal(status.configured,false);assert.equal(status.plan,'free');
 assert.equal((await route.POST(req('checkout',{body:'{"interval":"monthly"}'}),ctx('checkout'))).status,503);
 assert.equal((await webhook({type:'x',data:{object:{}}})).status,503);
 setup(true);
 const text=await (await route.GET(req('status',{method:'GET'}),ctx('status'))).text();
 assert.ok(!text.includes('sk_test')&&!text.includes('whsec'));
});

test('Checkout is created for the signed-in owner only, with server-chosen price',async()=>{
 setup();const id=await owner('dj@example.com');const original=globalThis.fetch;let sent;
 globalThis.fetch=async(url,options)=>{sent={url:String(url),auth:options.headers.Authorization,body:new URLSearchParams(options.body)};return Response.json({url:'https://checkout.stripe.com/c/pay/cs_test'});};
 try{
  const r=await route.POST(req('checkout',{body:'{"interval":"yearly","price":"price_free"}'}),ctx('checkout'));
  assert.equal(r.status,200);assert.equal((await r.json()).url,'https://checkout.stripe.com/c/pay/cs_test');
  assert.equal(sent.url,'https://api.stripe.com/v1/checkout/sessions');assert.equal(sent.auth,'Bearer sk_test_secret');
  assert.equal(sent.body.get('line_items[0][price]'),'price_year');assert.equal(sent.body.get('client_reference_id'),id);
  assert.equal(sent.body.get('subscription_data[metadata][owner_id]'),id);assert.equal(sent.body.get('success_url'),'https://mixnotes.test/?billing=success');
  assert.equal((await route.POST(req('checkout',{body:'{"interval":"weekly"}'}),ctx('checkout'))).status,400);
  assert.equal((await route.POST(req('checkout',{email:null,body:'{"interval":"monthly"}'}),ctx('checkout'))).status,401);
  assert.equal((await route.POST(req('checkout',{body:'{"interval":"monthly"}',headers:{origin:'https://evil.test'}}),ctx('checkout'))).status,403);
  assert.equal((await route.POST(req('checkout',{email:'founder@example.com',body:'{"interval":"monthly"}'}),ctx('checkout'))).status,409);
 }finally{globalThis.fetch=original;}
});

test('Signed webhooks drive the subscription lifecycle; forged ones change nothing',async()=>{
 const sql=setup();const id=await owner('dj@example.com');const future=Math.floor(Date.now()/1000)+30*86400;
 assert.equal((await webhook({type:'checkout.session.completed',data:{object:{mode:'subscription',client_reference_id:id,customer:'cus_1',subscription:'sub_1'}}},'t=1,v1=bad')).status,400);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM subscriptions').get().n,0);
 assert.equal((await webhook({type:'checkout.session.completed',data:{object:{mode:'subscription',client_reference_id:id,customer:'cus_1',subscription:'sub_1'}}})).status,200);
 assert.equal((await membership.membershipFor(id)).plan,'free');
 await webhook({type:'customer.subscription.updated',data:{object:{id:'sub_1',customer:'cus_1',status:'active',metadata:{},items:{data:[{current_period_end:future,price:{recurring:{interval:'year'}}}]}}}});
 assert.deepEqual(await membership.membershipFor(id),{plan:'pro',fullAccess:true});
 const status=await (await route.GET(req('status',{method:'GET'}),ctx('status'))).json();
 assert.equal(status.plan,'pro');assert.equal(status.subscription.interval,'yearly');assert.equal(status.subscription.active,true);
 assert.equal((await route.POST(req('checkout',{body:'{"interval":"monthly"}'}),ctx('checkout'))).status,409);
 await webhook({type:'customer.subscription.deleted',data:{object:{id:'sub_1',customer:'cus_1',status:'canceled',metadata:{owner_id:id},current_period_end:future}}});
 assert.equal((await membership.membershipFor(id)).plan,'free');
 await webhook({type:'customer.subscription.updated',data:{object:{id:'sub_2',customer:'cus_unknown',status:'active',metadata:{},current_period_end:future}}});
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM subscriptions').get().n,1);
 await webhook({type:'customer.subscription.updated',data:{object:{id:'sub_1',customer:'cus_1',status:'active',metadata:{owner_id:id},current_period_end:Math.floor(Date.now()/1000)-3*86400}}});
 assert.equal((await membership.membershipFor(id)).plan,'free');
});

test('Portal requires an existing customer',async()=>{
 const sql=setup();const id=await owner('dj@example.com');const original=globalThis.fetch;
 assert.equal((await route.POST(req('portal'),ctx('portal'))).status,404);
 sql.prepare("INSERT INTO subscriptions(owner_id,customer_id,updated_at) VALUES (?,?,'')").run(id,'cus_9');
 globalThis.fetch=async(url,options)=>{assert.equal(new URLSearchParams(options.body).get('customer'),'cus_9');return Response.json({url:'https://billing.stripe.com/p/session/x'});};
 try{const r=await route.POST(req('portal'),ctx('portal'));assert.equal((await r.json()).url,'https://billing.stripe.com/p/session/x');}finally{globalThis.fetch=original;}
});
