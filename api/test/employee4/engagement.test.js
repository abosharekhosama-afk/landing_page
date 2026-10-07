import test from 'node:test'; import assert from 'node:assert/strict';
import { getVisibleAnnouncements } from '../../src/engagement/announcements.js';
import { getVisibleSplashAds, isSplashActive, isSplashExcluded } from '../../src/engagement/splashAds.js';
test('announcement visibility respects schedule, page and priority',()=>{const now=new Date('2026-09-01T00:00:00Z');const items=[{id:'a',is_active:true,placement:'ALL_PAGES',priority:1},{id:'b',is_active:true,placement:'HOMEPAGE',priority:9},{id:'c',is_active:false,placement:'ALL_PAGES'}];assert.deepEqual(getVisibleAnnouncements(items,'/',now).map(x=>x.id),['b','a']);});
test('splash helpers respect active state and exclusions',()=>{const ad={id:'s1',is_active:true,excluded_pages:['/checkout']};assert.equal(isSplashActive(ad),true);assert.equal(isSplashExcluded(ad,'/checkout'),true);assert.equal(isSplashExcluded(ad,'/'),false);assert.deepEqual(getVisibleSplashAds([ad,{id:'s2',is_active:false}],'/').map((x)=>x.id),['s1']);});
