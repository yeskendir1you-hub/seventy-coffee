/* Seventy — page behaviour: smooth scroll, reveals, nav, cursor, small live details */
(() => {
  const CONFIG = {
    whatsapp: "77771265151",
    open: "07:55",
    close: "21:00",
    event: "2026-11-12T00:00:00+05:00",
  };

  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("js");

  /* WhatsApp links */
  $$("[data-wa]").forEach((a) => {
    a.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(a.dataset.wa)}`;
    a.target = "_blank";
    a.rel = "noopener";
  });
  $("#year").textContent = new Date().getFullYear();

  /* Open now (Almaty time) */
  const almaty = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Almaty" }));
  const toMin = (t) => t.split(":").reduce((h, m) => h * 60 + +m);
  const nowMin = almaty.getHours() * 60 + almaty.getMinutes();
  const isOpen = nowMin >= toMin(CONFIG.open) && nowMin < toMin(CONFIG.close);
  const status = $("#openNow");
  status.classList.toggle("open", isOpen);
  status.textContent = isOpen
    ? `Сейчас открыто · до ${CONFIG.close}`
    : `Сейчас закрыто · откроемся в ${CONFIG.open}`;

  /* Event countdown */
  const days = Math.ceil((new Date(CONFIG.event) - Date.now()) / 864e5);
  const plural = (n) => (n % 10 === 1 && n % 100 !== 11 ? "день" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "дня" : "дней");
  $("#eventCount").textContent =
    days > 1 ? `Через ${days} ${plural(days)}` : days === 1 ? "Уже завтра" : days === 0 ? "Сегодня" : "Следите за следующим баттлом";

  /* Burger */
  const burger = $(".burger"), links = $(".nav-links");
  const setMenu = (open) => {
    links.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  };
  burger.addEventListener("click", () => setMenu(!links.classList.contains("open")));
  $$("a", links).forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /* Split headings into words */
  $$(".split").forEach((el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(" "); return; }
            const w = document.createElement("span"); w.className = "w";
            const wi = document.createElement("span"); wi.className = "wi"; wi.textContent = part;
            w.append(wi); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
  });

  /* Custom cursor */
  const cursor = $(".cursor");
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; cursor.classList.add("on"); }, { passive: true });
    document.addEventListener("pointerleave", () => cursor.classList.remove("on"));
    document.addEventListener("pointerover", (e) => cursor.classList.toggle("hover", !!e.target.closest("a, button, .lot")));
    const loop = () => {
      cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* Nav: hide on scroll down, solid after hero */
  const nav = $(".nav");
  let lastY = 0;
  const onScroll = (y) => {
    nav.classList.toggle("solid", y > 60);
    nav.classList.toggle("hide", y > lastY && y > innerHeight * 0.6 && !links.classList.contains("open"));
    lastY = y;
    document.querySelector(".stage").classList.toggle("scrolled", y > innerHeight * 0.6);
  };

  /* Without GSAP (blocked, failed) everything simply stays visible */
  const start = () => {
    const { gsap, ScrollTrigger, Lenis } = window;
    if (!gsap || !ScrollTrigger) {
      $$(".fade").forEach((el) => el.classList.add("in"));
      addEventListener("scroll", () => onScroll(scrollY), { passive: true });
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    if (Lenis && !reduce) {
      const lenis = new Lenis({ duration: 1.25, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
      lenis.on("scroll", (e) => { ScrollTrigger.update(); onScroll(e.scroll); });
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length < 2) return;
        e.preventDefault();
        lenis.scrollTo(id === "#top" ? 0 : id, { offset: -10, duration: 1.6 });
      }));
      window.__lenis = lenis;
    } else {
      addEventListener("scroll", () => onScroll(scrollY), { passive: true });
    }

    /* Hero entrance */
    if (!reduce) {
      gsap.from(".hero-word .hw", { yPercent: 40, opacity: 0, duration: 1.8, ease: "expo.out", stagger: 0.12, delay: 0.15 });
      gsap.from(".hero-foot > *", { y: 24, opacity: 0, duration: 1.4, ease: "expo.out", stagger: 0.1, delay: 0.5 });
    }

    /* Headings: words rise one by one */
    $$(".split").forEach((el) => {
      const words = $$(".wi", el);
      if (reduce) return;
      gsap.set(words, { yPercent: 110 });
      ScrollTrigger.create({
        trigger: el, start: "top 88%", once: true,
        onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.3, ease: "expo.out", stagger: 0.07 }),
      });
    });

    /* Soft fade-ups, a little staggered within each section */
    $$(".fade").forEach((el) => {
      ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: () => el.classList.add("in") });
    });

    /* Lot cards drift in like a fanned deck */
    if (!reduce) gsap.from(".lot", {
      y: 80, rotate: (i) => (i % 2 ? 8 : -8), opacity: 0, duration: 1.4, ease: "expo.out", stagger: 0.09,
      clearProps: "transform,opacity",
      scrollTrigger: { trigger: ".lots-row", start: "top 85%", once: true },
    });

    /* Big numerals parallax */
    if (!reduce) {
      gsap.to(".story-num", { yPercent: -18, ease: "none", scrollTrigger: { trigger: ".story", scrub: 1 } });
      gsap.to(".school-70", { yPercent: -12, rotate: -4, ease: "none", scrollTrigger: { trigger: ".school", scrub: 1 } });
      gsap.fromTo(".footer-70", { yPercent: 30 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: 1 } });
    }

    /* Evening: the school block inverts the whole page */
    ScrollTrigger.create({
      trigger: ".school", start: "top 55%", end: "bottom 45%",
      onToggle: (self) => root.classList.toggle("dark", self.isActive),
    });

    addEventListener("load", () => ScrollTrigger.refresh());
  };

  if (document.readyState === "complete" || document.readyState === "interactive") start();
  else addEventListener("DOMContentLoaded", start);
})();
