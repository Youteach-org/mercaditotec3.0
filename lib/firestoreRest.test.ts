import { afterEach, it, expect, vi } from 'vitest';
import { Transaction, getAdminDb } from './firestoreRest';
vi.mock('./firebaseAdmin',()=>({getAdminAccessToken:async()=> 'owner',getFirebaseProjectId:()=> 'test-project'}));
afterEach(()=>vi.unstubAllGlobals());
it('reads transaction documents using batchGet and preserves the transaction identity',async()=>{
 vi.stubGlobal('fetch',async(input:string,options:RequestInit)=>{
  if(!input.endsWith('/documents:batchGet'))return Response.json({error:{message:'transactional GET unsupported'}},{status:500});
  const body=JSON.parse(String(options.body));expect(body.transaction).toBe('transaction-1');expect(body.documents).toEqual(['projects/test-project/databases/(default)/documents/messages/m1']);
  return Response.json([{found:{name:body.documents[0],fields:{text:{stringValue:'hello'}}}}]);
 });
 expect((await new Transaction('transaction-1').get(getAdminDb().collection('messages').doc('m1'))).data()).toEqual({text:'hello'});
});
it('recognizes missing transaction documents without treating a server failure as absence',async()=>{
 vi.stubGlobal('fetch',async()=>Response.json([{missing:'projects/test-project/databases/(default)/documents/messages/m1'}]));
 expect((await new Transaction('transaction-1').get(getAdminDb().collection('messages').doc('m1'))).exists).toBe(false);
});
it('propagates server failures and rejects malformed or mismatched transaction responses',async()=>{
 const read=()=>new Transaction('transaction-1').get(getAdminDb().collection('messages').doc('m1'));
 vi.stubGlobal('fetch',async()=>Response.json({error:{message:'unavailable'}},{status:500}));await expect(read()).rejects.toMatchObject({status:500});
 for(const result of [{},[],[{missing:'projects/test-project/databases/(default)/documents/messages/other'}]]){
  vi.stubGlobal('fetch',async()=>Response.json(result));await expect(read()).rejects.toMatchObject({status:502});
 }
});

it('backs off and retries aborted transaction commits instead of failing immediately',async()=>{
 let beginCount=0;
 let commitCount=0;
 vi.stubGlobal('fetch',async(input:string)=>{
  if(input.endsWith('/documents:beginTransaction')){
   beginCount+=1;
   return Response.json({transaction:`transaction-${beginCount}`});
  }
  if(input.endsWith('/documents:commit')){
   commitCount+=1;
   if(commitCount<3){
    return Response.json(
     {error:{code:409,message:'Transaction lock timeout.',status:'ABORTED'}},
     {status:409},
    );
   }
   return Response.json({writeResults:[]});
  }
  if(input.endsWith('/documents:rollback')) return Response.json({});
  throw new Error(`Unexpected URL: ${input}`);
 });
 await expect(getAdminDb().runTransaction(async()=> 'saved')).resolves.toBe('saved');
 expect(commitCount).toBe(3);
 expect(beginCount).toBe(3);
});

it('runs indexed array-contains Firestore queries instead of listing the entire collection',async()=>{
 vi.stubGlobal('fetch',async(input:string,options:RequestInit)=>{
  expect(input).toContain('documents:runQuery');
  const body=JSON.parse(String(options.body));
  expect(body.structuredQuery.from).toEqual([{collectionId:'direct_chats'}]);
  expect(body.structuredQuery.where).toEqual({
   fieldFilter:{
    field:{fieldPath:'participantUids'},
    op:'ARRAY_CONTAINS',
    value:{stringValue:'user-a'},
   },
  });
  expect(body.structuredQuery.limit).toBe(250);
  return Response.json([{document:{
   name:'projects/test-project/databases/(default)/documents/direct_chats/abc',
   fields:{participantUids:{arrayValue:{values:[{stringValue:'user-a'},{stringValue:'user-b'}]}}},
  }}]);
 });
 const result=await getAdminDb().collection('direct_chats')
  .where('participantUids','array-contains','user-a').limit(250).get();
 expect(result.docs.map(doc=>doc.id)).toEqual(['abc']);
});
