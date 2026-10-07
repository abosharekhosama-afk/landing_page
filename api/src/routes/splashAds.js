import { Router } from 'express';
import crypto from 'node:crypto';
import { requireAuth, requireAnyPermission } from '../middleware/auth.js';
import { splashAdRepository, splashAdEventRepository, persistCompanyStore } from '../data/store.js';
import { createCrudRouter } from './employee4Crud.js';

const r=Router();

/**
 * Record a VIEW or CLICK event for a splash ad owned by the given company.
 * Shared by both the authenticated admin router and the public storefront
 * tracker so a single code path persists the counter and there is no drift
 * between the two entry points.
 */
export async function trackSplashEvent(type, companyId, adId, now = new Date()) {
  const ad = splashAdRepository.findByCompany(companyId, adId);
  if (!ad) return null;
  const event = {
    id: crypto.randomUUID(),
    company_id: companyId,
    splash_ad_id: ad.id,
    event_type: type,
    created_at: now.toISOString(),
  };
  splashAdEventRepository.createForCompany(companyId, event, { prepend: true });
  await persistCompanyStore(companyId);
  return event;
}

function track(type){return async(req,res)=>{const event=await trackSplashEvent(type,req.companyId,req.params.id);if(!event)return res.status(404).json({message:'Not found.'});res.status(201).json({id:event.id,event_type:type});};}
const splashAnimStyles = new Set(["fade", "rise", "zoom", "slide", "blur"]);
const splashAnimSpeeds = new Set(["slow", "normal", "fast"]);
const splashAnimDirections = new Set(["up", "down", "left", "right", "none"]);
function validateSplashAd(value = {}) {
  if (!value.title) return "Title is required.";
  if (value.animation_style != null && !splashAnimStyles.has(value.animation_style)) return "Invalid animation style.";
  if (value.animation_speed != null && !splashAnimSpeeds.has(value.animation_speed)) return "Invalid animation speed.";
  if (value.animation_direction != null && !splashAnimDirections.has(value.animation_direction)) return "Invalid animation direction.";
  if (value.animation_duration != null && (!Number.isFinite(Number(value.animation_duration)) || Number(value.animation_duration) < 200 || Number(value.animation_duration) > 2000)) {
    return "Animation duration must be between 200 and 2000 ms.";
  }
  return null;
}
const admin = createCrudRouter({repository:splashAdRepository,viewPermission:'splash_ads.view',managePermission:'splash_ads.manage',entityType:'SPLASH_AD',actionPrefix:'SPLASH_AD',validate:validateSplashAd});
r.use(requireAuth);
r.get('/:id/metrics',requireAnyPermission('splash_ads.view','splash_ads.manage'),(req,res)=>{const events=splashAdEventRepository.getByCompany(req.companyId).filter(e=>e.splash_ad_id===req.params.id);const views=events.filter(e=>e.event_type==='VIEW').length;const clicks=events.filter(e=>e.event_type==='CLICK').length;res.json({views,clicks,ctr:views?clicks/views:0});});
r.use('/',admin);
r.post('/:id/view',track('VIEW'));
r.post('/:id/click',track('CLICK'));
export default r;
