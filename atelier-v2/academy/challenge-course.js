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
  const modules = [{
    key:'challenge-resources', title:'Resources', kicker:'Read and copy', lessons:resources.map(item=>({
      key:item.key,title:item.title,kind:'resource',resource:item,
      learnText:item.intro,actionText:'Use the examples and copyable template below as you work through the daily lessons.'
    }))
  },{
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
      actionText:action
    }]});
  });
  pillars.push({
    key:'challenge', name:'14-Day AI Video Client Challenge',
    sub:'With Coach Ria · 14 daily lessons and action steps', modules
  });
  window.FUSE_CHALLENGE_COURSE = pillars[pillars.length - 1];
})();
