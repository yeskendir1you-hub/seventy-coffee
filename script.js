// ===== Настройки: меняйте тут =====
const CONFIG = {
  phone: "77776918585",
  instagram: "https://www.instagram.com/seventy.coffee",
  whatsappText: "Здравствуйте! Хочу заказать зерно Seventy Coffee",
  open: "07:55",
  close: "21:00",
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// links
const wa = `https://wa.me/${CONFIG.phone}?text=${encodeURIComponent(CONFIG.whatsappText)}`;
$("#orderBtn").href = wa;
$("#footerWa").href = wa;
if (CONFIG.instagram) {
  $("#instaBtn").href = CONFIG.instagram;
  $("#footerInsta").href = CONFIG.instagram;
} else {
  $("#instaBlock").remove();
  $("#footerInsta").remove();
}
$("#year").textContent = new Date().getFullYear();

// nav
const nav = $("#nav");
const onScroll = () => nav.classList.toggle("scrolled", scrollY > 40);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

const burger = $("#burger"), links = $("#navLinks");
const toggleMenu = (force) => {
  const open = links.classList.toggle("open", force);
  burger.classList.toggle("open", open);
  burger.setAttribute("aria-expanded", open);
  document.body.style.overflow = open ? "hidden" : "";
};
burger.addEventListener("click", () => toggleMenu());
$$("a", links).forEach((a) => a.addEventListener("click", () => toggleMenu(false)));

// menu tabs
$$(".tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    $$(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    $$(".menu-panel").forEach((p) => p.classList.toggle("active", p.dataset.panel === tab.dataset.tab));
  })
);

// reveal on scroll
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }),
  { threshold: 0.12 }
);
$$(".reveal").forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 70}ms`;
  io.observe(el);
});

// open now (Almaty time, UTC+5)
(function openNow() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Almaty" }));
  const mins = now.getHours() * 60 + now.getMinutes();
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const isOpen = mins >= toMin(CONFIG.open) && mins < toMin(CONFIG.close);
  $$(".place").forEach((p) => p.classList.toggle("is-open", isOpen));
  $("#openNow").innerHTML = isOpen
    ? `Сейчас <b>открыто</b> — до ${CONFIG.close}. Заходите!`
    : `Сейчас закрыто. Откроемся в <b>${CONFIG.open}</b>.`;
})();

// 3D coffee bags: auto-spin + drag with inertia
$$(".bag3d-wrap").forEach((wrap) => {
  const bag = $(".bag3d", wrap);
  let ry = Number(bag.dataset.start) || 0, rx = -8, vel = 0.35, dragging = false, lastX = 0, lastY = 0, idle = true;
  const render = () => { bag.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; };
  const tick = () => {
    if (!dragging) {
      ry += vel;
      vel += ((idle ? 0.35 : 0) - vel) * 0.02; // ease back to calm auto-spin
      rx += (-8 - rx) * 0.05;
    }
    render();
    requestAnimationFrame(tick);
  };
  wrap.addEventListener("pointerdown", (e) => {
    dragging = true; idle = false; lastX = e.clientX; lastY = e.clientY;
    wrap.setPointerCapture(e.pointerId);
  });
  wrap.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    ry += dx * 0.6; rx = Math.max(-35, Math.min(35, rx - dy * 0.4));
    vel = dx * 0.6; lastX = e.clientX; lastY = e.clientY;
  });
  const end = () => { dragging = false; setTimeout(() => (idle = true), 1200); };
  wrap.addEventListener("pointerup", end);
  wrap.addEventListener("pointercancel", end);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { render(); return; }
  tick();
});
