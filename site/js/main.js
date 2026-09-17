/* ─────────────────────────────────────────────────────────────
   Bastide Aurane — interactions
   1. Hero : lecture vidéo pilotée par le scroll (desktop),
      lecture automatique simple sur mobile / mouvement réduit.
   2. En-tête qui s'efface et se colore selon la position.
   3. Révélations discrètes au scroll (IntersectionObserver).
   4. Vidéos d'ambiance : lues seulement lorsqu'elles sont visibles.
   5. Bouton « Demander la réservation » → formulaire pré-rempli.
   6. Formulaire : validation légère, envoi via le logiciel de courrier.
   ───────────────────────────────────────────────────────────── */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const scrubMedia = window.matchMedia("(min-width: 900px) and (pointer: fine)");

  /* ── 1. Hero ─────────────────────────────────────────────── */
  const hero = $(".hero");
  const video = $("#hero-video");

  function setupHero() {
    if (!hero || !video) return;

    const progressBar = $(".hero__progress-bar", hero);
    const steps = $$(".hero__steps li", hero);
    const useScrub = scrubMedia.matches && !reduceMotion.matches;

    // Première source que le navigateur sait lire (mp4/H.264 d'abord, WebM sinon).
    const canPlayMp4 = video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== "";
    const sources = $$("source", video).map((el) => ({ src: el.src, type: el.type }));
    const playable = sources.find((s) => video.canPlayType(s.type) !== "") || sources[0];

    if (!useScrub) {
      // Mobile, tablette, ou mouvement réduit : lecture simple, en boucle douce,
      // avec la version plus légère (GOP long) de la même vidéo quand H.264 est lu.
      const light = video.getAttribute("data-light-src");
      if (light && canPlayMp4) { video.innerHTML = ""; video.src = light; }
      else if (playable) { video.innerHTML = ""; video.src = playable.src; }
      video.loop = true;
      video.autoplay = true;
      video.preload = "auto";
      const play = () => video.play().then(() => hero.classList.add("is-video-ready")).catch(() => {});
      if (reduceMotion.matches) return; // on garde l'image fixe
      video.addEventListener("canplay", play, { once: true });
      video.load();
      return;
    }

    hero.classList.add("is-scrub", "is-loading");
    video.pause();
    video.loop = false;

    // Bornes de temps des quatre étapes (fraction de la durée totale).
    const stageBounds = [0, 0.26, 0.54, 0.78, 1];
    let duration = 0;
    let target = 0;
    let current = 0;
    let ready = false;
    let rafId = 0;
    let seeking = false;
    let pending = false;
    let seekGuard = 0;

    const setProgress = (p) => {
      progressBar.style.transform = `scaleX(${p})`;
      let active = 0;
      for (let i = 0; i < 4; i++) if (p >= stageBounds[i]) active = i;
      steps.forEach((li, i) => {
        li.classList.toggle("is-active", i === active);
        li.classList.toggle("is-done", i < active);
      });
      hero.classList.toggle("is-scrubbing", p > 0.015);
      hero.classList.toggle("is-entering", p > 0.1);
      hero.classList.toggle("is-inside", p > 0.9);
    };

    const measure = () => {
      const rect = hero.getBoundingClientRect();
      const total = hero.offsetHeight - window.innerHeight;
      const p = clamp(-rect.top / total, 0, 1);
      target = p;
      setProgress(p);
    };

    const seekTo = (t) => {
      if (!ready) return;
      if (Math.abs(video.currentTime - t) < 0.012) return; // déjà sur cette image
      if (seeking) { pending = true; return; }
      seeking = true;
      // Si « seeked » n'arrive pas (saut nul, décodeur lent), on libère quand même.
      clearTimeout(seekGuard);
      seekGuard = setTimeout(() => { seeking = false; }, 160);
      // fastSeek est plus fluide sur Safari ; currentTime ailleurs.
      if ("fastSeek" in video && Math.abs(video.currentTime - t) > 0.5) video.fastSeek(t);
      else video.currentTime = t;
    };
    video.addEventListener("seeked", () => {
      clearTimeout(seekGuard);
      seeking = false;
      if (pending) { pending = false; seekTo(current * duration); }
    });

    const tick = () => {
      // Interpolation douce : le temps vidéo suit la cible avec un léger retard,
      // ce qui gomme les à-coups de la molette sans perdre le contrôle image par image.
      const diff = target - current;
      if (Math.abs(diff) > 0.0004) {
        current += diff * 0.16;
        seekTo(clamp(current, 0, 0.999) * duration);
      } else if (current !== target) {
        current = target;
        seekTo(clamp(current, 0, 0.999) * duration);
      }
      rafId = requestAnimationFrame(tick);
    };

    const start = () => {
      duration = video.duration || 0;
      if (!duration) return;
      ready = true;
      hero.classList.remove("is-loading");
      hero.classList.add("is-video-ready");
      measure();
      current = target;
      seekTo(current * duration);
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    };

    // On charge le fichier entier en mémoire : les sauts dans la vidéo
    // deviennent instantanés, quelle que soit la vitesse de la molette.
    const src = playable ? playable.src : video.currentSrc;
    const mime = playable ? playable.type : "video/mp4";
    const loadingEl = $(".hero__loading", hero);
    fetch(src)
      .then((r) => {
        if (!r.ok || !r.body) throw new Error("no body");
        const total = Number(r.headers.get("Content-Length")) || 0;
        const reader = r.body.getReader();
        const chunks = [];
        let received = 0;
        const pump = () => reader.read().then(({ done, value }) => {
          if (done) return new Blob(chunks, { type: mime });
          chunks.push(value);
          received += value.length;
          if (total && loadingEl) loadingEl.textContent = `Chargement ${Math.round((received / total) * 100)} %`;
          return pump();
        });
        return pump();
      })
      .then((blob) => {
        video.src = URL.createObjectURL(blob);
        video.load();
      })
      .catch(() => {
        // Repli : on laisse le navigateur gérer le flux.
        if (playable) { video.innerHTML = ""; video.src = playable.src; }
        video.preload = "auto";
        video.load();
      });

    video.addEventListener("loadedmetadata", start, { once: true });
    if (video.readyState >= 1 && video.duration) start();

    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    measure();
  }

  /* ── 2. En-tête ──────────────────────────────────────────── */
  const header = $(".site-header");
  function setupHeader() {
    if (!header) return;
    let lastY = window.scrollY;
    let travelled = 0; // distance cumulée dans la direction courante
    let direction = 0;
    const heroHeight = () => (hero ? hero.offsetHeight : 0);
    const update = () => {
      const y = window.scrollY;
      const overHero = y < heroHeight() - 80;
      header.classList.toggle("is-over-hero", overHero);
      header.classList.toggle("is-scrolled", !overHero);
      // Se cache après 40 px de descente, réapparaît après 40 px de remontée (hors hero).
      const delta = y - lastY;
      const dir = Math.sign(delta);
      if (dir !== 0 && dir !== direction) { direction = dir; travelled = 0; }
      travelled += Math.abs(delta);
      if (overHero || reduceMotion.matches || document.body.classList.contains("nav-open")) header.classList.remove("is-hidden");
      else if (direction > 0 && travelled > 40 && y > 200) header.classList.add("is-hidden");
      else if (direction < 0 && travelled > 40) header.classList.remove("is-hidden");
      lastY = y;
    };
    window.addEventListener("scroll", update, { passive: true });
    update();

    const toggle = $(".nav-toggle");
    const mobileNav = $("#mobile-nav");
    if (toggle && mobileNav) {
      const close = () => {
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Ouvrir le menu");
        mobileNav.hidden = true;
        document.body.classList.remove("nav-open");
      };
      toggle.addEventListener("click", () => {
        const open = toggle.getAttribute("aria-expanded") === "true";
        if (open) return close();
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", "Fermer le menu");
        mobileNav.hidden = false;
        document.body.classList.add("nav-open");
        header.classList.remove("is-hidden");
      });
      $$("a", mobileNav).forEach((a) => a.addEventListener("click", close));
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    }
  }

  /* ── 3. Révélations ──────────────────────────────────────── */
  function setupReveal() {
    const items = $$(".reveal, .suite, .place__panorama");
    if (!("IntersectionObserver" in window) || reduceMotion.matches) {
      items.forEach((el) => el.classList.add("in"));
      return;
    }
    // Léger décalage entre éléments voisins d'une même grille.
    $$(".suite-grid, .review-list, .manifesto__facts, .booking__terms").forEach((grid) => {
      $$(":scope > *", grid).forEach((el, i) => el.style.setProperty("--d", `${(i % 3) * 90}ms`));
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    items.forEach((el) => io.observe(el));
  }

  /* ── 4. Vidéos d'ambiance ────────────────────────────────── */
  function setupAmbient() {
    const videos = $$("video[data-ambient]");
    if (!videos.length) return;
    if (reduceMotion.matches) return; // on garde les affiches fixes
    const io = new IntersectionObserver((entries) => {
      entries.forEach(({ target: v, isIntersecting }) => {
        if (isIntersecting) {
          if (v.preload !== "auto") { v.preload = "auto"; v.load(); }
          v.play().then(() => v.classList.add("is-ready")).catch(() => {});
        } else {
          v.pause();
        }
      });
    }, { rootMargin: "25% 0px" });
    videos.forEach((v) => {
      v.addEventListener("playing", () => v.classList.add("is-ready"), { once: true });
      io.observe(v);
    });
  }

  /* ── 5. Réservation → formulaire ─────────────────────────── */
  function setupReserve() {
    const select = $("#f-suite");
    const message = $("#f-message");
    $$("[data-reserve]").forEach((el) => {
      el.addEventListener("click", () => {
        const suite = el.getAttribute("data-reserve");
        if (select && suite) select.value = suite;
        if (message && !message.value) {
          message.placeholder = suite
            ? `Nous aimerions réserver la suite ${suite} du … au … (… nuits).`
            : "Vos dates, le nombre de nuits, la suite qui vous tente…";
        }
        // Le lien mène au formulaire ; on place le focus une fois le défilement fini.
        window.setTimeout(() => $("#f-name")?.focus({ preventScroll: true }), 700);
      });
    });
  }

  /* ── 6. Formulaire ───────────────────────────────────────── */
  function setupForm() {
    const form = $("#contact-form");
    if (!form) return;
    const error = $("#form-error");
    const success = $("#form-success");
    const fields = { nom: $("#f-name"), email: $("#f-email"), message: $("#f-message") };
    const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let ok = true;
      Object.entries(fields).forEach(([key, input]) => {
        const value = input.value.trim();
        const valid = key === "email" ? validEmail(value) : value.length > 1;
        input.closest(".field").classList.toggle("is-invalid", !valid);
        ok = ok && valid;
      });
      error.hidden = ok;
      if (!ok) { $(".is-invalid input, .is-invalid textarea", form)?.focus(); return; }

      const suite = $("#f-suite").value;
      const subject = suite ? `Demande de réservation — ${suite}` : "Demande de réservation";
      const body = [
        `Nom : ${fields.nom.value.trim()}`,
        `Email : ${fields.email.value.trim()}`,
        suite ? `Suite souhaitée : ${suite}` : null,
        "",
        fields.message.value.trim(),
      ].filter((l) => l !== null).join("\n");

      // Site 100 % statique : la demande part par le logiciel de courrier du visiteur.
      // Pour un service de formulaire (Netlify Forms, Formspree…), remplacer ce bloc.
      window.location.href = `mailto:bonjour@bastide-aurane.fr?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      success.hidden = false;
      success.focus();
    });
  }

  /* ── Divers ──────────────────────────────────────────────── */
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  setupHero();
  setupHeader();
  setupReveal();
  setupAmbient();
  setupReserve();
  setupForm();
})();
