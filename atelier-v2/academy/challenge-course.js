(() => {
  'use strict';
  const pillars = window.FUSE_COURSE && window.FUSE_COURSE.pillars;
  if (!Array.isArray(pillars) || pillars.some(course => course.key === 'challenge')) return;

  const days = [
    ['Are you ready to sell your skill?', 'Audit your current work and choose one publishable sample.'],
    ['Build a service people can buy', 'Write your buyer, deliverables, scope and starting price.'],
    ['Build a professional portfolio that sells your offer', 'Show your strongest work with honest case studies and publish a working portfolio link.'],
    ['Build your Upwork profile', 'Set up your profile using your Day 1 skill audit, Day 2 offer and Day 3 portfolio.'],
    ['Find suitable jobs, research clients and pitch', 'Find three suitable jobs, verify the client and requirements, then prepare one tailored proposal.'],
    ['Find 5 Real Clients Beyond Upwork and Pitch Them', 'Research five suitable businesses, verify each manually and send five personalized pitches.'],
    ['Find Prospects with Fuse Client Agent, Start Conversations & Move Towards a Deal', 'Send five researched, personalized first messages.'],
    ["Review Your Outreach: Why Aren't They Replying?", 'Respond to real replies and follow up without inventing urgency.'],
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
  const readingLessons = {
  "10": {
    "title": "Practise the Conversation: From Reply to Quote",
    "intro": [
      "Welcome to Day 10. Someone replies, \"Yes, tell me more.\" Exciting, right? But please, don't send your account number before understanding what they need.",
      "Day 7 introduced the conversation. Today we will practise it from beginning to end.",
      "Your job is to learn enough to recommend a suitable piece of work. You do not need to sound like a salesperson reading a script. Listen, ask relevant questions and explain the next step clearly.",
      "We will use the same fictional clothing brand so you can follow the whole journey. If you have a real reply, practise with that instead. Remove private information before sharing it in the group."
    ],
    "sections": [
      {
        "title": "Begin with the purpose",
        "paragraphs": [
          "CLIENT: \"Yes, tell me more.\"",
          "YOU: \"Thanks. My idea is a short reel showing the complete outfit, then a few details. Is your priority content for your page, or a creative you want to test as an ad?\"",
          "CLIENT: \"Content for our page. We need people to understand the outfit.\"",
          "YOU: \"Understood. Which outfit should we focus on, and what would you like viewers to do after watching?\"",
          "Notice what happened: we did not assume the purpose. We asked a question that changes the direction.",
          "Ask naturally across the conversation. If they have already answered something, use their answer. Repeating every question from a template makes the conversation feel like you are not listening."
        ]
      },
      {
        "title": "Find the information that changes the scope",
        "paragraphs": [
          "Before giving a firm quote, understand the deliverable: how many videos, what length, what format and where they will be used.",
          "Ask which assets they can supply and who approves the script. Find out the deadline and whether it is flexible. Clarify whether they need alternative hooks, captions, music, source files or extra versions.",
          "You can ask: \"Do you have a budget range planned for this scope?\" Their answer helps you assess fit; it does not replace your own cost calculation.",
          "Do not ask questions just to look thorough. Ask the questions whose answers change the work, price or timing. If an important detail is missing, mark your quote as provisional until it is resolved."
        ]
      },
      {
        "title": "Summarise before you recommend",
        "paragraphs": [
          "\"Let me check that I have this right. You need one 20-second vertical reel for your Instagram page, introducing the linen outfit and directing viewers to its product page. You'll provide approved photographs, the product details and logo. One person will approve the script. Is that correct?\"",
          "Wait for confirmation. This simple step catches misunderstandings before they become unpaid revisions.",
          "If the client changes the brief, update your summary. If they want something you cannot reliably produce, explain what you can offer instead.",
          "You are not trying to win every project. You are trying to agree on work you can deliver well at a workable price. That is how you protect both the client experience and your own time."
        ]
      },
      {
        "title": "Build a quote that makes sense",
        "paragraphs": [
          "Before naming a price, add your expected production spend, your time and a realistic allowance for the included revision. Account for payment fees and other relevant costs.",
          "For illustration only: ₦10,000 production allowance + ₦25,000 for your time + ₦5,000 revision allowance = ₦40,000 planned cost. A ₦60,000 quote leaves ₦20,000 before fees, tax and any costs you missed. It is not automatically ₦20,000 take-home profit.",
          "Use your own numbers. If the work costs more than expected, record why and improve the next estimate.",
          "Do not copy a price because a stranger charges it. Your quote needs to cover the actual scope and leave room for a sustainable business."
        ]
      },
      {
        "title": "Say the price and the boundaries together",
        "paragraphs": [
          "\"For that brief, I recommend one 20-second vertical video, with an approved script, editing, captions and one consolidated revision round. The price is [your price]. Delivery is [your timeline] after the agreed payment, required assets and script approval. Additional versions are quoted separately.\"",
          "IF THEY SAY \"THAT'S EXPENSIVE\": \"Understood. What budget range are you working with? I can check whether a smaller scope would fit.\"",
          "IF THEY SAY \"LET ME THINK\": \"Of course. Is there anything about the scope, process or price you would like me to clarify?\"",
          "Do not reduce the price while quietly keeping all the work. If you agree a smaller budget, state what changes. Accept that sometimes the project will not be a fit."
        ]
      }
    ],
    "task": [
      "1. Use a real reply or practise with another student. One person is the client and the other is the creator.",
      "2. Ask enough questions to understand purpose, deliverables, assets, timing and budget.",
      "3. Write a short brief summary and ask the client to confirm it.",
      "4. Prepare a quote using your actual package and cost estimate. Practise responding to one price objection without promising extra work for free.",
      "TODAY'S CHECK-IN \"The client needs __. I clarified __. My proposed scope is __. My price is __ because __. Delivery begins after __. One question I still need answered is __.\"",
      "Label simulated conversations as practice. You do not need to invent a client to complete this exercise."
    ],
    "summary": "Practise discovery questions, confirm the brief, calculate a workable quote and handle price questions.",
    "sourcePages": [
      19,
      25
    ]
  },
  "11": {
    "title": "Get Ready for Payment and Project Kickoff",
    "intro": [
      "Welcome to Day 11. Today we are preparing for the point where interest becomes an agreed project.",
      "A client saying \"I like it\" feels good. But before production begins, both of you should understand what is being made, what it costs and what happens next.",
      "We will prepare a written project summary, payment information and a simple way to collect the assets you need. These are practical business documents; formal legal terms should fit your circumstances.",
      "Do this preparation before a client is waiting. It is much easier to send a clear next step when your process already exists.",
      "If you have no active deal yet, prepare these documents using your Day 10 practice quote."
    ],
    "sections": [
      {
        "title": "Put the agreement in writing",
        "paragraphs": [
          "Your written summary should identify the client and creator, describe the work and list the deliverables. Include length, format, number of versions and what is excluded.",
          "State the price, currency, payment schedule, revision allowance and delivery conditions. Explain what the client must provide and who approves the work.",
          "Discuss intended usage, source files and whether you may show the work in your portfolio. Do not assume that paying for a finished video includes every file or every possible use.",
          "Also agree what happens if the brief changes, assets arrive late or either party wants to cancel. Keep the language understandable.",
          "Send the summary for written acceptance. If anything is uncertain, resolve it before production rather than hoping you both mean the same thing."
        ]
      },
      {
        "title": "A project summary you can adapt",
        "paragraphs": [
          "PROJECT: [Client / campaign / purpose] DELIVERABLES: [Number, length, format, versions and included production work] CLIENT INPUTS: [Assets, facts, permissions and approver] PRICE AND PAYMENT: [Currency, total, schedule and agreed payment route] TIMELINE: [Start conditions, review dates and delivery] REVISIONS: [Rounds, what a round means and change requests] HANDOVER: [Final files, source files if included, intended usage and portfolio permission] OTHER TERMS: [Late inputs, cancellation and other agreed conditions] CONFIRMATION: [Written acceptance by both parties]"
        ]
      },
      {
        "title": "Make payment instructions clear",
        "paragraphs": [
          "Use the payment process agreed for the project. For a marketplace project, use its contract and payment flow. For an independent client, agree the payment route and schedule directly.",
          "Your invoice should show a reference, date, client, service, currency, amount and due date. If payment is split, show each instalment and what it relates to.",
          "Confirm the payment in the relevant account or platform before treating it as received. A screenshot or email alone is not the same as a settled payment or funded milestone.",
          "Never share your password or verification code to receive money. If someone asks you to pay an unusual fee to release a client payment, stop and verify the request independently before acting."
        ]
      },
      {
        "title": "Collect what you need to start",
        "paragraphs": [
          "Make one clear request for the assets you need: approved product photographs, logo, product facts, correct links, references and any required brand guidance.",
          "Ask who has permission to provide and approve the material. For AI presenters based on a real person, obtain the required permission for the likeness and voice before producing them.",
          "Explain your start condition: \"Once the agreed payment is confirmed and I have the required assets, I will prepare the script for approval.\"",
          "Use a folder with clear file names. Do not leave essential assets scattered across several chat threads.",
          "If something is missing, list it specifically. Tell the client how the missing input affects the schedule, and agree a revised date where necessary."
        ]
      },
      {
        "title": "Send a calm kickoff message",
        "paragraphs": [
          "\"Thanks, [Name]. The project summary is agreed and [payment or milestone status] is confirmed. I have received [assets]. I still need [missing items, if any].",
          "The next step is [script or storyboard], which I will send by [date]. Please send one set of feedback through [agreed channel], with [person] as the final approver.",
          "After approval, I will begin production and keep you updated at [checkpoint].\"",
          "Only say payment or assets are confirmed when you have checked them. This message tells the client that there is a process and makes their own next action clear.",
          "If you cannot meet a date, communicate early with a realistic alternative. Silence does not make a delay easier to manage."
        ]
      }
    ],
    "task": [
      "1. Create a reusable project-summary template using your real service and terms.",
      "2. Prepare a sample invoice. Label it PRACTICE if it is not for a real agreed project. Do not send an invoice to an uninterested prospect.",
      "3. Write your asset checklist, start conditions and kickoff message.",
      "4. Check that your price, currency, payment schedule, revision limit and delivery conditions agree across all documents.",
      "TODAY'S CHECK-IN \"My project-summary draft is ready: __. My payment schedule is __. Before starting I need __. My approval process is __. One term I need help explaining is __.\"",
      "Share redacted examples. Keep bank details, personal addresses and private client information out of the group."
    ],
    "summary": "Prepare the written agreement, payment instructions, asset checklist and kickoff message before production.",
    "sourcePages": [
      26,
      32
    ]
  },
  "12": {
    "title": "Deliver Work Clients Feel Confident Paying For",
    "intro": [
      "Welcome to Day 12. Getting the project is one part of the work. Delivering it calmly and correctly is what gives the client a reason to trust you again.",
      "A beautiful video can still fail if the product is wrong, the deadline is missed or the client does not know what is happening.",
      "Today we will build a simple delivery process: confirm the brief, approve the direction, produce, check, review and hand over.",
      "You do not need a complicated project-management system. A clear folder, a checklist and timely messages can already make the experience easier.",
      "Use a real project if you have one. Otherwise, take your Day 9 practice concept through this process and document each step."
    ],
    "sections": [
      {
        "title": "Approve the direction before polishing",
        "paragraphs": [
          "Send the script or storyboard at the agreed stage. Explain what the client is approving: message, scene sequence, product facts and next step.",
          "Ask for one consolidated set of feedback from the agreed approver. This reduces conflicting instructions from several people.",
          "Once the direction is approved, save that version. It gives you a shared reference if a new request changes the idea later.",
          "Do not spend hours polishing a direction the client has never seen. Equally, do not send every failed generation and ask the client to choose your production method.",
          "Your role is to make thoughtful decisions within the brief, then involve the client at the points you agreed. Approval should move the work forward, not create endless uncertainty."
        ]
      },
      {
        "title": "Check the AI details carefully",
        "paragraphs": [
          "Watch the video once for the message, once for visual errors and once for sound. Trying to check everything at the same time makes small problems easier to miss.",
          "For product work, compare the video with the approved photographs. Check labels, logos, colours, shape and patterns. For presenters, check face consistency, mouth movement, delivery and any permissions required.",
          "Look for unnatural hands, morphing objects, changing clothing and motion that distracts from the idea. Simplify or replace a shot if it cannot meet the brief reliably.",
          "Check names, numbers and claims against approved information. An AI-generated sentence is not evidence that a product claim is true.",
          "Fix what you can identify before asking the client to review the work."
        ]
      },
      {
        "title": "Check the finished file, not only the editor",
        "paragraphs": [
          "Export the agreed format and open that exact file on your phone. Check the aspect ratio, length, resolution, captions and audio.",
          "Make sure text is readable and placed away from likely interface overlays. Confirm the logo and call to action are correct and visible for long enough to read.",
          "Check the beginning and end for accidental blank frames. Listen with headphones and through your phone speaker. Make sure music does not overpower the voice.",
          "Open the delivery link as the client would and check the access settings. If downloads are part of the agreement, confirm they work.",
          "Use a clear name such as Client_Product_Reel_V1.mp4. Avoid a folder full of files called final-final-newest.mp4."
        ]
      },
      {
        "title": "Handle feedback without losing the scope",
        "paragraphs": [
          "\"Thanks for the notes. I have listed the changes as: [changes]. These fit the included revision round, and I will send the updated version by [date].\"",
          "If the request changes the approved concept, say so clearly:",
          "\"The new presenter and additional version are outside the agreed scope. I can quote those separately, or we can complete the original version with the included changes. Which would you prefer?\"",
          "Do not treat every note as an attack on your skill. Ask for clarification when feedback is vague: \"When you say faster, do you mean the opening, the scene changes or the voice?\"",
          "Fix your own errors responsibly. Explain the difference between correcting a mistake and adding new deliverables."
        ]
      },
      {
        "title": "Hand over the work professionally",
        "paragraphs": [
          "\"Hi [Name], here are the approved final files: [link]. Included are [files and formats]. The video follows the approved [brief or direction]. Please confirm that you can access everything.\"",
          "Add any remaining agreed payment step, usage note or handover detail that is relevant. Do not invent restrictions after the work is finished.",
          "Record the final version, approval and delivery date. Keep files for the retention period you agreed; do not promise indefinite storage unless you can provide it.",
          "After delivery, compare your estimated time and costs with what actually happened. Was the brief clear? Did revisions stay within scope? What should change next time?",
          "That review is how a single project helps you build a better business process."
        ]
      }
    ],
    "task": [
      "1. Take one real or practice project through script approval, production checks, review and handover preparation.",
      "2. Build a checklist covering brief accuracy, product or presenter consistency, captions, sound, file format and delivery access.",
      "3. Write one progress update and one final-delivery message.",
      "4. Practise responding to an included revision and an extra-scope request.",
      "TODAY'S CHECK-IN \"My project is __. I checked __. I found and corrected __. My delivery link or practice export is __. One request I would quote separately is __. My actual time and cost were __.\"",
      "For client work, share only what you have permission to show. A private checklist is enough if the video is confidential."
    ],
    "summary": "Approve the direction, check the finished video, manage revisions and hand over organised final files.",
    "sourcePages": [
      33,
      39
    ]
  },
  "13": {
    "title": "Turn One Project into Repeat Work",
    "intro": [
      "Welcome to Day 13. A completed project gives you something useful: experience of the client's goals, assets and approval process.",
      "That can make another project easier to plan. But repeat work is not automatic, and a client does not owe you a retainer because the first video is finished.",
      "Your job is to notice whether there is a genuine next need and make a relevant suggestion.",
      "Today we will practise three possibilities: another useful project, a monthly package and a request for feedback or a referral.",
      "If you have not delivered a paid project yet, prepare these messages for later. Do not send a testimonial request to a prospect who has never worked with you."
    ],
    "sections": [
      {
        "title": "Find the next useful project",
        "paragraphs": [
          "Look at what the first project revealed. Is the brand introducing another product? Do they need a version for another placement? Do they have recurring questions that a presenter video could explain?",
          "Ask rather than assume: \"Now that the launch video is complete, what content do you need for the next few weeks?\"",
          "If performance information is available and the client is willing to share it, use it carefully. A high view count does not prove sales. A weak result does not tell you that editing alone caused it.",
          "You can recommend a next creative test without promising that it will outperform the first.",
          "Useful repeat work solves a continuing need. It is not simply the same package sent again with the word monthly added."
        ]
      },
      {
        "title": "Build a monthly package you can deliver",
        "paragraphs": [
          "A recurring package needs boundaries just like a single project. Define the number of videos, maximum length, formats, scripting, revisions and delivery schedule.",
          "Specify whether alternative hooks or exports count as extra deliverables. State what the client supplies and how approvals work. Discuss what happens to unused work rather than leaving it ambiguous.",
          "Estimate your capacity using real project experience. Four videos that each need several rounds of generation may take longer than you expect.",
          "For example, a practice package might include four 20-second vertical videos, one approved script per video and one revision round each. The price must come from your own costs and workload.",
          "A small workable recurring package is better than a large promise you struggle to fulfil."
        ]
      },
      {
        "title": "Make the repeat-work suggestion",
        "paragraphs": [
          "\"Hi [Name], now that [project] is complete, I noticed your next priority is [confirmed need]. I could support that with [specific deliverables] over [period]. Would you like a short scope and price?\"",
          "Keep it connected to their actual plans. If they are interested, discuss the package and terms. If they are not ready, ask whether a later check-in would be useful.",
          "Do not use discounts as the only reason to work with you again. Consistent quality, clearer planning and a smoother approval process can also matter.",
          "And don't celebrate the retainer before checking the workload. A recurring project is only useful to your business if you can deliver it well and keep a sensible margin."
        ]
      },
      {
        "title": "Ask for feedback and permission",
        "paragraphs": [
          "After a completed project, ask a specific, low-pressure question:",
          "\"What was most useful about working together, and is there anything I could improve in the process?\"",
          "If the feedback is positive, you can ask: \"Would you be comfortable with me using those words as a testimonial, with your approved name and role?\"",
          "Keep the meaning of their words. Do not turn praise about communication into a claim that your video increased sales.",
          "Ask separately before publishing the work or identifying the client in your portfolio. Some projects are confidential or white-label.",
          "For a referral, be simple: \"If you know another business that needs [service], I'd appreciate an introduction.\" Do not pressure them to share other people's private contact details."
        ]
      }
    ],
    "task": [
      "1. Choose a completed project or the practice brief and identify one realistic next need.",
      "2. Draft a repeat-work message connected to that need.",
      "3. Outline a small monthly package with deliverables, revisions, inputs and schedule. Check the likely time and costs before pricing it.",
      "4. Prepare a feedback request and a separate permission request for a testimonial or portfolio use.",
      "TODAY'S CHECK-IN \"The ongoing need is __. My next-project suggestion is __. My monthly scope would be __. I can deliver it because __. Here is my repeat-work message: __.\"",
      "Only send these messages when the relationship and project stage make them appropriate. Otherwise, save them as prepared templates."
    ],
    "summary": "Identify a genuine next need, scope a monthly package and ask appropriately for feedback and referrals.",
    "sourcePages": [
      40,
      45
    ]
  },
  "14": {
    "title": "Review Your Results and Build Your Next 30-Day Plan",
    "intro": [
      "Welcome to Day 14. We have reached the end of the challenge, but your business does not end when the lessons end.",
      "Some of you may have received replies. Some may be discussing a project. Some may have secured paid work. Others may still be improving the offer and finding suitable businesses.",
      "Be honest about where you are. A useful review tells you what to do next; it does not require a dramatic success story.",
      "Today we will review your work, identify the biggest bottleneck and create a routine you can keep following.",
      "Open your tracker, portfolio, offer and any replies you have received. We are going to use evidence from your own activity, not compare your progress with somebody else's highlight."
    ],
    "sections": [
      {
        "title": "Count what actually happened",
        "paragraphs": [
          "Record how many suitable businesses you researched, how many you contacted and how many replied. Then count meaningful conversations, quotes sent and paid agreements.",
          "Keep these stages separate. A friendly reply is not a qualified project. An accepted quote is not the same as money received. Record the actual payment or funded milestone status.",
          "For example: 25 contacts, five replies, two relevant conversations, one quote and no payment yet. That is a practice example, not a benchmark. It suggests that you should inspect the conversation and quotation stage as well as continuing suitable outreach.",
          "Also record your time, tool spend and completed work. Revenue alone does not show whether the work is profitable.",
          "If your numbers are small, treat conclusions as tentative and keep learning."
        ]
      },
      {
        "title": "Choose the bottleneck to work on",
        "paragraphs": [
          "NO SUITABLE PROSPECTS: Narrow the buyer and the reason your service would be useful. Improve the search rather than collecting random names.",
          "CONTACTS BUT NO REPLIES: Check the contact route, relevance, proof and message clarity.",
          "REPLIES BUT NO PROJECT DISCUSSION: Clarify the need and whether your offer fits it.",
          "QUOTES BUT NO AGREEMENTS: Look for unclear scope, weak proof, timing or budget mismatch. Ask for feedback where appropriate.",
          "PROJECTS BUT LITTLE MONEY LEFT: Review actual production cost, time, revisions and pricing.",
          "Pick one main bottleneck for the next week. Trying to solve everything at once makes it difficult to know what helped."
        ]
      },
      {
        "title": "Your next 30 days: weeks 1 and 2",
        "paragraphs": [
          "WEEK 1: STRENGTHEN THE FOUNDATION Fix your biggest portfolio or offer weakness. Choose one buyer group to focus on and research a manageable batch of suitable businesses. Test a clear message with relevant proof.",
          "WEEK 2: KEEP THE CONVERSATIONS MOVING Continue researching suitable prospects, send personalised messages and follow up where appropriate. Practise answering actual questions you receive. Record which ideas create useful conversations.",
          "You can aim for a small daily number you can verify properly, rather than a large number of copied messages. Adjust the target around your work, study, data and production capacity.",
          "At the end of each week, review what happened before increasing volume. More weak outreach is not automatically progress."
        ]
      },
      {
        "title": "Your next 30 days: weeks 3 and 4",
        "paragraphs": [
          "WEEK 3: IMPROVE PROOF AND DELIVERY Use what prospects are asking for to improve one relevant sample or case study. If you have paid work, prioritise delivery and clear communication. Keep a small amount of time for the pipeline.",
          "WEEK 4: REVIEW AND PLAN THE NEXT CYCLE Check replies, conversations, quotes, payments, costs and delivery quality. Follow up on agreed dates. Suggest repeat work only where there is a genuine need.",
          "Choose what to keep, what to stop and what to test next month. You may refine your offer, but do not change your entire niche just because one person said no.",
          "Your plan should reflect your actual stage. Someone with three active projects needs a different schedule from someone still improving their first portfolio sample."
        ]
      },
      {
        "title": "Build a routine you can keep",
        "paragraphs": [
          "Here is an example 60-minute business-development block:",
          "10 MINUTES: Review replies and today's next actions.",
          "25 MINUTES: Research a small number of relevant prospects and verify the facts.",
          "15 MINUTES: Personalise messages or appropriate follow-ups.",
          "10 MINUTES: Update the tracker and note what you learned.",
          "This is a planning example, not a required pace. Research can take longer. Separate production time from outreach time so a paid deadline is not squeezed into the last few minutes of the day.",
          "Choose days and times that fit your life. A realistic routine you follow is more useful than an impressive plan you abandon after two days."
        ]
      }
    ],
    "task": [
      "1. Submit your portfolio and current offer.",
      "2. Summarise researched prospects, messages, replies, conversations, quotes and paid work accurately.",
      "3. Identify your biggest bottleneck and one change you will test next.",
      "4. Write your next 30-day schedule: buyer focus, outreach routine, follow-ups, proof improvement and delivery time.",
      "FINAL CHECK-IN \"At the start, I was struggling with __. I can now __. My actual numbers are __. My biggest bottleneck is __. For the next 30 days, I will __. My first action tomorrow is __. I need help with __.\"",
      "You have a process to practise and improve. Keep your promises small enough to deliver and your actions consistent enough to learn from. I'm rooting for you. Let's keep building."
    ],
    "summary": "Review your actual pipeline, identify the bottleneck and build a realistic next 30-day routine.",
    "sourcePages": [
      46,
      52
    ]
  }
};
  const modules = [{
    key:'challenge-start', title:'Start here', kicker:'Orientation', lessons:[{
      key:'challenge-start', title:'Welcome to the 14-Day AI Video Client Challenge',
      learnText:'Meet Ria, understand where you are now and what you are building over the next 14 days. Learn the daily rhythm: watch, do the task, share your work and use the review checkpoints.',
      actionText:'Write your personal goal for these 14 days in the box below and save it. Be specific about the skill, offer or client action you want to work toward.'
    }]
  }];
  days.forEach(([title, action], index) => {
    const day = index + 1;
    if(readingLessons[day]){
      const reading=readingLessons[day];
      const lessonTitle=`Day ${day}: ${reading.title}`;
      modules.push({key:`challenge-day-${day}`,title:lessonTitle,kicker:`Day ${day}`,lessons:[{
        key:`challenge-day-${day}`,title:lessonTitle,kind:'reading',reading,
        learnText:reading.summary,actionText:reading.task.join('\n\n').replace(/(TODAY'S CHECK-IN|FINAL CHECK-IN) /g,'$1\n')
      }]});
      return;
    }
    if(day===4){
      modules.push({key:'challenge-day-4',title:'Day 4 · Build your Upwork profile',kicker:'Day 4',lessons:[
        {
          key:'challenge-day-4',title:'Day 4: Build your Upwork profile',
          learnText:'Use your Day 1 skill, Day 2 offer and Day 3 portfolio to build an Upwork profile that clearly shows what you can do. Learn how to look for relevant jobs and tailor a proposal to the brief.',
          actionText:'Copy the prompt below. Add your real Day 1 and Day 2 answers and portfolio link. Edit the drafted title, overview and projects before publishing your profile. Find one suitable job and draft one proposal.',
          copyPrompt:dayFourUpworkPrompt
        }
      ]});
      return;
    }
    if(day===5){
      modules.push({key:'challenge-day-5',title:'Day 5 · Find suitable jobs, research clients and pitch',kicker:'Day 5',lessons:[{
        key:'challenge-day-5',title:'Day 5: Find suitable jobs, research clients and pitch',
        learnText:'Continue the Upwork work from Day 4. Check each job against your skill, portfolio and the client’s requirements, then research enough to write a specific pitch.',
        actionText:'Finish your Upwork profile and share its link in the group. Find two verified jobs that fit your offer and send two tailored proposals. Share the job links and the approach you used at check-in.'
      }]});
      return;
    }
    if(day===6){
      modules.push({key:'challenge-day-6',title:'Day 6: Find 5 Real Clients Beyond Upwork and Pitch Them',kicker:'Day 6',lessons:[{
        key:'challenge-day-6',title:'Day 6: Find 5 Real Clients Beyond Upwork and Pitch Them',
        learnText:'Use your Day 1 skill, Day 2 offer and portfolio to research five relevant businesses beyond Upwork. Find current opportunities and public professional contacts, verify the research, choose ask-first or sample-first, and personalize your email or DM.',
        actionText:'1. Copy the research prompt below and paste it into ChatGPT with web search. Add your completed Day 1 and Day 2 answers, Day 3 portfolio link, optional Upwork link and target location.\n\n2. Research your first five prospects and pitches. Manually verify each business, current activity, contact and source before sending anything.\n\n3. Edit and send a personalized pitch to all five verified prospects.\n\nShare your check-in in the group:\n• One thing I learned from the research:\n• One thing I need help with:',
        copyPrompt:window.FUSE_DAY_SIX_RESEARCH_PROMPT
      }]});
      return;
    }
    modules.push({key:`challenge-day-${day}`,title:day===8?`Day 8 - ${title}`:`Day ${day} · ${title}`,kicker:`Day ${day}`,lessons:[{
      key:`challenge-day-${day}`,title:day===8?`Day 8 - ${title}`:`Day ${day}: ${title}`,
      learnText:day===1?'Assess the AI videos you can create now, the businesses they could help and the work you would feel confident showing a client.':day===2?'Turn one AI video skill into a clear service: choose a buyer, understand their concerns, define the deliverables and price it with your costs in mind.':day===3?'Use your strongest work and your Day 1 and Day 2 answers to build a simple portfolio with ChatGPT or Claude, then check that a client can view it on a phone.':`Today's focus: ${title}. Watch the lesson, study the example and apply it to your own AI video service.`,
      actionText:day===1?'Review three AI videos you made. For each, note what works, what you would improve and which business could use it. Choose your strongest one. In the group, share your video type, target business, strongest video link or upload, and one thing to improve.':day===2?'Choose one business type and what they need your video for. List three hiring concerns and your answers. Define one package: length, format, deliverables, client inputs, turnaround, revisions and starting price after costs. Write a short offer statement and share your draft in the group.':day===3?'Choose up to three strong videos and write a short, honest case study for each. Label practice work as a concept. Use your Day 1 and Day 2 answers to build a portfolio with ChatGPT or Claude. Test it on your phone: videos, readability and contact button. Share the link in the group before 8 PM.':action,
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

