(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Hours (edit here if hours change) ----------
     0 = Sunday ... 6 = Saturday. Times are 24h, local Bethlehem time. */
  var HOURS = {
    0: null,
    1: [9, 18.75],
    2: [9, 18.75],
    3: [9, 18.75],
    4: [9, 18.75],
    5: [9, 18.75],
    6: [9, 18.75]
  };
  /* Saturday hours begin on this date (Bethlehem time) */
  var SAT_START = "2026-11-14";
  var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function fmtHour(h) {
    var hr = Math.floor(h), min = Math.round((h - hr) * 60);
    var suffix = hr >= 12 ? "PM" : "AM";
    var twelve = hr % 12 === 0 ? 12 : hr % 12;
    return twelve + (min ? ":" + (min < 10 ? "0" : "") + min : "") + " " + suffix;
  }

  function bethlehemNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "numeric", hour12: false
      }).formatToParts(new Date());
      var map = {};
      parts.forEach(function (p) { map[p.type] = p.value; });
      var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      var hour = parseInt(map.hour, 10) % 24;
      return { day: days[map.weekday], time: hour + parseInt(map.minute, 10) / 60 };
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), time: d.getHours() + d.getMinutes() / 60 };
    }
  }

  function bethlehemDate(offsetDays) {
    var d = new Date(Date.now() + (offsetDays || 0) * 86400000);
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d); }
    catch (e) { return d.toISOString().slice(0, 10); }
  }
  function hoursFor(day, offsetDays) {
    if (day === 6 && bethlehemDate(offsetDays) < SAT_START) return null;
    return HOURS[day];
  }

  function nextOpening(day) {
    for (var i = 1; i <= 7; i++) {
      var d = (day + i) % 7;
      if (hoursFor(d, i)) return { day: d, offset: i };
    }
    return null;
  }

  function updateStatus() {
    var now = bethlehemNow();
    var today = hoursFor(now.day, 0);
    var el = document.querySelector("[data-status]");
    var text = document.querySelector("[data-status-text]");
    if (!el || !text) return;
    el.classList.remove("is-open", "is-closed");

    if (today && now.time >= today[0] && now.time < today[1]) {
      el.classList.add("is-open");
      var left = today[1] - now.time;
      text.textContent = left <= 0.75
        ? "Open now, closing soon at " + fmtHour(today[1])
        : "Open now until " + fmtHour(today[1]);
      return;
    }
    el.classList.add("is-closed");
    if (today && now.time < today[0]) {
      text.textContent = "Closed right now. Opens today at " + fmtHour(today[0]);
      return;
    }
    var next = nextOpening(now.day);
    if (next) {
      var when = next.offset === 1 ? "tomorrow" : DAY_NAMES[next.day];
      text.textContent = "Closed right now. Opens " + when + " at " + fmtHour(hoursFor(next.day, next.offset)[0]);
    }
  }

  function highlightToday() {
    var now = bethlehemNow();
    var row = document.querySelector('[data-hours] tr[data-day="' + now.day + '"]');
    if (row) row.classList.add("is-today");
  }

  if (bethlehemDate(0) >= SAT_START) {
    document.querySelectorAll("[data-sat-soon]").forEach(function (el) { el.hidden = true; });
    var at = document.querySelector("[data-announce-text]");
    if (at) at.textContent = "we're now open Saturdays, 9 AM to 6:45 PM.";
  }
  updateStatus();
  highlightToday();
  setInterval(updateStatus, 60000);

  /* ---------- Nav ---------- */
  var nav = document.querySelector("[data-nav]");
  var toggle = document.querySelector("[data-nav-toggle]");
  var menu = document.getElementById("nav-menu");

  function closeMenu() {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", "false");
    menu.classList.remove("is-open");
  }
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
      menu.classList.toggle("is-open", !open);
      if (!open) {
        var first = menu.querySelector("a");
        if (first) first.focus();
      }
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        closeMenu();
        toggle.focus();
      }
    });
  }
  if (nav) {
    var onScroll = function () { nav.classList.toggle("is-scrolled", window.scrollY > 10); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Highlight nav link for the section in view */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__menu a[href^="#"]'));
  if ("IntersectionObserver" in window && navLinks.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.setAttribute("aria-current", a.getAttribute("href") === "#" + en.target.id ? "true" : "false");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach(function (a) {
      var s = document.querySelector(a.getAttribute("href"));
      if (s) spy.observe(s);
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (!reduceMotion && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = ((i % 4) * 70) + "ms";
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Menu tabs ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-tabs] [role="tab"]'));
  var panels = Array.prototype.slice.call(document.querySelectorAll("[data-panel]"));
  var menuSection = document.getElementById("menu");

  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach(function (p) {
      p.classList.toggle("is-active", p.id === tab.getAttribute("aria-controls"));
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () {
      if (searchInput && searchInput.value) { searchInput.value = ""; runSearch(); }
      selectTab(tab, false);
    });
    tab.addEventListener("keydown", function (e) {
      var idx = null;
      if (e.key === "ArrowRight") idx = (i + 1) % tabs.length;
      if (e.key === "ArrowLeft") idx = (i - 1 + tabs.length) % tabs.length;
      if (e.key === "Home") idx = 0;
      if (e.key === "End") idx = tabs.length - 1;
      if (idx !== null) { e.preventDefault(); selectTab(tabs[idx], true); }
    });
  });

  /* ---------- Menu search ---------- */
  var searchInput = document.querySelector("[data-menu-search]");
  var emptyMsg = document.querySelector("[data-empty]");
  function runSearch() {
    if (!searchInput || !menuSection) return;
    var q = searchInput.value.trim().toLowerCase();
    var searching = q.length > 0;
    menuSection.classList.toggle("is-searching", searching);
    var total = 0;
    panels.forEach(function (p) {
      var count = 0;
      p.querySelectorAll(".item").forEach(function (item) {
        var match = !searching || item.getAttribute("data-search").indexOf(q) !== -1;
        item.hidden = !match;
        if (match) count++;
      });
      p.classList.toggle("is-empty", searching && count === 0);
      total += count;
    });
    if (emptyMsg) emptyMsg.hidden = !(searching && total === 0);
  }
  if (searchInput) {
    searchInput.addEventListener("input", runSearch);
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { searchInput.value = ""; runSearch(); }
    });
  }

  /* ---------- Goat high five ---------- */
  var goatBtn = document.querySelector("[data-goat]");
  var lines = ["G.O.A.T!", "Extra cheese?", "You hungry?", "Order up!", "Whiz wit?"];
  var li = 0, busy = false;
  if (goatBtn) {
    goatBtn.addEventListener("click", function () {
      if (busy) return;
      busy = true;
      var svg = goatBtn.querySelector(".goat");
      var pop = document.createElement("span");
      pop.className = "goat-pop";
      pop.setAttribute("aria-hidden", "true");
      pop.textContent = lines[li++ % lines.length];
      goatBtn.parentNode.appendChild(pop);
      if (svg && !reduceMotion) svg.classList.add("cheer");
      setTimeout(function () {
        if (svg) svg.classList.remove("cheer");
        pop.remove();
        busy = false;
      }, 1550);
    });
  }

  /* ---------- Contact form (builds an email, stores nothing) ---------- */
  var form = document.querySelector("[data-form]");
  if (form) {
    var status = form.querySelector("[data-form-status]");
    function check(input, errId) {
      var err = document.getElementById(errId);
      var ok = input.value.trim().length > 0;
      input.setAttribute("aria-invalid", ok ? "false" : "true");
      if (err) {
        err.hidden = ok;
        if (!ok) input.setAttribute("aria-describedby", (input.getAttribute("aria-describedby") || "").replace(errId, "").trim() + " " + errId);
      }
      return ok;
    }
    var nameEl = form.querySelector("#f-name");
    var msgEl = form.querySelector("#f-msg");
    [[nameEl, "f-name-err"], [msgEl, "f-msg-err"]].forEach(function (pair) {
      pair[0].addEventListener("blur", function () { if (pair[0].getAttribute("aria-invalid") === "true") check(pair[0], pair[1]); });
      pair[0].addEventListener("input", function () { if (pair[0].getAttribute("aria-invalid") === "true") check(pair[0], pair[1]); });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var okName = check(nameEl, "f-name-err");
      var okMsg = check(msgEl, "f-msg-err");
      if (!okName) { nameEl.focus(); return; }
      if (!okMsg) { msgEl.focus(); return; }
      var clean = function (v) { return String(v || "").replace(/[\r\n]+/g, " ").slice(0, 120); };
      var topic = clean(form.topic.value);
      var date = form.date.value;
      var body = [
        "Hi Eli's,",
        "",
        msgEl.value.trim().slice(0, 1500),
        "",
        "Name: " + clean(nameEl.value),
        form.phone.value ? "Phone: " + clean(form.phone.value) : "",
        date ? "Date needed: " + clean(date) : ""
      ].filter(function (l, i, arr) { return l !== "" || (i > 0 && arr[i - 1] !== ""); }).join("\n");
      var subject = topic + " from " + clean(nameEl.value) + " (via website)";
      var href = "mailto:elisoriginalsteakssubs@gmail.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      window.location.href = href;
      if (status) status.textContent = "Your email app should be opening now. If it doesn't, email elisoriginalsteakssubs@gmail.com or call 610-419-4506.";
    });
  }

  /* ---------- Footer year ---------- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = String(new Date().getFullYear());
})();
