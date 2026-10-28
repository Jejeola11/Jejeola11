(() => {
 'use strict';
 // Same standalone Academy offers and checkout destinations as learn.js.
 const offers=[
  {key:'challenge',title:'14-Day AI Video Client Challenge',description:'Package your skill, research clients, pitch and build your pipeline with Coach Ria.',price:15000,checkout:'https://nestuge.com/challenge_academy_offer',image:'/atelier-v2/media/academy/ai-video-client-challenge.webp',alt:'14-Day AI Video Client Challenge with Coach Ria'},
  {key:'money',title:'The Money Engine System',description:'Turn your skill into clients.',price:4900,checkout:'https://nestuge.com/academy_money_engine',image:'https://res.cloudinary.com/bzw55wh2/image/upload/v1789495289/fuse-atelier/academy/money-card-exact.png',alt:'The Money Engine System course cover'}
 ];
 window.FuseAgentCourseOffers=offers;
 window.renderFuseAgentLocked=() => `<section class="agent-locked" aria-labelledby="agent-lock-title"><div class="agent-lock-intro"><p class="kicker">COURSE ACCESS REQUIRED</p><h1 id="agent-lock-title" class="chrome-text">Unlock your Fuse AI Agent</h1><p>To access the AI Agent, first get <strong>either the 14-Day AI Video Client Challenge or The Money Engine System.</strong> Choose one below to get started.</p></div><div class="academy-cards" aria-label="Courses that unlock the AI Agent">${offers.map(o=>`<a class="academy-course is-locked ${o.key}" href="${o.checkout}"><div class="academy-copy"><h2>${o.title}</h2><p>${o.description}</p><span class="academy-start">Unlock · ₦${o.price.toLocaleString('en-NG')}</span></div><div class="academy-visual"><img src="${o.image}" alt="${o.alt}"></div></a>`).join('')}</div><p class="agent-lock-note">Already purchased? Sign in with the email you used to buy. Agent research uses credits after course access is unlocked.</p></section>`;
})();
