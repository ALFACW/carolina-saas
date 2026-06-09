/* CarolinaPOS — landing interactions */
(function () {
  "use strict";

  /* ---- Navbar shadow on scroll ---- */
  var nav = document.querySelector(".nav");
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Mobile menu ---- */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.querySelector(".mobile-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      menu.classList.toggle("open");
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { menu.classList.remove("open"); });
    });
  }

  /* ---- Pricing toggle (mensual / anual) ---- */
  var toggleBtns = document.querySelectorAll(".price-toggle button");
  var ANNUAL_DISCOUNT = 0.20; // 20% off → ~2.4 meses gratis
  function fmtCOP(n) {
    return "$" + n.toLocaleString("es-CO");
  }
  function setPeriod(period) {
    toggleBtns.forEach(function (b) { b.classList.toggle("active", b.dataset.period === period); });
    document.querySelectorAll(".plan").forEach(function (plan) {
      var monthly = parseInt(plan.dataset.monthly, 10);
      if (!monthly) return; // e.g. custom plan
      var amtEl = plan.querySelector(".plan-price .amt");
      var perEl = plan.querySelector(".plan-price .per");
      var noteEl = plan.querySelector(".plan-annual-note");
      if (period === "anual") {
        var perMonth = Math.round(monthly * (1 - ANNUAL_DISCOUNT) / 1000) * 1000;
        var yearly = perMonth * 12;
        amtEl.textContent = fmtCOP(perMonth);
        perEl.textContent = "/mes";
        noteEl.textContent = "Facturado " + fmtCOP(yearly) + "/año";
      } else {
        amtEl.textContent = fmtCOP(monthly);
        perEl.textContent = "/mes";
        noteEl.textContent = "Facturación mensual";
      }
    });
  }
  toggleBtns.forEach(function (b) {
    b.addEventListener("click", function () { setPeriod(b.dataset.period); });
  });
  setPeriod("mensual");

  /* ---- FAQ accordion ---- */
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var q = item.querySelector(".faq-q");
    var a = item.querySelector(".faq-a");
    q.addEventListener("click", function () {
      var isOpen = item.classList.contains("open");
      // close all
      document.querySelectorAll(".faq-item").forEach(function (other) {
        other.classList.remove("open");
        other.querySelector(".faq-a").style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add("open");
        a.style.maxHeight = a.scrollHeight + "px";
      }
    });
  });

  /* ---- Scroll reveal ---- */
  var revealEls = document.querySelectorAll(".reveal");
  function revealAll() { revealEls.forEach(function (el) { el.classList.add("in"); }); }
  function revealInView() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    revealEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.95) el.classList.add("in");
    });
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
    // Reveal anything already on screen right away (covers offscreen-iframe
    // rendering where IO never fires), and a hard fallback so content is
    // never stuck invisible.
    revealInView();
    window.addEventListener("load", revealInView);
    setTimeout(revealInView, 400);
    setTimeout(revealAll, 2500);
  } else {
    revealAll();
  }

  /* ---- Pricing carousel dots ---- */
  var plansEl = document.querySelector(".plans");
  var dotEls = document.querySelectorAll(".plans-dots .dot");
  function getActivePlanIndex() {
    if (!plansEl) return 0;
    var cards = plansEl.querySelectorAll(".plan");
    var scrollCenter = plansEl.scrollLeft + plansEl.offsetWidth / 2;
    var closest = 0, minDist = Infinity;
    cards.forEach(function (card, i) {
      var dist = Math.abs((card.offsetLeft + card.offsetWidth / 2) - scrollCenter);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    return closest;
  }
  function updatePlanDots() {
    var idx = getActivePlanIndex();
    dotEls.forEach(function (d, i) { d.classList.toggle("active", i === idx); });
  }
  if (plansEl && dotEls.length) {
    plansEl.addEventListener("scroll", updatePlanDots, { passive: true });
    dotEls.forEach(function (dot, i) {
      dot.addEventListener("click", function () {
        var cards = plansEl.querySelectorAll(".plan");
        if (!cards[i]) return;
        var target = cards[i].offsetLeft + cards[i].offsetWidth / 2 - plansEl.offsetWidth / 2;
        plansEl.scrollTo({ left: target, behavior: "smooth" });
      });
    });
  }

  /* ---- Demo video: hide full section if webm missing ---- */
  var demoSection = document.querySelector(".demo-hero-video");
  var demoVid = demoSection && demoSection.querySelector("video");
  if (demoVid) {
    function hideDemoSection() {
      if (demoSection) demoSection.style.display = "none";
    }
    demoVid.addEventListener("error", hideDemoSection);
    demoVid.querySelector && demoVid.querySelector("source") &&
      demoVid.querySelector("source").addEventListener("error", hideDemoSection);
    // Fallback: if no data after 4s, file probably doesn't exist
    setTimeout(function () {
      if (demoVid.readyState === 0) hideDemoSection();
    }, 4000);
  }

  /* ---- App screenshots tabs ---- */
  var screenTabs = document.querySelectorAll(".screens-tab");
  var screenImgs = document.querySelectorAll(".screens-img");
  screenTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var key = tab.dataset.screen;
      screenTabs.forEach(function (t) { t.classList.toggle("active", t === tab); });
      screenImgs.forEach(function (img) { img.classList.toggle("active", img.dataset.screen === key); });
    });
  });

  /* ---- Smooth anchor offset for sticky nav ---- */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href");
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var y = target.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: y, behavior: "smooth" });
    });
  });
})();
