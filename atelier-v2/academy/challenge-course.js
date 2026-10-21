(() => {
  'use strict';
  const pillars = window.FUSE_COURSE && window.FUSE_COURSE.pillars;
  if (!Array.isArray(pillars) || pillars.some(course => course.key === 'challenge')) return;

  const days = [
    ['Are you ready to sell your skill?', 'Audit your current work and choose one publishable sample.'],
    ['Build a service people can buy', 'Write your buyer, deliverables, scope and starting price.'],
    ['Make your portfolio prove the offer', 'Prepare two honest samples and your portfolio link.'],
    ['Find businesses with a reason to talk', 'Research five qualified prospects and record the current signal.'],
    ['Find the right contact and channel', 'Verify the person, their role and a public contact route.'],
    ['Choose ask-first or sample-first', 'Match your approach to the prospect and prepare the right concept.'],
    ['Send a first message that starts a conversation', 'Send five researched, personalized first messages.'],
    ['Read replies and follow up', 'Respond to real replies and follow up without inventing urgency.'],
    ['Turn interest into a clear brief', 'Ask discovery questions and write a one-page creative direction.'],
    ['Quote, scope and request a deposit', 'Prepare a fixed-price quote with deliverables and revision limits.'],
    ['Handle objections without discounting blindly', 'Practice answers to the objections you actually receive.'],
    ['Agree on the work and deliver well', 'Confirm approval, files, payment steps and delivery schedule.'],
    ['Run the pipeline and improve your pitch', 'Review your tracker and improve one weak step.'],
    ['Build your next 30-day plan', 'Submit your tracker, pipeline and next 30-day action plan.']
  ];
  const resources = window.FUSE_CHALLENGE_RESOURCES || [];
  const dayThreePortfolioPrompt = `Act as a portfolio strategist, copywriter and website builder for an AI video creator.

I am attaching my actual work. I will also give you my completed Day 1 and Day 2 assignments below. Use those answers as the source of truth.

DAY 1 — MY CURRENT SKILL AND PROOF
[PASTE YOUR COMPLETED DAY 1 ANSWERS]

DAY 2 — MY BUYER AND OFFER
[PASTE YOUR COMPLETED DAY 2 ANSWERS]

MY ATTACHED WORK
Check the uploaded projects or here are the links to my work 👇

Build a professional, mobile-first portfolio that helps my chosen buyer understand my work and contact me.

First, review my answers and propose:
1. A clear headline and short introduction.
2. The best order for my work based on the buyer I chose.
3. A short case study for each selected video: brief, approach, what I made, and what it demonstrates.
4. My service section using the exact scope and starting price I provided.
5. One clear call to action.

Accuracy rules:
- Do not invent clients, testimonials, views, sales, conversion results or years of experience.
- Do not imply that a brand commissioned a concept unless I confirm it.
- Do not change my price, deliverables, turnaround or revision terms.
- If essential information is missing, mark it for my review instead of guessing.
- Use my real uploaded videos and approved images. Do not replace them with generated samples.

After I approve the copy, build the responsive portfolio page. Give each video a clear title and short case study. Make playback and the contact button work. If a contact form needs a backend to send messages, tell me that clearly and do not pretend the form is connected. Show me how to preview and publish the finished page.

Search Online and the web for design inspirations`;
  const modules = [{
    key:'challenge-start', title:'Start here', kicker:'Orientation', lessons:[{
      key:'challenge-start', title:'Welcome to the 14-Day AI Video Client Challenge',
      learnText:'See the daily rhythm: watch the lesson, complete the action, share your work at check-in and bring it to the three review checkpoints.',
      actionText:'Set up your prospect tracker, portfolio folder and a daily time block. The teaching deck is your recording and reference guide.'
    }]
  }];
  days.forEach(([title, action], index) => {
    const day = index + 1;
    modules.push({key:`challenge-day-${day}`,title:`Day ${day} · ${title}`,kicker:`Day ${day}`,lessons:[{
      key:`challenge-day-${day}`,title:`Day ${day}: ${title}`,
      learnText:`Today's focus: ${title}. Watch the lesson, study the example and apply it to your own AI video service.`,
      actionText:action,
      ...(day===3 ? {copyPrompt:dayThreePortfolioPrompt} : {})
    }]});
  });
  modules.push({
    key:'challenge-resources', title:'Resources', kicker:'Read and copy', lessons:resources.map(item=>({
      key:item.key,title:item.title,kind:'resource',resource:item,
      learnText:item.intro,actionText:'Use the examples and copyable template below as you work through the daily lessons.'
    }))
  });
  pillars.push({
    key:'challenge', name:'14-Day AI Video Client Challenge',
    sub:'With Coach Ria · 14 daily lessons and action steps', modules
  });
  window.FUSE_CHALLENGE_COURSE = pillars[pillars.length - 1];
})();
