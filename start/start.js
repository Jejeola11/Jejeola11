(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const word = document.getElementById('rotating-word');
  const words = ['AI videos.', 'product visuals.', 'flyer designs.', 'talking twins.'];
  let index = 0;
  setInterval(() => {
    if (reduced.matches || document.hidden) return;
    word.classList.add('leaving');
    setTimeout(() => { index = (index + 1) % words.length; word.textContent = words[index]; word.classList.remove('leaving'); }, 250);
  }, 2600);
  const works = [
    ['community-01','Flame & Flavor',368,464],['community-02','Jewelry in Motion',480,714],
    ['community-08','Skincare Spotlight',480,854],['community-06','Everyday Elegance',478,850],
    ['community-09','Studio News',480,854],['community-16','Bridal Dream',360,640],
    ['community-05','Morning Glow',360,640],['community-15','Golden Hour',478,850]
  ];
  const observer = new IntersectionObserver(entries => entries.forEach(({target,isIntersecting}) => {
    if (isIntersecting && !reduced.matches && !document.hidden) target.play().catch(() => {});
    else target.pause();
  }), {threshold: .25});
  works.forEach(([id,title,width,height]) => {
    const figure = document.createElement('figure'); figure.className = 'piece';
    const media = document.createElement('div'); media.className = 'media';
    const video = document.createElement('video');
    video.poster = `/atelier-v2/media/community/${id}.webp`;
    video.src = `/atelier-v2/media/community/${id}.mp4`;
    video.width = width; video.height = height;
    video.muted = true; video.loop = true; video.playsInline = true;
    video.controls = true; video.preload = 'none'; video.setAttribute('aria-label', title);
    const caption = document.createElement('figcaption'); caption.textContent = title;
    media.append(video); figure.append(media,caption); document.getElementById('gallery').append(figure);
    observer.observe(video);
  });
  document.addEventListener('visibilitychange', () => { if(document.hidden) document.querySelectorAll('video').forEach(v => v.pause()); });
})();
