(() => {
  'use strict';
  const pillars = window.FUSE_COURSE && window.FUSE_COURSE.pillars;
  if (!Array.isArray(pillars) || pillars.some(course => course.key === 'challenge')) return;

  const days = [
    ['Are you ready to sell your skill?', 'Audit your current work and choose one publishable sample.'],
    ['Build a service people can buy', 'Write your buyer, deliverables, scope and starting price.'],
    ['Make your portfolio prove the offer', 'Prepare two honest samples and your portfolio link.'],
    ['Build your Upwork profile', 'Set up your profile using your Day 1 skill audit, Day 2 offer and Day 3 portfolio.'],
    ['Find suitable jobs, research clients and pitch', 'Find three suitable jobs, verify the client and requirements, then prepare one tailored proposal.'],
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
  const dayFourUpworkPrompt = `Act as an Upwork profile strategist and proposal writer for an AI video creator.

Help me turn my actual skills, offer and portfolio into a clear Upwork profile that attracts the right clients. Use my answers as the source of truth. Do not invent experience or results.

DAY 1 — MY CURRENT SKILL AND PROOF
[PASTE YOUR COMPLETED DAY 1 ASSIGNMENT]

DAY 2 — MY BUYER AND OFFER
[PASTE YOUR COMPLETED DAY 2 ASSIGNMENT]

MY PORTFOLIO
[PASTE YOUR PORTFOLIO LINK]

MY BEST PROJECTS
[LIST 2–4 PROJECTS AND WHAT YOU PERSONALLY CREATED IN EACH. SAY WHETHER EACH WAS PAID CLIENT WORK OR A SELF-INITIATED CONCEPT.]

OPTIONAL — UPWORK JOBS I AM CONSIDERING
[PASTE THE FULL JOB DESCRIPTIONS OR LINKS. IF YOU CANNOT OPEN A LINK, ASK ME TO PASTE THE DESCRIPTION. DO NOT PRETEND YOU READ IT.]

Please work in this order:

1. CHECK MY POSITIONING
In simple language, tell me:
- What kind of AI video work I can confidently sell now.
- Which buyer my current portfolio best supports.
- Which claims or parts of my offer need proof or clarification.
- Whether my portfolio shows the service I want to sell. If it does not, suggest one practical concept project I could create.

2. BUILD MY UPWORK PROFILE
Write:
- Three specific, searchable Upwork title options. Recommend the strongest one and explain why.
- A client-focused profile overview I can paste into Upwork. Make the opening lines clear about whom I help, what I make and what the client receives.
- Relevant skill tags to search for in Upwork’s available skill list. Prioritize services I can demonstrate; do not invent tools I have not used.
- A suggested starting hourly rate based on the prices, production costs and experience I supplied. If I have not given enough information, show me what to calculate instead of guessing.
- The best order for my portfolio projects.
- A title, my role and a short case study for each selected portfolio project: the brief or concept, my process, deliverables and what the project demonstrates. Clearly label concept work as concept work.
- Any other profile fields I should complete, with a short explanation of what belongs in each.

Write naturally and specifically. Do not stuff keywords or copy another freelancer’s profile.

3. SHOW ME HOW TO FIND SUITABLE JOBS
Give me five search phrases tailored to my actual service. Then provide a checklist for deciding whether to apply:
- Can I deliver the complete scope and deadline?
- Do I have directly relevant proof?
- Is the budget workable after tools, production time, revisions and platform fees?
- What requirements are non-negotiable?
- What do the job post and client history suggest?
- What must I clarify before committing?

For each job description I pasted, make a table with:
Job | Fit out of 5 | Verified requirements | Relevant portfolio project | Scope or budget concern | One question to ask | Apply, investigate or skip.

Distinguish facts stated in the post from your inferences. If information is missing, say “unknown.”

4. CHOOSE THE RIGHT PITCH DIRECTION
For each suitable job, recommend one:
- ASK-FIRST: Lead with a specific observation, relevant proof and a useful question when the direction or requirements need clarification.
- SAMPLE-FIRST: Lead with an EXISTING relevant portfolio sample or clearly labelled concept that demonstrates the required skill.
- PAID TEST: Propose a small, defined paid first milestone when the client needs custom work before a larger project.

Explain your choice in one or two sentences. Do not advise me to make a complete custom project for free.

5. WRITE THE PROPOSAL
For the best-fit job, write two short Upwork proposal options: ask-first and sample-first. Recommend the stronger option.

The proposal must:
- Refer to the client’s actual request and its most important constraint.
- Link or identify my most relevant real work.
- Explain my proposed first step and realistic deliverables.
- Ask one useful question only if it will change the approach or scope.
- Answer every screening question and follow any required opening word or instruction.
- Use my actual price, availability, tools and experience.
- End with a simple next step.

Keep pre-contract communication and payment for an Upwork-discovered job on Upwork. Do not add my email, WhatsApp number or social handle to an Upwork proposal.

6. GIVE ME REUSABLE TEMPLATES
Create short fill-in-the-blank templates for:
A. An Upwork ask-first proposal.
B. An Upwork sample-first proposal using an existing relevant sample.
C. An Upwork proposal offering a defined paid test.
D. An ask-first email to a business I found independently of Upwork.
E. A short ask-first Instagram or LinkedIn DM to a business I found independently.
F. A sample-first email or DM to an independently found business, with the work clearly labelled as an uncommissioned concept.

Each template should tell me which fields to personalize. Do not invent client research or say I saw a post that I have not supplied.

ACCURACY RULES
- Do not invent clients, testimonials, ad performance, earnings, years of experience, software proficiency or availability.
- Do not call a concept a commissioned project.
- Do not promise sales or conversions I cannot substantiate.
- Do not change my Day 2 price, deliverables, turnaround or revision terms without showing me the proposed change separately.
- Do not assume that every AI video job is a fit.
- If important details are missing, ask me up to five focused questions before finalizing the profile.
- Give me paste-ready copy and a short checklist of anything I must verify myself before publishing or sending.`;
  const modules = [{
    key:'challenge-start', title:'Start here', kicker:'Orientation', lessons:[{
      key:'challenge-start', title:'Welcome to the 14-Day AI Video Client Challenge',
      learnText:'See the daily rhythm: watch the lesson, complete the action, share your work at check-in and bring it to the three review checkpoints.',
      actionText:'Set up your prospect tracker, portfolio folder and a daily time block. The teaching deck is your recording and reference guide.'
    }]
  }];
  days.forEach(([title, action], index) => {
    const day = index + 1;
    if(day===4){
      modules.push({key:'challenge-day-4',title:'Day 4 · Build your Upwork profile',kicker:'Day 4',lessons:[
        {
          key:'challenge-day-4',title:'Day 4: Build your Upwork profile',
          learnText:'Use your Day 1 skill audit, Day 2 offer and Day 3 portfolio to write a truthful, buyer-focused Upwork profile.',
          actionText:'Paste your completed assignments and portfolio into ChatGPT using the prompt below. Review its title, overview, skills and project descriptions before publishing.',
          copyPrompt:dayFourUpworkPrompt
        }
      ]});
      return;
    }
    if(day===5){
      modules.push({key:'challenge-day-5',title:'Day 5 · Find suitable jobs, research clients and pitch',kicker:'Day 5',lessons:[{
        key:'challenge-day-5',title:'Day 5: Find suitable jobs, research clients and pitch',
        learnText:'Continue from Day 4. Search for jobs that match your actual service, check the brief and client, and choose an ask-first proposal, an existing sample or a defined paid test. Verify the right contact and channel when researching businesses independently.',
        actionText:'Find three suitable jobs, record why each fits and what needs clarification, then prepare one tailored proposal using your Day 4 profile and portfolio.'
      }]});
      return;
    }
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
