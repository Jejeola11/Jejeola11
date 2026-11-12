(() => {
  "use strict";
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  const countries = [
    "Afghanistan",
    "Albania",
    "Algeria",
    "Andorra",
    "Angola",
    "Anguilla",
    "Antarctica",
    "Antigua & Barbuda",
    "Argentina",
    "Armenia",
    "Aruba",
    "Australia",
    "Austria",
    "Azerbaijan",
    "Bahamas",
    "Bahrain",
    "Bangladesh",
    "Barbados",
    "Belarus",
    "Belgium",
    "Belize",
    "Benin",
    "Bermuda",
    "Bhutan",
    "Bolivia",
    "Bosnia & Herzegovina",
    "Botswana",
    "Brazil",
    "Britain (UK)",
    "Brunei",
    "Bulgaria",
    "Burkina Faso",
    "Burundi",
    "Cambodia",
    "Cameroon",
    "Canada",
    "Cape Verde",
    "Cayman Islands",
    "Central African Rep.",
    "Chad",
    "Chile",
    "China",
    "Colombia",
    "Comoros",
    "Congo (Dem. Rep.)",
    "Congo (Rep.)",
    "Cook Islands",
    "Costa Rica",
    "Croatia",
    "Cuba",
    "Cura\u00e7ao",
    "Cyprus",
    "Czech Republic",
    "C\u00f4te d\u2019Ivoire",
    "Denmark",
    "Djibouti",
    "Dominica",
    "Dominican Republic",
    "East Timor",
    "Ecuador",
    "Egypt",
    "El Salvador",
    "Equatorial Guinea",
    "Eritrea",
    "Estonia",
    "Eswatini (Swaziland)",
    "Ethiopia",
    "Falkland Islands",
    "Faroe Islands",
    "Fiji",
    "Finland",
    "France",
    "French Guiana",
    "French Polynesia",
    "Gabon",
    "Gambia",
    "Georgia",
    "Germany",
    "Ghana",
    "Gibraltar",
    "Greece",
    "Greenland",
    "Grenada",
    "Guadeloupe",
    "Guam",
    "Guatemala",
    "Guernsey",
    "Guinea",
    "Guinea-Bissau",
    "Guyana",
    "Haiti",
    "Honduras",
    "Hong Kong",
    "Hungary",
    "Iceland",
    "India",
    "Indonesia",
    "Iran",
    "Iraq",
    "Ireland",
    "Isle of Man",
    "Israel",
    "Italy",
    "Jamaica",
    "Japan",
    "Jersey",
    "Jordan",
    "Kazakhstan",
    "Kenya",
    "Kiribati",
    "Korea (North)",
    "Korea (South)",
    "Kuwait",
    "Kyrgyzstan",
    "Laos",
    "Latvia",
    "Lebanon",
    "Lesotho",
    "Liberia",
    "Libya",
    "Liechtenstein",
    "Lithuania",
    "Luxembourg",
    "Macau",
    "Madagascar",
    "Malawi",
    "Malaysia",
    "Maldives",
    "Mali",
    "Malta",
    "Marshall Islands",
    "Martinique",
    "Mauritania",
    "Mauritius",
    "Mayotte",
    "Mexico",
    "Micronesia",
    "Moldova",
    "Monaco",
    "Mongolia",
    "Montenegro",
    "Montserrat",
    "Morocco",
    "Mozambique",
    "Myanmar (Burma)",
    "Namibia",
    "Nauru",
    "Nepal",
    "Netherlands",
    "New Caledonia",
    "New Zealand",
    "Nicaragua",
    "Niger",
    "Nigeria",
    "Niue",
    "North Macedonia",
    "Northern Mariana Islands",
    "Norway",
    "Oman",
    "Pakistan",
    "Palau",
    "Palestine",
    "Panama",
    "Papua New Guinea",
    "Paraguay",
    "Peru",
    "Philippines",
    "Pitcairn",
    "Poland",
    "Portugal",
    "Puerto Rico",
    "Qatar",
    "Romania",
    "Russia",
    "Rwanda",
    "R\u00e9union",
    "Samoa (American)",
    "Samoa (western)",
    "San Marino",
    "Sao Tome & Principe",
    "Saudi Arabia",
    "Senegal",
    "Serbia",
    "Seychelles",
    "Sierra Leone",
    "Singapore",
    "Slovakia",
    "Slovenia",
    "Solomon Islands",
    "Somalia",
    "South Africa",
    "South Sudan",
    "Spain",
    "Sri Lanka",
    "St Barthelemy",
    "St Helena",
    "St Kitts & Nevis",
    "St Lucia",
    "St Maarten (Dutch)",
    "St Martin (French)",
    "St Pierre & Miquelon",
    "St Vincent",
    "Sudan",
    "Suriname",
    "Sweden",
    "Switzerland",
    "Syria",
    "Taiwan",
    "Tajikistan",
    "Tanzania",
    "Thailand",
    "Togo",
    "Tokelau",
    "Tonga",
    "Trinidad & Tobago",
    "Tunisia",
    "Turkey",
    "Turkmenistan",
    "Turks & Caicos Is",
    "Tuvalu",
    "Uganda",
    "Ukraine",
    "United Arab Emirates",
    "United States",
    "Uruguay",
    "Uzbekistan",
    "Vanuatu",
    "Vatican City",
    "Venezuela",
    "Vietnam",
    "Virgin Islands (UK)",
    "Virgin Islands (US)",
    "Wallis & Futuna",
    "Western Sahara",
    "Yemen",
    "Zambia",
    "Zimbabwe",
  ];
  const meta = (s) => s.session?.user?.user_metadata || {};
  const name = (s) =>
    meta(s).client_display_name ||
    meta(s).full_name ||
    meta(s).name ||
    s.session?.user?.email?.split("@")[0] ||
    "Fuse Creator";
  const avatar = (s) =>
    localStorage.getItem("fuse-avatar-" + s.session.user.id) ||
    meta(s).avatar_url ||
    "media/fuse-mark-palette.webp";
  const title = (s) =>
    meta(s).client_title || s.profile?.offer_title || s.profile?.skill || "";
  const about = (s) =>
    meta(s).client_about || s.profile?.purpose || s.profile?.day1 || "";
  const market = (s) =>
    Array.isArray(meta(s).client_markets)
      ? meta(s).client_markets
      : (s.profile?.market || "")
          .split(/[,;\n]/)
          .map((x) => x.trim())
          .filter(Boolean);
  const edit = (key, label) =>
    `<button class="profile-edit" type="button" data-edit="${key}" aria-label="Edit ${label}">✎</button>`;
  const linkFields = [
    ["portfolio", "Portfolio"],
    ["instagram", "Instagram"],
    ["tiktok", "TikTok"],
    ["upwork", "Upwork"],
    ["whatsapp", "WhatsApp"],
    ["other", "Others"],
  ];
  const linkValue = (s, key) =>
    meta(s)["client_link_" + key] ||
    (key === "portfolio" ? s.profile?.portfolio : "") ||
    "";
  function portfolioProjects(s){
    const m=meta(s),hidden=m.client_portfolio_hidden||[],overrides=m.client_portfolio_overrides||{};
    const base=(s.profile?.projects||[]).map((p,i)=>({...p,...(overrides[i]||{}),_source:'base',_index:i})).filter(p=>p.title&&!hidden.includes(p._index));
    return [...base,...(m.client_portfolio_projects||[]).map((p,i)=>({...p,_source:'added',_index:i})).filter(p=>p.title)];
  }
  function render(s) {
    const user = name(s),
      parts = user.trim().split(/\s+/),
      display =
        parts.length > 1
          ? `${esc(parts[0])}<br>${esc(parts.slice(1).join(" "))}`
          : esc(user);
    const won = s.prospects.filter((x) =>
      ["won", "deposit_paid", "in_delivery", "delivered"].includes(x.status),
    ).length;
    const projects = portfolioProjects(s);
    return `<section class="client-profile" aria-label="My Profile"><div class="profile-hero"><div class="profile-avatar-wrap"><img class="profile-avatar" src="${esc(avatar(s))}" alt="${esc(user)} profile photo"><span class="profile-online" title="Active"></span><button type="button" id="clientAvatarEdit" class="profile-avatar-edit" aria-label="Change profile photo">✎</button><input id="clientAvatarInput" type="file" accept="image/jpeg,image/png,image/webp" hidden></div><div class="profile-identity"><div class="profile-name-line"><h1>${display}</h1>${edit("name", "name")}</div><p id="clientLocalTime" class="profile-time"></p></div></div>
 <div class="profile-stats"><div><strong class="chrome-text">${s.prospects.length}</strong><span>Total prospects</span></div><div><strong class="chrome-text">${won}</strong><span>Total jobs</span></div></div>
 <section class="profile-section profile-service"><div class="profile-service-row profile-service-title"><p class="profile-value">${esc(title(s)) || "Add a title that describes your work."}</p>${edit("title", "title")}</div><div class="profile-service-row"><p class="profile-price chrome-text">${esc(meta(s).client_starter_price || s.profile?.price_amount || "—")}</p>${edit("price", "starter price")}</div><div class="profile-service-row profile-service-about"><p class="profile-about">${esc(about(s)) || "Tell clients what you can create and how you work."}</p>${edit("about", "about")}</div></section>
 <section class="profile-portfolio-section"><div class="profile-section-head"><h2>Portfolio</h2><button type="button" class="portfolio-add chrome-text" id="addPortfolio" aria-label="Add portfolio project">+</button></div><div class="profile-portfolio">${projects.length ? projects.map((p,i) => `<div class="profile-work-card"><button type="button" class="profile-work" data-project="${i}" aria-label="View ${esc(p.title)}"><div class="profile-work-cover">${projectPreview(p)}</div><h3><span>${esc(p.title)}</span></h3></button><button type="button" class="portfolio-more" data-project-menu="${i}" aria-label="Options for ${esc(p.title)}" aria-expanded="false">⋮</button><div class="portfolio-menu" data-menu="${i}" hidden><button type="button" data-project-edit="${i}">Edit</button><button type="button" data-project-delete="${i}">Delete</button></div></div>`).join("") : '<p class="profile-muted">Your saved projects will appear here.</p>'}</div></section>
 <section class="profile-section profile-market-section"><div class="profile-section-head"><h2 class="chrome-text">Your Target Market</h2></div><div class="market-grid">${market(
   s,
 )
   .map(
     (x) =>
       `<div class="market-chip"><span>${esc(x)}</span><button type="button" data-remove-country="${esc(x)}" aria-label="Remove ${esc(x)}">×</button></div>`,
   )
   .join(
     "",
   )}<button type="button" id="addCountry" class="market-add">+ Add country</button></div><div id="countryPicker" class="country-picker" hidden><label for="countrySearch">Search for a country</label><input id="countrySearch" type="search" autocomplete="off" placeholder="Search countries"><div id="countryResults" class="country-results"></div></div></section>
 <section class="profile-links-section"><h2 class="chrome-text">Your Links</h2><div class="profile-link-list">${linkFields
   .map(([key, label]) => {
     const value = linkValue(s, key);
     return `<div class="profile-link-row"><div><strong>${label}</strong>${value ? `<a href="${esc(value)}" target="_blank" rel="noopener noreferrer">${esc(value)}</a>` : "<span>Not added yet</span>"}</div>${edit("link_" + key, label + " link")}</div>`;
   })
   .join(
     "",
   )}</div></section></section><dialog id="clientProfileDialog" class="client-profile-dialog" aria-labelledby="clientProfileDialogTitle"><form id="clientProfileForm"><div class="profile-modal-head"><h2 id="clientProfileDialogTitle"></h2><button type="button" id="closeProfileEdit" aria-label="Close">×</button></div><div id="clientProfileField"></div><button type="submit" class="chrome-button">Save</button><p id="clientProfileError" role="alert"></p></form></dialog>`;
  }
  function image(link) {
    try {
      return /\.(png|jpe?g|webp|gif|avif)$/i.test(new URL(link).pathname);
    } catch {
      return false;
    }
  }
  function video(link) {
    try {
      return /\.(mp4|mov|webm)$/i.test(new URL(link).pathname);
    } catch {
      return false;
    }
  }
  function projectPreview(p) {
    const cover=[p.url,...(p.media||[]).map(x=>x.url)].find(x=>image(x)||video(x));
    if (image(cover))return `<img src="${esc(cover)}" alt="${esc(p.title)}" loading="lazy">`;
    if (video(cover))return `<video src="${esc(cover)}" muted playsinline preload="metadata" aria-label="${esc(p.title)} video preview"></video>`;
    return "<span>View project ↗</span>";
  }
  async function save(s, patch, rerender, toast) {
    const sb = await Fuse.client();
    const { data, error } = await sb.auth.updateUser({
      data: { ...meta(s), ...patch },
    });
    if (error) throw error;
    s.session.user = data.user;
    rerender();
    toast("Profile updated.");
  }
  function mount(s, rerender, toast) {
    const projects=portfolioProjects(s);
    const safeLink=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
    const mediaList=p=>{const items=(p.media?.length?p.media:(p.url?[{url:p.url,name:p.title}]:[]));const content=items.map(item=>{const link=safeLink(item.url);if(!link)return '';return video(link)?'<video controls playsinline src="'+esc(link)+'"></video>':image(link)?'<img src="'+esc(link)+'" alt="'+esc(item.name||p.title)+'">':/\.(mp3|wav|m4a|ogg|aac)$/i.test(new URL(link).pathname)?'<audio controls src="'+esc(link)+'"></audio>':'<a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">'+esc(item.name||'Open attachment')+' ↗</a>'}).join('');return content+(p.website&&p.website!==p.url&&safeLink(p.website)?'<a href="'+esc(p.website)+'" target="_blank" rel="noopener noreferrer">View website ↗</a>':'')};
    document.querySelectorAll('[data-project]').forEach(button=>button.onclick=()=>{
      const p=projects[Number(button.dataset.project)],dialog=document.createElement('dialog');
      dialog.className='portfolio-dialog';
      dialog.innerHTML='<div class="portfolio-dialog-head"><h2>'+esc(p.title)+'</h2><button type="button" aria-label="Close">×</button></div><p><strong>My role</strong><br>'+esc(p.role||p.my_role||'—')+'</p><p><strong>Project description</strong><br>'+esc(p.description||'—')+'</p><div class="portfolio-detail-media">'+mediaList(p)+'</div>';
      document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();dialog.showModal();
    });
    document.querySelectorAll('[data-project-menu]').forEach(button=>button.onclick=()=>{const menu=document.querySelector('[data-menu="'+button.dataset.projectMenu+'"]'),open=menu.hidden;document.querySelectorAll('.portfolio-menu').forEach(x=>x.hidden=true);document.querySelectorAll('[data-project-menu]').forEach(x=>x.setAttribute('aria-expanded','false'));menu.hidden=!open;button.setAttribute('aria-expanded',String(open))});
    document.querySelectorAll('[data-project-delete]').forEach(button=>button.onclick=async()=>{const p=projects[Number(button.dataset.projectDelete)];if(!confirm('Delete “'+p.title+'” from your portfolio?'))return;button.disabled=true;try{if(p._source==='base')await save(s,{client_portfolio_hidden:[...new Set([...(meta(s).client_portfolio_hidden||[]),p._index])]},rerender,toast);else await save(s,{client_portfolio_projects:(meta(s).client_portfolio_projects||[]).filter((_,i)=>i!==p._index)},rerender,toast)}catch(e){button.disabled=false;toast(e.message||'Could not delete project.')}});
    function openProjectEditor(existing=null){
      const dialog=document.createElement('dialog');dialog.className='portfolio-dialog portfolio-create';
      dialog.innerHTML='<form><div class="portfolio-dialog-head"><h2>'+(existing?'Edit Your Project':'Add a new portfolio project')+'</h2><button type="button" aria-label="Close">×</button></div><p>All fields are required unless otherwise indicated.</p><label>Project title *<input name="title" required maxlength="100" placeholder="Enter a brief but descriptive title." value="'+esc(existing?.title||'')+'"></label><small class="portfolio-count" data-for="title">100 characters left</small><label>Your role (optional)<input name="role" maxlength="100" placeholder="e.g., AI Video Creator & Editor" value="'+esc(existing?.role||existing?.my_role||'')+'"></label><small class="portfolio-count" data-for="role">100 characters left</small><label>Project description *<textarea name="description" required maxlength="2000" rows="4" placeholder="Briefly describe the project’s goals, your solution and the impact you made here.">'+esc(existing?.description||'')+'</textarea></label><small class="portfolio-count" data-for="description">2000 characters left</small><label class="portfolio-upload">Add images, videos, audio or files<input name="media" type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"></label><label>Website link (optional)<input name="website" type="url" placeholder="https://example.com" value="'+esc(existing?.website||'')+'"></label><div class="portfolio-preview">'+(existing?mediaList(existing):'')+'</div><p class="portfolio-error" role="alert"></p><div class="portfolio-actions"><button type="submit" class="chrome-button">Save project</button></div></form>';
      document.body.append(dialog);dialog.showModal();dialog.scrollTop=0;dialog.querySelector('.portfolio-dialog-head button').focus({preventScroll:true});dialog.querySelector('.portfolio-dialog-head button').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();
      for(const input of dialog.querySelectorAll('[maxlength]')){const count=()=>dialog.querySelector('[data-for="'+input.name+'"]').textContent=(input.maxLength-input.value.length)+' characters left';input.oninput=count;count()}
      const fileInput=dialog.querySelector('[name="media"]');fileInput.onchange=()=>{const box=dialog.querySelector('.portfolio-preview');box.innerHTML=existing?mediaList(existing):'';for(const file of fileInput.files){const item=document.createElement('p');item.textContent=file.name;box.append(item)}};
      dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,error=dialog.querySelector('.portfolio-error'),title=form.elements.title.value.trim(),role=form.elements.role.value.trim(),description=form.elements.description.value.trim(),website=safeLink(form.elements.website.value.trim()),files=[...fileInput.files];if(!title||!description){error.textContent='Add a title and project description.';return}if(form.elements.website.value.trim()&&!website){error.textContent='Enter a complete website link beginning with https://';return}const button=form.querySelector('[type="submit"]');button.disabled=true;try{const media=existing?.media?.length?[...existing.media]:existing?.url?[{url:existing.url,name:existing.title}]:[];for(const file of files){if(file.size>(file.type.startsWith('video/')?100:20)*1024*1024)throw Error(file.name+' is too large. Videos must be under 100 MB; other files under 20 MB.');const sb=await Fuse.client(),ext=(file.name.split('.').pop()||'bin').toLowerCase(),path=s.session.user.id+'/client-portfolio/'+crypto.randomUUID()+'.'+ext;const result=await sb.storage.from('avatars').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});if(result.error)throw result.error;media.push({url:sb.storage.from('avatars').getPublicUrl(path).data.publicUrl,name:file.name,type:file.type})}const project={title,role,description,website,url:media[0]?.url||website,media};let patch;if(existing?._source==='base')patch={client_portfolio_overrides:{...(meta(s).client_portfolio_overrides||{}),[existing._index]:project}};else{const list=[...(meta(s).client_portfolio_projects||[])];if(existing)list[existing._index]=project;else list.push(project);patch={client_portfolio_projects:list}}await save(s,patch,rerender,toast);dialog.close()}catch(err){error.textContent=err.message||'Could not save project.';button.disabled=false}};
    }
    document.getElementById('addPortfolio').onclick=()=>openProjectEditor();
    document.querySelectorAll('[data-project-edit]').forEach(button=>button.onclick=()=>openProjectEditor(projects[Number(button.dataset.projectEdit)]));
    const overview=document.querySelector('.profile-about');
    if(overview&&about(s).length>260){const full=about(s),toggle=document.createElement('button');toggle.type='button';toggle.className='overview-toggle';toggle.textContent='more';overview.textContent=full.slice(0,260).trimEnd()+'…';overview.after(toggle);toggle.onclick=()=>{const expanded=toggle.textContent==='more';overview.textContent=expanded?full:full.slice(0,260).trimEnd()+'…';toggle.textContent=expanded?'less':'more'}}
    const clock = document.getElementById("clientLocalTime");
    const now = () => {
      if (clock?.isConnected)
        clock.textContent =
          new Intl.DateTimeFormat("en", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }).format(new Date()) + " local time";
    };
    now();
    clearInterval(window.clientProfileClock);
    window.clientProfileClock = setInterval(now, 30000);
    document.querySelectorAll("[data-edit]").forEach(
      (b) =>
        (b.onclick = () => {
          const key = b.dataset.edit,
            dialog = document.getElementById("clientProfileDialog"),
            field = document.getElementById("clientProfileField"),
            isLink = key.startsWith("link_"),
            linkKey = key.replace("link_", ""),
            linkLabel = linkFields.find((x) => x[0] === linkKey)?.[1];
          document.getElementById("clientProfileDialogTitle").textContent =
            isLink
              ? linkLabel + " Link"
              : {
                  name: "Your Name",
                  title: "Your Title",
                  price: "Your Price",
                  about: "About Your Work",
                }[key];
          field.innerHTML =
            key === "about"
              ? `<label for="profileEditValue">What you can do</label><textarea id="profileEditValue" maxlength="2000" rows="7">${esc(about(s))}</textarea>`
              : `<label for="profileEditValue">${isLink ? linkLabel + " URL" : key === "price" ? "Input Price" : key === "name" ? "Input Name" : "Your title"}</label><input id="profileEditValue" ${key === "price" ? 'type="number" min="1" step="0.01"' : isLink ? 'type="url" inputmode="url"' : 'type="text"'} maxlength="300" value="${esc(isLink ? linkValue(s, linkKey) : key === "name" ? name(s) : key === "title" ? title(s) : key === "price" ? meta(s).client_starter_price || s.profile?.price_amount || "" : "")}">`;
          dialog.dataset.key = key;
          dialog.classList.toggle('profile-name-dialog',key==='name'||key==='price');
          dialog.classList.toggle('profile-overview-dialog',key==='about');
          dialog.classList.toggle('profile-title-dialog',key==='title');
          dialog.querySelector('.title-edit-actions')?.remove();
          dialog.querySelector('button[type="submit"]').hidden=false;
          if(key==='title'){
            document.getElementById('clientProfileDialogTitle').textContent='Edit your title';
            field.innerHTML='<p class="title-edit-description">Enter a single sentence description of your professional skills/experience (e.g. AI UGC Creator | Website Designer)</p><label class="chrome-text" for="profileEditValue">Your title *</label><input id="profileEditValue" type="text" maxlength="160" value="'+esc(title(s))+'">';
            dialog.querySelector('button[type="submit"]').hidden=true;
            const actions=document.createElement('div');actions.className='title-edit-actions';actions.innerHTML='<button type="button" class="title-edit-cancel">Cancel</button><button type="submit" class="chrome-button">Save</button>';dialog.querySelector('form').append(actions);actions.querySelector('.title-edit-cancel').onclick=()=>dialog.close();
          }
          if(key==='about'){
            document.getElementById('clientProfileDialogTitle').textContent='Profile overview';
            field.innerHTML='<div class="overview-guidance"><p>Use this space to tailor your searches to get the exact prospects you’re looking to work for.</p><ul><li>Describe your strengths and skills</li><li>Highlight projects, accomplishments and education</li><li>Keep it short and make sure it’s error-free</li></ul></div><label class="chrome-text" for="profileEditValue">Profile overview</label><textarea id="profileEditValue" maxlength="50000" rows="7">'+esc(about(s))+'</textarea><p class="overview-counter"></p>';
            const input=field.querySelector('textarea'),counter=field.querySelector('.overview-counter');const count=()=>counter.textContent=(50000-input.value.length)+' characters left';input.oninput=count;count();dialog.querySelector('button[type="submit"]').hidden=true;
            const actions=document.createElement('div');actions.className='title-edit-actions';actions.innerHTML='<button type="button" class="chrome-button">Cancel</button><button type="submit" class="chrome-button">Save</button>';actions.firstElementChild.onclick=()=>dialog.close();dialog.querySelector('form').append(actions);
          }
          dialog.showModal();
          if(key==='name'||key==='price'){const rect=document.querySelector(key==='name'?'.profile-identity':'.profile-price').getBoundingClientRect();dialog.style.setProperty('--name-top',Math.min(rect.bottom+8,window.innerHeight-210)+'px');dialog.style.setProperty('--name-left',Math.max(12,Math.min(rect.left,window.innerWidth-242))+'px')}
          field.querySelector("input,textarea")?.focus();
        }),
    );
    const dialog = document.getElementById("clientProfileDialog");
    document.getElementById("closeProfileEdit").onclick = () => dialog.close();
    document.getElementById("clientProfileForm").onsubmit = async (e) => {
      e.preventDefault();
      const key = dialog.dataset.key,
        val = document.getElementById("profileEditValue").value.trim(),
        error = document.getElementById("clientProfileError"),
        button = e.currentTarget.querySelector('[type="submit"]'),
        isLink = key.startsWith("link_");
      if (!val || (key === "price" && !(Number(val) > 0))) {
        error.textContent = "Enter a valid value.";
        return;
      }
      if (isLink) {
        try {
          new URL(val);
        } catch {
          error.textContent = "Enter a complete link beginning with https://";
          return;
        }
      }
      button.disabled = true;
      try {
        const patch = isLink
          ? { ["client_" + key]: val }
          : {
              name: { client_display_name: val, full_name: val },
              title: { client_title: val },
              price: { client_starter_price: Number(val) },
              about: { client_about: val },
            }[key];
        await save(s, patch, rerender, toast);
      } catch (x) {
        error.textContent = x.message || "Could not save.";
        button.disabled = false;
      }
    };
    document.getElementById("clientAvatarEdit").onclick = () =>
      window.openClientPhotoEditor(s,rerender,toast);
    document.getElementById("clientAvatarInput").onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 2e6
      ) {
        toast("Use a JPG, PNG or WebP photo under 2 MB.");
        return;
      }
      try {
        const sb = await Fuse.client(),
          path =
            s.session.user.id +
            "/client-profile/" +
            crypto.randomUUID() +
            "." +
            file.type.split("/")[1],
          r = await sb.storage
            .from("avatars")
            .upload(path, file, { contentType: file.type, upsert: false });
        if (r.error) throw r.error;
        const publicUrl = sb.storage.from("avatars").getPublicUrl(path)
          .data.publicUrl;
        await save(s, { avatar_url: publicUrl }, rerender, toast);
        try {
          localStorage.setItem("fuse-avatar-" + s.session.user.id, publicUrl);
        } catch {}
        rerender();
      } catch (x) {
        toast(x.message || "Photo upload failed.");
      }
    };
    const picker = document.getElementById("countryPicker"),
      input = document.getElementById("countrySearch"),
      results = document.getElementById("countryResults");
    document.getElementById("addCountry").onclick = () => {
      picker.hidden = !picker.hidden;
      if (!picker.hidden) {
        showCountries("");
        input.focus();
      }
    };
    input.oninput = () => showCountries(input.value);
    function showCountries(q) {
      const current = new Set(market(s).map((x) => x.toLowerCase()));
      results.innerHTML =
        countries
          .filter(
            (x) =>
              !current.has(x.toLowerCase()) &&
              x.toLowerCase().includes(q.trim().toLowerCase()),
          )
          .slice(0, 60)
          .map(
            (x) =>
              `<button type="button" data-country="${esc(x)}">${esc(x)}</button>`,
          )
          .join("") || "<p>No matching countries</p>";
      results
        .querySelectorAll("[data-country]")
        .forEach(
          (b) =>
            (b.onclick = () =>
              updateMarkets([...market(s), b.dataset.country])),
        );
    }
    async function updateMarkets(list) {
      try {
        await save(
          s,
          { client_markets: [...new Set(list)].slice(0, 60) },
          rerender,
          toast,
        );
      } catch (x) {
        toast(x.message || "Could not save market.");
      }
    }
    document
      .querySelectorAll("[data-remove-country]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            updateMarkets(
              market(s).filter((x) => x !== b.dataset.removeCountry),
            )),
      );
  }
  window.ClientProfile = { render, mount };
})();

