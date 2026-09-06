import test from 'node:test'; import assert from 'node:assert/strict'; import { createHash } from 'node:crypto';
const normalize=(raw)=>{const url=new URL(raw);url.hash='';for(const key of [...url.searchParams.keys()])if(/^(utm_|fbclid$)/i.test(key))url.searchParams.delete(key);return url.toString()};
const hash=(url,content)=>createHash('sha256').update(`${normalize(url)}\n${content.trim().replace(/\s+/g,' ')}`).digest('hex');
test('URL tracking parameters and whitespace do not bypass duplicate hash protection',()=>assert.equal(hash('https://example.com/a?utm_source=x','Merhaba   dünya'),hash('https://example.com/a','Merhaba dünya')));
