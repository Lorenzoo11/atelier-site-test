/* ============================================================
   main.js — EventSite
   Carica config.json e costruisce dinamicamente tutto il sito.
   Non modificare questo file: usa config.json per la configurazione.
   ============================================================ */

fetch('config.json')
  .then(res => {
    if (!res.ok) throw new Error('config.json non trovato');
    return res.json();
  })
  .then(CONFIG => {
    buildLogo(CONFIG);
    buildVideo(CONFIG);
    buildHeroEvent(CONFIG);
    buildEventiGrid(CONFIG);
    buildGallery(CONFIG);
    buildContatti(CONFIG);
    initNavbar();
    initReveal();
  })
  .catch(err => {
    console.error('Errore caricamento configurazione:', err);
  });


/* ============================================================
   LOGO
   ============================================================ */
function buildLogo(CONFIG) {
  const { nome, accento, tagline, copyright, logo } = CONFIG.sito;

  function logoHTML(str, acc) {
    const idx = str.indexOf(acc);
    if (idx === -1) return str;
    return str.slice(0, idx) + '<span>' + acc + '</span>' + str.slice(idx + acc.length);
  }

  /* Logo immagine nell'hero */
  const heroImgEl = document.getElementById('hero-logo-img');
  if (heroImgEl) {
    if (logo) {
      heroImgEl.alt = nome + accento;
      heroImgEl.src = logo;
      heroImgEl.style.display = 'block';
      heroImgEl.onerror = () => {
        console.warn('[EventSite] Logo non trovato:', logo, '— controlla il percorso in config.json');
        heroImgEl.style.display = 'none';
      };
    } else {
      heroImgEl.style.display = 'none';
    }
  }

  /* Nome testuale hero + footer */
  //document.getElementById('site-logo').innerHTML      = logoHTML(nome, accento);
  document.getElementById('footer-logo').innerHTML    = logoHTML(nome, accento);
  document.getElementById('site-tagline').textContent = tagline;
  document.getElementById('footer-copy').textContent  = copyright;
  document.title = nome + accento;
}


/* ============================================================
   HERO VIDEO
   ============================================================ */
function buildVideo(CONFIG) {
  const container = document.getElementById('hero-video-container');

  if (!CONFIG.heroVideos || !CONFIG.heroVideos.length) {
    container.innerHTML = '<div id="hero-placeholder"></div>';
    return;
  }

  let current = 0;
  const videos = CONFIG.heroVideos;

  function createVideo(src) {
    const v = document.createElement('video');
    v.autoplay    = true;
    v.muted       = true;
    v.playsInline = true;
    v.loop        = false;
    v.preload     = 'auto';
    v.style.cssText = 'width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 0.8s;position:absolute;inset:0;';

    // Aggiunge WebM come source primaria (più leggero), MP4 come fallback
    const webmSrc = src.replace(/\.mp4$/i, '.webm');
    const srcWebm = document.createElement('source');
    srcWebm.src  = webmSrc;
    srcWebm.type = 'video/webm';

    const srcMp4 = document.createElement('source');
    srcMp4.src  = src;
    srcMp4.type = 'video/mp4';

    v.appendChild(srcWebm);
    v.appendChild(srcMp4);

    // Fade in appena può riprodurre
    v.addEventListener('canplay', () => {
      v.style.opacity = '0.35';
    });

    // Passa al video successivo alla fine
    v.addEventListener('ended', () => {
      current = (current + 1) % videos.length;
      container.innerHTML = '';
      container.appendChild(createVideo(videos[current]));
    });

    return v;
  }

  // Precarica il video successivo in background
  function preloadNext(idx) {
    if (videos.length <= 1) return;
    const next = (idx + 1) % videos.length;
    const link = document.createElement('link');
    link.rel  = 'preload';
    link.as   = 'video';
    link.href = videos[next].replace(/\.mp4$/i, '.webm');
    document.head.appendChild(link);
  }

  container.appendChild(createVideo(videos[0]));
  preloadNext(0);
}


/* ============================================================
   HERO — PROSSIMO EVENTO & COUNTDOWN
   ============================================================ */
function buildHeroEvent(CONFIG) {
  const events      = CONFIG.prossimiEventi;
  const heroSection = document.getElementById('hero-next-event');

  if (!events || !events.length) {
    heroSection.style.display = 'none';
    return;
  }

  /* Primo evento non sold-out più vicino nel tempo */
  /*
  const future = [...events]
    .filter(e => !e.soldOut && new Date(e.data) > new Date())
    .sort((a, b) => new Date(a.data) - new Date(b.data));*/

  const future = [...events]
    .filter(e => (e.nome === CONFIG.eventoHomePage) )

  const ev = future[0] || events[0];

  // parse data senza ora per evitare shift timezone
  const [y, m, dd] = ev.data.split('-').map(Number);
  const d = new Date(y, m - 1, dd);

  // orario formattato
  let orario = ev.oraInizio || '';
  if (ev.oraFine) orario += ' - ' + ev.oraFine;

  const dataStr  = ev.nascondData
    ? '???'
    : d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }) + (orario ? ' · ' + orario : '');
  const luogoStr = ev.nascondLuogo
    ? '???'
    : ev.venue + (ev.city ? ' · ' + ev.city : '');

  if(ev.nascondLuogo === true) {
    document.getElementById('next-name').textContent = "???"
  } else {
    document.getElementById('next-name').textContent = ev.nome;
  }
  
  document.getElementById('next-meta').textContent = dataStr + ' · ' + luogoStr;

  const btn = document.getElementById('hero-ticket-btn');
  if(ev.nascondLuogo === true) {
    btn.style.display = 'none';
  }
  else if (ev.freeEntry) {
    btn.textContent           = 'Ingresso libero';
    btn.style.borderColor     = 'var(--white)';
    btn.style.pointerEvents   = 'none';
  } else if (ev.soldOut) {
    btn.textContent           = 'Sold Out';
    btn.style.borderColor     = 'var(--muted)';
    btn.style.color           = 'var(--muted)';
    btn.style.pointerEvents   = 'none';
  } else {
    btn.href = ev.ticketLink;
  }

  /* Countdown — nascosto se nascondData è true */
  if (ev.nascondData) {
    ['cd-days','cd-hours','cd-mins','cd-secs'].forEach(id => {
      document.getElementById(id).textContent = '??';
    });
    document.querySelectorAll('.countdown-unit .lbl').forEach(el => el.style.visibility = 'hidden');
  } else {
    const oraStr = ev.oraInizio ? ev.oraInizio : '00:00';
    const targetDate = new Date(y, m - 1, dd, ...oraStr.split(':').map(Number));
    const target = targetDate.getTime();
    function pad(n) { return String(n).padStart(2, '0'); }

    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) {
        ['cd-days','cd-hours','cd-mins','cd-secs'].forEach(id => {
          document.getElementById(id).textContent = '00';
        });
        return;
      }
      document.getElementById('cd-days').textContent  = pad(Math.floor(diff / 86400000));
      document.getElementById('cd-hours').textContent = pad(Math.floor((diff % 86400000) / 3600000));
      document.getElementById('cd-mins').textContent  = pad(Math.floor((diff % 3600000) / 60000));
      document.getElementById('cd-secs').textContent  = pad(Math.floor((diff % 60000) / 1000));
    }

    tick();
    setInterval(tick, 1000);
  }
}


/* ============================================================
   SEZIONE PROSSIMI EVENTI — CARD GRID
   ============================================================ */
function buildEventiGrid(CONFIG) {
  const grid = document.getElementById('eventi-grid');

  CONFIG.prossimiEventi.forEach(ev => {
    // data è ora solo "YYYY-MM-DD", parse senza ora per evitare shift timezone
    const [year, month_n, day_n] = ev.data.split('-').map(Number);
    const d = new Date(year, month_n - 1, day_n);

    const day       = String(day_n).padStart(2, '0');
    const monthStr  = d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

    // Orario: riga separata con inizio → fine (o solo inizio)
    let orario = ev.oraInizio || '';
    if (ev.oraFine) orario += ' - ' + ev.oraFine;

    const dayDisplay   = ev.nascondData  ? '??' : day;
    const monthDisplay = ev.nascondData  ? 'Data da rivelare' : monthStr;
    const timeDisplay  = ev.nascondData  ? '??-??' : (orario ? `<div class="ec-time">${orario}</div>` : '');
    const venueDisplay = ev.nascondLuogo ? 'Luogo da rivelare' : ev.venue;
    const cityDisplay  = ev.nascondLuogo ? '\u00A0' : ev.city;
    let badge   = '';
    let btnHTML = '';

    if (ev.soldOut) {
      //badge   = '<span class="ec-badge ec-badge--soldout">Sold Out</span>';
      btnHTML = '<span class="ec-btn--disabled">Sold Out</span>';
    } else if (ev.freeEntry) {
      //badge   = '<span class="ec-badge ec-badge--free">Ingresso libero</span>';
      btnHTML = '<span class="ec-btn--free">Ingresso libero</span>';
  } else if (ev.ticketLink === '#') {
      //badge   = '<span class="ec-badge ec-badge--free">Ingresso libero</span>';
      btnHTML = '<span class="ec-btn--disabled">Biglietti non disponibili</span>';
    } else {
      btnHTML = `<a href="${ev.ticketLink}" class="ec-btn">Biglietti</a>`;
    }

    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
      <div class="ec-top">
        <div>
          <div class="ec-date">${dayDisplay}</div>
          <div class="ec-month">${monthDisplay}</div>
          ${timeDisplay}
        </div>
        ${badge}
      </div>
      <div class="ec-name">${ev.nome}</div>
      <div class="ec-venue">${venueDisplay}</div>
      <div class="ec-city">${cityDisplay}</div>
      ${btnHTML}`;

    grid.appendChild(card);
  });
}


/* ============================================================
   GALLERY
   ============================================================ */
function buildGallery(CONFIG) {
  const grid = document.getElementById('gallery-grid');

  CONFIG.gallery.forEach(item => {
    const el = document.createElement('div');
    el.className = 'gallery-item';

    const media = item.img
      ? `<img src="${item.img}" alt="${item.nome}" loading="lazy"/>`
      : `<div class="ph">${item.nome}</div>`;

    const wrapOpen  = item.link ? `<a href="${item.link}" target="_blank">` : '<div>';
    const wrapClose = item.link ? '</a>' : '</div>';

    el.innerHTML = `
      ${wrapOpen}
        ${media}
        <div class="gallery-text">${item.nome}</div>
        <div class="gallery-overlay">
          <div class="go-name">${item.nome}</div>
          <div class="go-date">${item.data}</div>
          ${item.link ? '<div class="go-link">Vedi foto →</div>' : ''}
        </div>
      ${wrapClose}`;

    grid.appendChild(el);
  });

  document.getElementById('gallery-archive-link').href = CONFIG.archivioLink || '#';
}


/* ============================================================
   CONTATTI
   ============================================================ */
function buildContatti(CONFIG) {
  const c    = CONFIG.contatti;
  const info = document.getElementById('contatti-info');

  const rows = [
    {
      icon:  `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M4 4h16v16H4V4zm0 4l8 5 8-5"/></svg>`,
      label: 'Email',
      html:  `<a href="mailto:${c.email}"><div class="cr-value">${c.email}</div></a>`
    },
    {
      icon:  `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>`,
      label: 'Instagram',
      html:  `<a href="${c.instagramLink}" target="_blank"><div class="cr-value">${c.instagram}</div></a>`
    }
  ];

  if (c.whatsapp) {
    rows.push({
      icon:  `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
      label: 'WhatsApp',
      html:  `<a href="https://wa.me/${c.whatsapp}"><div class="cr-value">${c.whatsapp}</div></a>`
    });
  }

  if (c.telefono) {
    rows.push({
      icon:  `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
      label: 'Telefono',
      html:  `<a href="tel:${c.telefono}"><div class="cr-value">${c.telefono}</div></a>`
    });
  }

  rows.forEach(r => {
    const row = document.createElement('div');
    row.className = 'contact-row';
    row.innerHTML = `
      <div class="cr-icon">${r.icon}</div>
      <div>
        <div class="cr-label">${r.label}</div>
        ${r.html}
      </div>`;
    info.appendChild(row);
  });
}


/* ============================================================
   NAVBAR — opacità allo scroll
   ============================================================ */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  });
}


/* ============================================================
   REVEAL ON SCROLL
   ============================================================ */
function initReveal() {
  const reveals  = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(entries => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
      }
    });
  }, { threshold: 0.1 });

  reveals.forEach(el => observer.observe(el));
}


/* ============================================================
   FORM CONTATTI — invia tramite Netlify Forms
   ============================================================ */
function handleForm(e) {
  e.preventDefault();
  const form = e.target;
  const msg  = document.getElementById('form-msg');
  const btn  = form.querySelector("button[type='submit']");

  btn.disabled    = true;
  btn.textContent = "Invio in corso...";
  msg.style.display = "none";

  fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(new FormData(form)).toString()
  })
  .then(() => {
    msg.style.display = "block";
    msg.style.color   = "var(--red)";
    msg.textContent   = "Messaggio inviato! Ti risponderemo presto.";
    form.reset();
    btn.disabled    = false;
    btn.textContent = "Invia messaggio";
  })
  .catch(() => {
    msg.style.display = "block";
    msg.style.color   = "var(--muted)";
    msg.textContent   = "Errore di rete. Scrivici direttamente via email.";
    btn.disabled    = false;
    btn.textContent = "Invia messaggio";
  });
}
