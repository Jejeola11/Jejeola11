(() => {
  'use strict';
  // Readable, copyable course resources. Examples are fictional teaching examples.
  window.FUSE_CHALLENGE_RESOURCES = [
    {
      key:'challenge-resource-roadmap', title:'Your 14-day action map',
      intro:'Use this as your working checklist. Watch the lesson, complete the task, share your work at check-in, then tick it off here. Your ticks are saved on this device.',
      sections:[
        ['Days 1–5 · The foundation you have actually built','Day 1: review three videos, choose your strongest and name a buyer. Day 2: define one buyer, their concerns, a clear package, costs, price and offer statement. Day 3: turn your best work and those answers into a working mobile portfolio with honest case studies. Day 4: use that proof to write and publish your Upwork profile and draft a suitable proposal. Day 5: finish the profile, verify two jobs that fit and send two tailored proposals. Tick the detailed list below only after doing the work.'],
        ['Days 6–7 · Find and approach real buyers','Research businesses with a current reason to talk. Record what you saw and its source. Choose ask-first or an existing relevant sample for each prospect, then send specific messages that connect your video service to their goal.'],
        ['Days 8–10 · Turn replies into a brief and quote','Follow up politely. When someone replies, ask about the audience, offer, desired action, usage, assets and deadline. Summarize the brief before promising a deliverable. Send a written quote with price, scope, revisions and payment terms.'],
        ['Days 11–14 · Improve and keep going','Handle questions, deliver agreed work well, review the numbers in your tracker and plan the next 30 days. If you complete the daily tasks and 50 researched pitches but have no paid foreign client by Day 14, the offer includes 14 additional days of support under the programme terms.'],
        ['Your three review checkpoints','Checkpoint 1: offer and portfolio. Checkpoint 2: prospects and first pitches. Checkpoint 3: replies, quotes, pipeline and next step. Bring links or screenshots and one specific question so feedback can be useful.']
      ],
      checklist:[
        ['Day 1','I reviewed three videos, chose my strongest, named a buyer and shared my check-in.'],
        ['Day 2','I wrote one offer with buyer, three concerns, scope, inputs, turnaround, revisions and a price checked against my costs.'],
        ['Day 3','I published my portfolio, labelled concept work honestly, tested it on my phone and shared its link.'],
        ['Day 4','I drafted and published my Upwork profile using my real offer and portfolio, then prepared one suitable proposal.'],
        ['Day 5','I shared my profile link, verified two fitting jobs and sent two tailored proposals.'],
        ['Day 6','I compared ask-first, existing sample-first and paid-test approaches for specific prospects.'],
        ['Day 7','I sent researched first messages and logged who I contacted and why.'],
        ['Day 8','I followed up appropriately and recorded the replies or lack of replies.'],
        ['Day 9','I asked discovery questions and summarized a real or practice brief.'],
        ['Day 10','I drafted a written quote with exact scope, price, revisions and payment terms.'],
        ['Day 11','I practiced responding to the objections I actually received.'],
        ['Day 12','I confirmed a clear delivery plan or rehearsed one with a practice brief.'],
        ['Day 13','I reviewed my tracker and improved one weak step in my outreach.'],
        ['Day 14','I submitted my pipeline and wrote my next 30-day action plan.']
      ],
      template:'MY 14-DAY TARGET\nService I will sell: [one clear AI video service]\nBuyer I will approach: [specific type of business]\nStrongest portfolio work: [link]\nPublished portfolio: [link]\nUpwork profile: [link]\nDaily work time: [time block]\nReview checkpoint question: [one problem I need help solving]'
    },
    {
      key:'challenge-resource-offer', title:'Offer and portfolio builder',
      intro:'Build one service a buyer can understand, then show work that proves you can deliver it. Use your completed Day 1 and Day 2 tasks. The portfolio prompt below is the same one used in your Day 3 lesson.',
      sections:[
        ['1 · Choose a buyer with a reason to spend','Name one type of business you can find and understand. Look for an actual video use: explaining a new product, showing how it works, testing ad hooks or presenting a founder. Do not assume every business has the same problem. Write: “I help [buyer] make [video] for [specific use].”'],
        ['2 · Map the result and the friction','What does the buyer hope the video helps them do? What makes them doubt it will work? What slows them down: scripting, footage, production, approvals or editing? List at least three concerns from your Day 2 task. Match each concern with a concrete part of your service: an approved script, relevant sample, simple asset checklist, first review point or clear delivery date. The offer should feel easier to start and easier to trust, without promising sales you cannot control.'],
        ['3 · Turn the solution into a bounded package','State the number and length of videos, aspect ratios, hooks, script, voice, captions, exports, client assets, approval points, revision rounds and delivery time. Pick the pieces that matter to this buyer; extra deliverables add cost and complexity. Say what is excluded and how additional work is priced.'],
        ['4 · Price it for a healthy margin','Estimate generation and editing costs, your hours, possible rework, platform/payment fees and profit. Your starting price must cover the defined package. Do not paste an example price from somebody else. If the scope changes, show the price change before production.'],
        ['5 · Reduce buyer risk with proof and process','Choose your strongest relevant work. Describe each as: brief or concept, approach, your contribution, finished deliverable and what it demonstrates. Clearly label practice concepts. Show how the project runs: brief → script approval → production → review → final files. Give a reasonable first milestone the buyer can evaluate.'],
        ['6 · Write a promise you can deliver','A useful offer says who it is for, what they receive, when and what is required from them. You can commit to agreed files and revision terms; you cannot guarantee views, purchases or a “viral” result. Only offer a bonus, deadline or guarantee if you can really honor it.'],
        ['Use the Day 3 prompt with ChatGPT or Claude','Copy the portfolio prompt below. Replace both assignment brackets with your completed answers. Upload your real videos or add working links. Ask for the copy first, correct anything inaccurate, then explicitly approve the page build. Open the result on your phone and test each video and contact button before you publish.']
      ],
      template:`Act as a portfolio strategist, copywriter and website builder for an AI video creator.

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

Search Online and the web for design inspirations`
    },
    {
      key:'challenge-resource-prospects', title:'Prospect research and contact guide',
      intro:'A good prospect is more than a business with money. Look for a current reason to speak and a reasonable fit for the work you can deliver.',
      sections:[
        ['Where to look','Check the company website and public social pages, active ads or promotions, recent launches, job posts, directories and local business listings. Use search to discover candidates, then open the original business source to verify facts.'],
        ['What to record','Record business name, website, buyer, current promotion, dated source link, your observed opportunity, public contact route, date checked and status. Separate observed facts from your own hypothesis. “Their latest launch post has no short video” is an observation; “they are losing sales” is an unverified claim.'],
        ['Verify before outreach','Confirm the business still operates, the contact really represents it, and the email or profile is a public professional channel. Do not guess personal addresses or reuse a founder contact that belongs to another company. If you cannot verify a detail, mark it unknown.'],
        ['Choose the best five first','Prioritize active businesses with a relevant project, visible marketing activity, a clear use for your offer and a legitimate contact path. Five researched prospects are more useful than fifty random names.']
      ],
      template:'BUSINESS: [name and website]\nBUYER/ROLE: [verified name or team]\nCURRENT SIGNAL: [what they are promoting]\nSOURCE + DATE: [public URL and date checked]\nOBSERVATION: [what you actually saw]\nVIDEO OPPORTUNITY: [your hypothesis]\nOFFER TO DISCUSS: [one specific service]\nCONTACT ROUTE: [public professional route]\nSTATUS/NEXT STEP: [researching, ready, sent, replied]'
    },
    {
      key:'challenge-resource-pitches', title:'Ask-first, sample-first and follow-up scripts',
      intro:'These are starting structures. Replace every bracket with researched details and make sure the message sounds like a person who looked at this business, not a mass template.',
      sections:[
        ['Ask-first · when you want permission before creating','Mention the specific promotion, explain one video idea in a sentence, ask if they would like a brief concept. Keep the request easy to answer. Do not claim you have already made a sample if you have not.'],
        ['Sample-first · when a small concept proves the idea','Only invest in a short spec concept when the buyer fit is strong and the product use is clear. Label it unsolicited concept work. Get permission before using a person’s face, voice or private assets; do not imply an endorsement.'],
        ['Follow-up · after silence','After a reasonable interval, send one short follow-up tied to the original idea. A second, final check-in can close the loop. Respect a no, a request to stop, and each platform’s contact rules.'],
        ['When they reply positively','Ask what the campaign is meant to achieve, who it serves, where it will run and what assets they have. Confirm the brief in writing before discussing final scope and price.']
      ],
      template:'ASK-FIRST\nHi [name], I saw [specific current campaign] on [source]. A short [type] video could help explain [one product/use] to [audience]. I make AI video creative for [buyer type]. Would you like me to send a quick concept for that campaign? Here is related work: [link]. — [your name]\n\nSAMPLE-FIRST\nHi [name], your [specific launch] gave me an idea for a short video showing [concept]. I made a small, clearly labeled concept to demonstrate the direction: [link]. Is this the kind of creative you are testing? — [your name]\n\nFOLLOW-UP\nHi [name], checking back on the [specific] video idea I sent [day]. If [campaign] is still a priority, I can outline the scope and price. If it is not a fit, no worries. — [your name]'
    },
    {
      key:'challenge-resource-tracker', title:'Daily outreach and conversation tracker',
      intro:'Your tracker shows where the process is working and where it gets stuck. Record real activity, not a number you wish you had reached.',
      sections:[
        ['Use one row per business','Keep the source, contact, message date, channel and next action together. Do not count duplicates across channels as new prospects. Track ask-first and sample-first separately so you can learn which approach gets useful replies.'],
        ['Pipeline states','Researching → Ready to pitch → Sent → Replied → Brief agreed → Quote sent → Deposit paid → In production → Delivered → Follow-up or repeat work. Not every conversation progresses; record why it stopped when you know.'],
        ['Daily review','Count researched new prospects, personalized messages, follow-ups, replies, discovery conversations, quotes and deposits. If messages get no replies, review fit and relevance before sending more. If calls stall, improve your questions or offer.'],
        ['Your 50 pitches','The challenge asks for 50 researched, personalized pitches across the working days. Send them at a pace you can sustain while still checking each prospect. A pitch is not a sale; use the response data to improve.']
      ],
      template:'DATE | BUSINESS | SOURCE | CURRENT SIGNAL | CONTACT | CHANNEL | APPROACH | SENT DATE | STATUS | REPLY | NEXT ACTION | FOLLOW-UP DATE\n[date] | [name] | [link] | [observed signal] | [verified person] | [email/DM] | [ask-first/sample-first] | [date] | [sent/replied/etc.] | [summary] | [specific next step] | [date]'
    },
    {
      key:'challenge-resource-sales', title:'Discovery, quote and deposit kit',
      intro:'A reply is the start of a conversation. Your job is to learn what the buyer needs, write down the agreement and protect both sides with a clear scope.',
      sections:[
        ['Discovery questions','What are you selling and to whom? Where will this video run? What action should viewers take? Which approved product facts and assets can I use? What deadline matters? Who approves the script and final edit? What would make this project useful for you?'],
        ['Quote the deliverable','Write the video length, orientation, number of hooks and exports, script/voice/captions, client-supplied assets, use rights, timeline, revision round and total price. Do not quietly include extra versions.'],
        ['Deposit and kickoff','State the deposit amount or percentage, payment method and when work begins. Request approved files, product facts and permission for any face, voice, logo or music used. Do not start paid production until both sides agree on the scope and payment terms.'],
        ['Delivery and revisions','Send final files in the agreed formats. Invite one consolidated round of notes if included. Distinguish correcting work against the brief from a new concept request. Ask for a testimonial only after genuine delivery.']
      ],
      template:'PROJECT QUOTE\nClient: [name] | Campaign: [name]\nGoal and audience: [summary]\nDeliverables: [exact videos, lengths, aspect ratios and files]\nIncludes: [script, voice, captions, revision round]\nClient supplies: [approved assets, claims, logo, feedback]\nTimeline: [after deposit and assets]\nTotal: [amount/currency] | Deposit: [amount] due before kickoff\nAdditional work: quoted separately\nNext step: reply with approval and I will send the payment details and kickoff checklist.'
    }
  ];
})();
