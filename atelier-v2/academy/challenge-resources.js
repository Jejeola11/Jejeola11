(() => {
  'use strict';
  // Readable, copyable course resources. Examples are fictional teaching examples.
  window.FUSE_CHALLENGE_RESOURCES = [
    {
      key:'challenge-resource-roadmap', title:'Your 14-day action map',
      intro:'This is your map for the challenge. Watch the daily lesson, make the thing it asks for, then submit proof of that action at check-in. A lesson watched without action is still unfinished work.',
      sections:[
        ['Days 1–3 · Build something sellable','Choose one AI video service and one buyer. Write a small offer with a clear deliverable, turnaround and starting price. Assemble two examples you can honestly call samples. A sample is your own concept unless a client actually commissioned it.'],
        ['Days 4–7 · Find and approach real buyers','Research businesses already promoting something, launching, hiring or posting consistently. Record what you observed and where you saw it. Identify a public business contact, choose ask-first or sample-first, then send specific messages that connect your video service to their current goal.'],
        ['Days 8–10 · Turn replies into a brief and quote','Follow up politely. When someone replies, ask about the audience, offer, desired action, usage, assets and deadline. Summarize the brief before promising a deliverable. Send a written quote with price, scope, revisions and payment terms.'],
        ['Days 11–14 · Improve and keep going','Handle questions, deliver agreed work well, review the numbers in your tracker and plan the next 30 days. If you complete the daily tasks and 50 researched pitches but have no paid foreign client by Day 14, the offer includes 14 additional days of support under the programme terms.'],
        ['Your three review checkpoints','Checkpoint 1: offer and portfolio. Checkpoint 2: prospects and first pitches. Checkpoint 3: replies, quotes, pipeline and next step. Bring links or screenshots and one specific question so feedback can be useful.']
      ],
      template:'MY 14-DAY TARGET\nService I will sell: [one clear AI video service]\nBuyer I will approach: [specific type of business]\nMy two portfolio samples: [links]\nDaily work time: [time block]\nReview checkpoint question: [one problem I need help solving]'
    },
    {
      key:'challenge-resource-offer', title:'Offer and portfolio builder',
      intro:'A buyer needs to understand what you make, who it is for and what they receive. “I do AI videos” is a skill. A defined offer gives them something to consider buying.',
      sections:[
        ['Start with one buyer and one use','For example, an independent skincare brand launching a serum might need a 15-second vertical product video for Reels and ads. Your job is to explain that use clearly, not claim that every brand has the same problem.'],
        ['Define the package','Specify length, aspect ratio, number of concepts, voiceover or captions, files, revision round, turnaround and what the client must supply. Price the whole scope. If extra versions or source files cost more, say so before work begins.'],
        ['Show honest proof','Choose two relevant pieces. For each, add a short caption: what the brief was, what you made, your role and what a similar brand could use it for. Label self-initiated pieces as concept work. Never invent sales, ad spend or conversion results.'],
        ['Example · fictional teaching brand','Luma Glow is a fictional skincare brand in this course. Offer: one 15-second vertical launch video, one hook, product supplied by client, captions and one revision round. Example starting quote: $150, subject to the final brief and your costs. This is a practice example, not a price you must copy.']
      ],
      template:'I help [specific buyer] create [specific video] for [specific purpose].\nDeliverables: [length, format, number of versions].\nYou provide: [product photos, logo, facts, permissions].\nI handle: [script, generation, edit, captions].\nTimeline: [number of business days after assets/approval].\nIncludes: [number of revision rounds].\nStarting price: [your justified figure].\nProof: [two honest sample links].'
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
