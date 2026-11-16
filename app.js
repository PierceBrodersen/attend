/* Attend — site behavior: theme, reveal, counters, calculator, chatbot */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme toggle ---------- */
  var root = document.documentElement;
  var toggle = document.querySelector('.theme-toggle');
  function syncToggleLabel() {
    if (!toggle) return;
    var dark = root.getAttribute('data-theme') === 'dark';
    toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }
  syncToggleLabel();
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('attend-theme', next); } catch (e) {}
      syncToggleLabel();
    });
  }

  /* ---------- Make sure the hero video plays (some browsers need a nudge) ---------- */
  var video = document.querySelector('.hero-video video');
  if (video) {
    video.muted = true;
    var tryPlay = function () { var p = video.play(); if (p && p.catch) p.catch(function () {}); };
    tryPlay();
    document.addEventListener('visibilitychange', function () { if (!document.hidden) tryPlay(); });
  }

  /* ---------- Count-up stats ---------- */
  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-to'));
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduceMotion) { el.textContent = to + suffix; return; }
    var start = null, dur = 1400;
    function step(ts) {
      if (!start) start = ts;
      var t = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(to * eased) + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    el.textContent = '0' + suffix;
    requestAnimationFrame(step);
  }

  /* ---------- Scroll reveal ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        entry.target.querySelectorAll('.count').forEach(countUp);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Time-back calculator ---------- */
  var REVIEW_MIN = 3;      // minutes to review an Attend draft
  var WEEKS_PER_YEAR = 46; // working weeks
  var VISIT_MIN = 20;      // length of a typical visit
  var $ = function (id) { return document.getElementById(id); };
  var inputs = ['patients', 'minutes', 'days', 'rate'].map($);

  function fmt(n, d) { return n.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function setFill(el) {
    var pct = (el.value - el.min) / (el.max - el.min) * 100;
    el.style.setProperty('--fill', pct + '%');
  }

  function calc() {
    if (!inputs[0]) return;
    var patients = +inputs[0].value, minutes = +inputs[1].value, days = +inputs[2].value, rate = +inputs[3].value;
    inputs.forEach(setFill);
    $('patients-out').textContent = patients;
    $('minutes-out').textContent = minutes;
    $('days-out').textContent = days;
    $('rate-out').textContent = '$' + rate;

    var savedPerPatient = Math.max(minutes - REVIEW_MIN, 0);
    var minWeek = savedPerPatient * patients * days;
    var hrsWeek = minWeek / 60;
    var hrsYear = hrsWeek * WEEKS_PER_YEAR;
    var dollars = Math.round(hrsYear * rate / 100) * 100;
    var extraVisits = Math.floor(minWeek / VISIT_MIN);

    $('hours-week').textContent = fmt(hrsWeek, 1);
    $('hours-year').textContent = fmt(Math.round(hrsYear)) + ' hours';
    $('dollars-year').textContent = '$' + fmt(dollars);
    $('weeks').textContent = fmt(hrsYear / 40, 1) + ' weeks';
    $('result-note').textContent = savedPerPatient > 0
      ? "That's " + savedPerPatient + ' more minute' + (savedPerPatient === 1 ? '' : 's') + ' you could give each patient, or about ' + fmt(extraVisits) + ' extra visit' + (extraVisits === 1 ? '' : 's') + ' a week if you chose to see more people.'
      : 'You already document fast. Attend would mostly save you typing, not time.';

    var big = document.querySelector('.result-big');
    if (big && !reduceMotion) { big.classList.remove('bump'); void big.offsetWidth; big.classList.add('bump'); }
  }
  inputs.forEach(function (el) { if (el) el.addEventListener('input', calc); });
  calc();

  /* ---------- Chatbot ---------- */
  var chat = document.querySelector('.chat');
  if (!chat) return;
  var launch = chat.querySelector('.chat-launch');
  var panel = chat.querySelector('.chat-panel');
  var closeBtn = chat.querySelector('.chat-close');
  var log = chat.querySelector('.chat-log');
  var chips = chat.querySelector('.chat-chips');
  var form = chat.querySelector('.chat-form');
  var input = chat.querySelector('#chat-input');
  var page = document.body.getAttribute('data-page');
  var greeted = false;

  var KB = [
    { id: 'what', keys: ['what is attend', 'what is this', 'what does attend do', 'what do you do', 'explain', 'overview', 'scribe', 'tell me about'],
      a: 'Attend is an AI medical scribe. It listens to a clinic visit (with the patient\'s consent), writes the clinical note, and gives it to the physician to review and sign. The goal is simple: more eye contact, less typing.' },
    { id: 'how', keys: ['how does it work', 'how does attend work', 'how it works', 'how do i use', 'process', 'steps', 'listen', 'transcri', 'workflow'],
      a: 'Here\'s a visit with Attend:\n1. Tap start on your phone and talk with your patient.\n2. Attend transcribes the conversation and drafts a structured note in your template.\n3. You review it, with every sentence linked to the moment it came from, and sign it into the chart.\nThe full walkthrough is on the <a href="about.html#how">How it works</a> page.' },
    { id: 'accuracy', keys: ['accura', 'hallucinat', 'mistake', 'error', 'wrong', 'trust', 'reliab', 'check'],
      a: 'Accuracy is the whole game. Any sentence Attend can\'t trace back to the transcript is flagged in amber for the physician to check, and a licensed clinician always signs the final note. Every model update is also tested against a library of physician-annotated visits before it ships.' },
    { id: 'privacy', keys: ['privacy', 'hipaa', 'safe', 'secure', 'security', 'data', 'store', 'recording', 'audio', 'consent', 'phi'],
      a: 'Attend is designed to meet HIPAA requirements, with a business associate agreement for every practice. Audio is encrypted when it\'s recorded and deleted once the note is signed. Patient data is never used for training without explicit permission.' },
    { id: 'ehr', keys: ['ehr', 'epic', 'cerner', 'oracle', 'athena', 'emr', 'integrat', 'chart'],
      a: 'Attend is built to send signed notes straight into the major EHRs, including Epic, Oracle Health (Cerner) and athenahealth. Physicians who use a different system can copy the finished note in one click.' },
    { id: 'price', keys: ['price', 'pricing', 'cost', 'how much', 'pay', 'subscription', 'plan', 'free', 'trial'],
      a: 'In this concept, Attend costs $199 per clinician per month with no setup fees, and comes with a 30-day free trial. To see whether it pays for itself, try the <a href="index.html#calculator">time-back calculator</a>.' },
    { id: 'time', keys: ['time', 'save', 'hours', 'calculator', 'roi', 'worth', 'burnout', 'faster'],
      a: 'Most physicians spend around 16 minutes in the EHR per patient. Attend aims to bring that down to about 3 minutes of review. Plug in your own numbers with the <a href="index.html#calculator">calculator</a> to see your hours back per week.' },
    { id: 'specialty', keys: ['specialt', 'primary care', 'pediatric', 'psych', 'cardio', 'surgery', 'er ', 'emergency', 'telehealth', 'language', 'spanish'],
      a: 'Attend works for in-person and telehealth visits and supports templates for primary care, pediatrics, internal medicine, psychiatry and most outpatient specialties. It understands English and Spanish conversations and can write the note in English.' },
    { id: 'patients', keys: ['patient', 'feel', 'experience', 'comfortable', 'opt out', 'opt-out'],
      a: 'Patients are always asked first and can say no at any time, and the visit carries on as normal. What patients usually notice is that their doctor is looking at them instead of a screen.' },
    { id: 'who', keys: ['who made', 'who built', 'creator', 'class', 'lab', 'student', 'real', 'company', 'smu'],
      a: 'Attend is a concept product created for Lab 5 of ITOM 6216 (Generative AI for Business) at SMU Cox. It isn\'t a real medical device. The <a href="about.html#why">Why this project</a> section tells the story behind it.' },
    { id: 'contact', keys: ['contact', 'demo', 'sign up', 'signup', 'email', 'talk to', 'sales', 'get started', 'try'],
      a: 'Since Attend is a class concept, there\'s no sales team yet. The best next step is to read <a href="about.html">How it works</a> or try the <a href="index.html#calculator">calculator</a>.' },
    { id: 'hello', keys: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'yo'],
      a: 'Hi! I can answer questions about how Attend works, accuracy, privacy, EHR support or pricing. What would you like to know?' },
    { id: 'thanks', keys: ['thank', 'thanks', 'great', 'awesome', 'cool', 'perfect'],
      a: 'Happy to help. Anything else you\'d like to know about Attend?' }
  ];

  var CHIPS = page === 'about'
    ? [['How accurate is it?', 'accuracy'], ['Is patient data safe?', 'privacy'], ['Does it work with Epic?', 'ehr'], ['What does it cost?', 'price']]
    : [['What is Attend?', 'what'], ['How does it work?', 'how'], ['How much time would I save?', 'time'], ['Is it HIPAA compliant?', 'privacy']];

  function escapeHTML(s) { return s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function addMsg(html, who) {
    var div = document.createElement('div');
    div.className = 'msg ' + who;
    div.innerHTML = html;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function botReply(html) {
    var t = document.createElement('div');
    t.className = 'msg bot typing';
    t.setAttribute('aria-label', 'Attend is typing');
    t.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(t);
    log.scrollTop = log.scrollHeight;
    setTimeout(function () { t.remove(); addMsg(html, 'bot'); }, reduceMotion ? 50 : 650 + Math.min(html.length * 2, 700));
  }

  function match(text) {
    var q = ' ' + text.toLowerCase().replace(/[^a-z0-9$%' -]/g, ' ') + ' ';
    var best = null, bestScore = 0;
    KB.forEach(function (item) {
      var score = 0;
      item.keys.forEach(function (k) {
        if (k.length <= 3) { if (new RegExp('\\b' + k.trim() + '\\b').test(q)) score += 1; }
        else if (q.indexOf(k) !== -1) score += k.split(' ').length + 1;
      });
      // greetings only win when nothing more specific matched
      if ((item.id === 'hello' || item.id === 'thanks') && score) score = 0.5;
      if (score > bestScore) { bestScore = score; best = item; }
    });
    return best;
  }

  function answer(text) {
    var hit = match(text);
    botReply(hit ? hit.a : 'I\'m not sure about that one. I can help with how Attend works, accuracy, privacy and HIPAA, EHR integration, specialties, pricing, or your time savings. Try one of the suggestions below.');
  }

  function renderChips() {
    chips.innerHTML = '';
    CHIPS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = c[0];
      b.addEventListener('click', function () {
        addMsg(escapeHTML(c[0]), 'user');
        var item = KB.filter(function (k) { return k.id === c[1]; })[0];
        botReply(item.a);
      });
      chips.appendChild(b);
    });
  }

  function open() {
    chat.setAttribute('data-open', 'true');
    panel.hidden = false;
    launch.setAttribute('aria-expanded', 'true');
    if (!greeted) {
      greeted = true;
      renderChips();
      botReply(page === 'about'
        ? 'Hi, I\'m the Attend assistant. Have a question about what you\'re reading? Ask me about accuracy, privacy, EHR support or pricing.'
        : 'Hi, I\'m the Attend assistant. I can explain how our AI scribe works, how it protects patient data, or how much time it could save you.');
    }
    setTimeout(function () { input.focus(); }, 50);
  }
  function close() {
    chat.setAttribute('data-open', 'false');
    panel.hidden = true;
    launch.setAttribute('aria-expanded', 'false');
    launch.focus();
  }

  launch.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    addMsg(escapeHTML(text), 'user');
    input.value = '';
    answer(text);
  });
})();
