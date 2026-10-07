import test from 'node:test'; import assert from 'node:assert/strict'; import { validateTemplate,renderTemplate } from '../../src/sms/smsTemplateService.js';
test('SMS templates reject unsupported variables',()=>{const r=validateTemplate('ORDER_CONFIRMATION','Hi {{customer_name}} {{evil}}');assert.equal(r.valid,false);assert.deepEqual(r.unsupported,['evil']);});
test('SMS templates render allowed variables',()=>{assert.equal(renderTemplate('Hi {{customer_name}} #{{order_number}}',{customer_name:'A',order_number:'42'}),'Hi A #42');});
