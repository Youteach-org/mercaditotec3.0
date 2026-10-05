import { it, expect } from 'vitest';
import { reactionMigrationPlan } from './reactionMigration.mjs';
it('migrates more than a hundred old duplicates while preserving the latest selection',()=>{
 const records=Array.from({length:102},(_,i)=>({id:`old-${i}`,data:{messageId:'m1',userId:'alice',emoji:i===101?'🔥':'👍',createdAt:i+1}}));
 const plan=reactionMigrationPlan(records);expect(plan).toHaveLength(1);expect(plan[0].deleteIds).toHaveLength(102);expect(plan[0].data).toMatchObject({emoji:'🔥',createdAt:102});
 expect(reactionMigrationPlan([{id:plan[0].id,data:plan[0].data}])[0].deleteIds).toEqual([]);
});
