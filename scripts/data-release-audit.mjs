import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {BUNDLED_INFRA_DATA_ENABLED} from '../app/data-release-policy.ts';
assert.equal(BUNDLED_INFRA_DATA_ENABLED,false,'Unapproved optional datasets must remain disabled');
const banned=['db-stations.json','db-rail-network.json'];
for(const name of banned)assert.equal(existsSync('public/'+name),false,'Unapproved public asset: '+name);
const page=readFileSync('app/page.tsx','utf8');
assert.match(page,/if\(!BUNDLED_INFRA_DATA_ENABLED\)return;\s+const controller/);
assert.match(page,/if\(!BUNDLED_INFRA_DATA_ENABLED\)return;\s+const router/);
if(process.argv.includes('--build')){
 assert.ok(existsSync('dist/client/version.json'),'Production assets missing');
 assert.equal(JSON.parse(readFileSync('dist/client/version.json','utf8')).version,'62.0.0');
 function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const p=join(dir,entry.name);if(entry.isDirectory())walk(p);else assert.ok(!banned.includes(entry.name),'Restricted dataset leaked into build: '+p);}}
 walk('dist');
}
console.log('Release data isolation: consumers disabled, unapproved exports absent'+(process.argv.includes('--build')?' from production build':''));
