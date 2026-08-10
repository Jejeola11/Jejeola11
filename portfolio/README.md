# Fuse Portfolio

`index.html` is the rewritten portfolio site — membership plan removed, static dark-teal hero (no background video), auto-scrolling work sections, Email/WhatsApp contact CTAs.

**Images and videos are not in this repo.** The GitHub tool available in this session can only commit text files safely — pushing the 45 binary image/video assets through it risks silently corrupting them. Those files were already sent to you directly as `fuse-portfolio-v2.zip` (the `images/` and `videos/` folders `index.html` expects, ~3.5MB total).

To deploy on Netlify:
1. Unzip `fuse-portfolio-v2.zip`.
2. Drag the whole `site3` folder (rename to whatever you like) into Netlify's manual deploy drop zone — this deploys `index.html` + `images/` + `videos/` together with no GitHub involved.

If you'd rather deploy from this repo via Netlify's GitHub integration instead, add the `images/` and `videos/` folders from the zip into `portfolio/` yourself using GitHub's web upload (drag-and-drop on github.com handles binary files correctly) — then point Netlify at this repo with `portfolio` as the base directory.
