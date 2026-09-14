(function () {

  // =====================================================================
  // PASTE YOUR FIREBASE CONFIG HERE (from Firebase console > Project settings > your web app)
  // =====================================================================
  var firebaseConfig = {
    apiKey: "AIzaSyCy9GSfl-UR0qbFFadCZhl_Bs2TgzcM1bQ",
    authDomain: "harinandan-portfolio.firebaseapp.com",
    projectId: "harinandan-portfolio",
    storageBucket: "harinandan-portfolio.firebasestorage.app",
    messagingSenderId: "28818548286",
    appId: "1:28818548286:web:0423671adc62e969c9d36f"
  };
  firebase.initializeApp(firebaseConfig);
  var db = firebase.firestore();
  var CONTENT_DOC = db.collection('portfolio').doc('content');
  var AUTH_DOC = db.collection('portfolio').doc('admin');
  // =====================================================================

  var defaultState = {
    name: "P K HARINANDAN",
    role: "BCA graduate, learning web development and DSA. Open to internship opportunities.",
    about: "I'm a BCA graduate building my skills in web development. Right now I'm working through HTML, CSS, JavaScript and Python, and picking up data structures & algorithms along the way. I'm looking for an internship where I can apply what I'm learning, contribute to real projects, and keep growing as a developer.",
    skills: [
      { category: "Languages", items: ["HTML", "CSS", "JavaScript", "Python"] },
      { category: "Currently learning", items: ["Data Structures & Algorithms"] },
      { category: "Tools", items: ["Git", "VS Code"] }
    ],
    projects: [],
    contact: { email: "", github: "", linkedin: "", resume: "" }
  };

  var SECTIONS = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'skills', label: 'Skills' },
    { id: 'projects', label: 'Projects' },
    { id: 'contact', label: 'Contact' }
  ];

  var state = null;
  var isAdmin = false;
  var editingSection = null;
  var editingProjectId = null;
  var modal = null;
  var activeSection = 'home';

  function uid() { return Math.random().toString(36).slice(2, 9); }

  async function sha256(text) {
    var enc = new TextEncoder().encode(text);
    var buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  async function loadData() {
    try {
      var docSnap = await CONTENT_DOC.get();
      if (docSnap.exists) {
        state = docSnap.data().payload;
      } else {
        state = JSON.parse(JSON.stringify(defaultState));
        await CONTENT_DOC.set({ payload: state });
      }
    } catch (e) {
      console.error(e);
      state = JSON.parse(JSON.stringify(defaultState));
    }
    render();
    setupScrollSpy();
    setupReveal();
    setupAmbient();
  }

  async function saveData() {
    try { await CONTENT_DOC.set({ payload: state }); }
    catch (e) { console.error(e); alert('Could not save — check your internet connection and try again.'); }
  }

  async function getAuthHash() {
    try {
      var docSnap = await AUTH_DOC.get();
      return docSnap.exists ? docSnap.data().hash : null;
    } catch (e) { console.error(e); return null; }
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : s;
    return d.innerHTML;
  }

  function scrollTo(id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  window.__scrollTo = scrollTo;

  function openModal(kind) { modal = kind; render(); }
  function closeModal() {
    var overlay = document.querySelector('.modal-overlay');
    var box = document.querySelector('.modal');
    if (!overlay || !box || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { modal = null; render(); return; }
    overlay.classList.add('closing');
    box.classList.add('closing');
    setTimeout(function () { modal = null; render(); }, 380);
  }
  window.__openModal = openModal;
  window.__closeModal = closeModal;

  async function handleLogin(pass) {
    var hash = await sha256(pass);
    var stored = await getAuthHash();
    var errEl = document.getElementById('modal-err');
    if (stored && hash === stored) { isAdmin = true; modal = null; render(); }
    else if (errEl) { errEl.textContent = 'Wrong password.'; }
  }
  window.__handleLogin = handleLogin;

  async function handleSetup(pass, confirmPass) {
    var errEl = document.getElementById('modal-err');
    if (pass.length < 4) { if (errEl) errEl.textContent = 'Use at least 4 characters.'; return; }
    if (pass !== confirmPass) { if (errEl) errEl.textContent = 'Passwords do not match.'; return; }
    var hash = await sha256(pass);
    try {
      await AUTH_DOC.set({ hash: hash });
      isAdmin = true; modal = null; render();
    } catch (e) { console.error(e); if (errEl) errEl.textContent = 'Could not save password — try again.'; }
  }
  window.__handleSetup = handleSetup;

  function logout() { isAdmin = false; editingSection = null; render(); }
  window.__logout = logout;


  async function openAdmin() {
    var stored = await getAuthHash();
    openModal(stored ? 'login' : 'setup');
  }
  window.__openAdmin = openAdmin;

  function setEditing(section) { editingSection = section; render(); }
  window.__setEditing = setEditing;

  async function saveAbout(newAbout, newRole) {
    state.about = newAbout; state.role = newRole; editingSection = null; render(); await saveData();
  }
  window.__saveAbout = saveAbout;

  function addSkillCategory() { state.skills.push({ category: 'New category', items: [] }); render(); }
  window.__addSkillCategory = addSkillCategory;
  function removeSkillCategory(idx) { state.skills.splice(idx, 1); render(); }
  window.__removeSkillCategory = removeSkillCategory;
  function renameSkillCategory(idx, val) { state.skills[idx].category = val; }
  window.__renameSkillCategory = renameSkillCategory;
  function addSkillItem(idx, input) {
    var val = input.value.trim(); if (!val) return;
    state.skills[idx].items.push(val); input.value = ''; render();
  }
  window.__addSkillItem = addSkillItem;
  function removeSkillItem(catIdx, itemIdx) { state.skills[catIdx].items.splice(itemIdx, 1); render(); }
  window.__removeSkillItem = removeSkillItem;
  async function saveSkills() { editingSection = null; render(); await saveData(); }
  window.__saveSkills = saveSkills;

  function newProjectDraft() { return { id: 'new', title: '', desc: '', tech: '', link: '' }; }
  function startEditProject(id) { editingProjectId = id; render(); }
  window.__startEditProject = startEditProject;
  function cancelEditProject() { editingProjectId = null; render(); }
  window.__cancelEditProject = cancelEditProject;

  async function saveProject(id, data) {
    var techArr = data.tech.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    if (id === 'new') {
      state.projects.push({ id: uid(), title: data.title || 'Untitled project', desc: data.desc, tech: techArr, link: data.link });
    } else {
      var p = state.projects.find(function (p) { return p.id === id; });
      if (p) { p.title = data.title; p.desc = data.desc; p.tech = techArr; p.link = data.link; }
    }
    editingProjectId = null; render(); await saveData();
  }
  window.__saveProject = saveProject;
  async function deleteProject(id) {
    state.projects = state.projects.filter(function (p) { return p.id !== id; });
    render(); await saveData();
  }
  window.__deleteProject = deleteProject;

  async function saveContact(data) { state.contact = data; editingSection = null; render(); await saveData(); }
  window.__saveContact = saveContact;

  function projectForm(proj) {
    return (
      '<div class="proj-item">' +
      '<label>Title</label><input type="text" id="pf-title" value="' + esc(proj.title) + '">' +
      '<label>Description</label><textarea id="pf-desc" style="min-height:70px">' + esc(proj.desc || '') + '</textarea>' +
      '<label>Tech used (comma separated)</label><input type="text" id="pf-tech" value="' + esc((proj.tech || []).join ? proj.tech.join(', ') : proj.tech || '') + '">' +
      '<label>Link (optional)</label><input type="text" id="pf-link" value="' + esc(proj.link || '') + '">' +
      '<div class="save-row">' +
      '<button class="btn btn-solid-light" onclick="__submitProjectForm(\'' + proj.id + '\')">Save project</button>' +
      '<button class="btn btn-ghost-light" onclick="__cancelEditProject()">Cancel</button>' +
      '</div>' +
      '</div>'
    );
  }
  window.__submitProjectForm = function (id) {
    var data = {
      title: document.getElementById('pf-title').value.trim(),
      desc: document.getElementById('pf-desc').value.trim(),
      tech: document.getElementById('pf-tech').value,
      link: document.getElementById('pf-link').value.trim()
    };
    saveProject(id, data);
  };

  function renderProjects() {
    var html = '<div class="sec-head"><h2 class="sec-title">Projects</h2>';
    if (isAdmin && editingProjectId === null) { html += '<button class="edit-toggle" onclick="__startEditProject(\'new\')">+ Add project</button>'; }
    html += '</div>';
    if (editingProjectId === 'new') { html += projectForm(newProjectDraft()); }
    if (state.projects.length === 0 && editingProjectId !== 'new') {
      html += '<div class="empty-state">No projects added yet' + (isAdmin ? ' — click "Add project" to add your first one.' : '.') + '</div>';
    } else {
      state.projects.forEach(function (p) {
        if (editingProjectId === p.id) { html += projectForm(p); return; }
        html += '<div class="proj-item">' +
          '<div class="proj-title">' + esc(p.title) + '</div>' +
          '<div class="proj-desc">' + esc(p.desc) + '</div>' +
          '<div class="proj-meta">' +
          (p.tech || []).map(function (t) { return '<span class="proj-tech">' + esc(t) + '</span>'; }).join('') +
          (p.link ? '<a class="proj-link" href="' + esc(p.link) + '" target="_blank" rel="noopener">View project</a>' : '') +
          '</div>' +
          (isAdmin ? '<div class="proj-actions">' +
            '<button class="mini-btn" onclick="__startEditProject(\'' + p.id + '\')">Edit</button>' +
            '<button class="mini-btn danger" onclick="__deleteProject(\'' + p.id + '\')">Delete</button>' +
            '</div>' : '') +
          '</div>';
      });
    }
    return html;
  }

  function renderSkills() {
    var html = '<div class="sec-head"><h2 class="sec-title">Skills</h2>';
    if (isAdmin) {
      html += editingSection === 'skills'
        ? '<button class="edit-toggle" onclick="__saveSkills()">Done</button>'
        : '<button class="edit-toggle" onclick="__setEditing(\'skills\')">Edit</button>';
    }
    html += '</div>';
    state.skills.forEach(function (cat, idx) {
      html += '<div class="skill-group">';
      if (editingSection === 'skills') {
        html += '<input type="text" class="skill-cat-input" value="' + esc(cat.category) + '" onchange="__renameSkillCategory(' + idx + ', this.value)">';
        html += '<div class="tag-row" style="margin-top:12px;">';
        cat.items.forEach(function (item, i2) {
          html += '<span class="tag removable">' + esc(item) + ' <span class="rm" onclick="__removeSkillItem(' + idx + ',' + i2 + ')">&times;</span></span>';
        });
        html += '</div>';
        html += '<div style="display:flex;gap:8px;margin-top:10px;">' +
          '<input type="text" placeholder="Add skill" id="new-skill-' + idx + '" style="max-width:220px;">' +
          '<button class="mini-btn" onclick="__addSkillItem(' + idx + ', document.getElementById(\'new-skill-' + idx + '\'))">Add</button>' +
          '<button class="mini-btn danger" onclick="__removeSkillCategory(' + idx + ')">Remove</button>' +
          '</div>';
      } else {
        html += '<div class="skill-cat">' + esc(cat.category) + '</div>';
        html += '<div class="tag-row">' + cat.items.map(function (i) { return '<span class="tag">' + esc(i) + '</span>'; }).join('') + '</div>';
      }
      html += '</div>';
    });
    if (editingSection === 'skills') { html += '<button class="btn-add" onclick="__addSkillCategory()">+ Add category</button>'; }
    return html;
  }

  function renderAbout() {
    var html = '<div class="sec-head"><h2 class="sec-title">About</h2>';
    if (isAdmin && editingSection !== 'about') { html += '<button class="edit-toggle" onclick="__setEditing(\'about\')">Edit</button>'; }
    html += '</div>';
    if (editingSection === 'about') {
      html += '<label>Tagline</label><input type="text" id="about-role" value="' + esc(state.role) + '">';
      html += '<label>About text</label><textarea id="about-text">' + esc(state.about) + '</textarea>';
      html += '<div class="save-row">' +
        '<button class="btn btn-solid-light" onclick="__saveAbout(document.getElementById(\'about-text\').value, document.getElementById(\'about-role\').value)">Save</button>' +
        '<button class="btn btn-ghost-light" onclick="__setEditing(null)">Cancel</button>' +
        '</div>';
    } else {
      html += '<p class="body-text">' + esc(state.about) + '</p>';
    }
    return html;
  }

  function renderContact() {
    var html = '<div class="sec-head"><h2 class="sec-title">Contact</h2>';
    if (isAdmin && editingSection !== 'contact') { html += '<button class="edit-toggle" onclick="__setEditing(\'contact\')">Edit</button>'; }
    html += '</div>';
    if (editingSection === 'contact') {
      html += '<label>Email</label><input type="text" id="c-email" value="' + esc(state.contact.email) + '">';
      html += '<label>GitHub URL</label><input type="text" id="c-github" value="' + esc(state.contact.github) + '">';
      html += '<label>LinkedIn URL</label><input type="text" id="c-linkedin" value="' + esc(state.contact.linkedin) + '">';
      html += '<label>Resume link</label><input type="text" id="c-resume" value="' + esc(state.contact.resume) + '">';
      html += '<div class="save-row">' +
        '<button class="btn btn-solid-light" onclick="__submitContact()">Save</button>' +
        '<button class="btn btn-ghost-light" onclick="__setEditing(null)">Cancel</button>' +
        '</div>';
    } else {
      html += '<div class="contact-grid">';
      if (state.contact.email) html += '<div class="contact-row"><span class="contact-label">Email</span><a href="mailto:' + esc(state.contact.email) + '">' + esc(state.contact.email) + '</a></div>';
      if (state.contact.github) html += '<div class="contact-row"><span class="contact-label">GitHub</span><a href="' + esc(state.contact.github) + '" target="_blank" rel="noopener">' + esc(state.contact.github) + '</a></div>';
      if (state.contact.linkedin) html += '<div class="contact-row"><span class="contact-label">LinkedIn</span><a href="' + esc(state.contact.linkedin) + '" target="_blank" rel="noopener">' + esc(state.contact.linkedin) + '</a></div>';
      if (state.contact.resume) html += '<div class="contact-row"><span class="contact-label">Resume</span><a href="' + esc(state.contact.resume) + '" target="_blank" rel="noopener">View resume</a></div>';
      if (!state.contact.email && !state.contact.github && !state.contact.linkedin && !state.contact.resume) {
        html += '<div class="empty-state">No contact details added yet' + (isAdmin ? ' — click Edit to add them.' : '.') + '</div>';
      }
      html += '</div>';
    }
    return html;
  }
  window.__submitContact = function () {
    saveContact({
      email: document.getElementById('c-email').value.trim(),
      github: document.getElementById('c-github').value.trim(),
      linkedin: document.getElementById('c-linkedin').value.trim(),
      resume: document.getElementById('c-resume').value.trim()
    });
  };

  function renderModal() {
    if (!modal) return '';
    if (modal === 'setup') {
      return '<div class="modal-overlay" onclick="if(event.target===this) __closeModal()">' +
        '<div class="modal">' +
        '<h3>Set up admin access</h3>' +
        '<p class="hint">Choose a password to protect editing. This is a light gate for a personal site, not bank-grade security — don\'t reuse an important password here.</p>' +
        '<label>New password</label><input type="password" id="setup-pass">' +
        '<label>Confirm password</label><input type="password" id="setup-confirm">' +
        '<div class="err" id="modal-err"></div>' +
        '<div class="save-row">' +
        '<button class="btn btn-solid-light" onclick="__handleSetup(document.getElementById(\'setup-pass\').value, document.getElementById(\'setup-confirm\').value)">Create password</button>' +
        '<button class="btn btn-ghost-light" onclick="__closeModal()">Cancel</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    }
    return '<div class="modal-overlay" onclick="if(event.target===this) __closeModal()">' +
      '<div class="modal">' +
      '<h3>Admin login</h3>' +
      '<p class="hint">Enter your password to edit the site.</p>' +
      '<label>Password</label><input type="password" id="login-pass" onkeydown="if(event.key===\'Enter\') __handleLogin(this.value)">' +
      '<div class="err" id="modal-err"></div>' +
      '<div class="save-row">' +
      '<button class="btn btn-solid-light" onclick="__handleLogin(document.getElementById(\'login-pass\').value)">Log in</button>' +
      '<button class="btn btn-ghost-light" onclick="__closeModal()">Cancel</button>' +
      '</div>' +
      '</div>' +
      '</div>';
  }

  function renderDock() {
    var html = '<nav class="dock" id="dock">';
    SECTIONS.forEach(function (s) {
      html += '<button class="dock-item' + (activeSection === s.id ? ' active' : '') + '" onclick="__scrollTo(\'' + s.id + '\')">' +
        '<span class="dock-arrow">&#9656;</span><span class="dock-label">' + s.label + '</span><span class="dock-dot"></span>' +
        '</button>';
    });
    html += '<div class="dock-divider"></div>';
    html += isAdmin
      ? '<button class="dock-item" onclick="__logout()"><span class="dock-arrow">&#9656;</span><span class="dock-label">Log out</span><span class="dock-dot"></span></button>'
      : '<button class="dock-item" onclick="__openAdmin()"><span class="dock-arrow">&#9656;</span><span class="dock-label">Admin</span><span class="dock-dot"></span></button>';
    html += '</nav>';
    return html;
  }

  function render() {
    var app = document.getElementById('app');
    app.className = '';
    var html = '';

    html += renderDock();

    html += '<section class="hero" id="home">' +
      '<h1 class="hero-name">' + esc(state.name) + '<span class="hero-cursor"></span></h1>' +
      '<p class="hero-role">' + esc(state.role) + '</p>' +
      '<div class="hero-ctas">' +
      '<a class="btn btn-solid-dark" href="javascript:void(0)" onclick="__scrollTo(\'projects\')">View projects</a>' +
      '<a class="btn btn-ghost-dark" href="javascript:void(0)" onclick="__scrollTo(\'contact\')">Get in touch</a>' +
      '</div>' +
      '</section>';

    html += '<section class="sec dark-alt reveal" id="about"><div class="sec-inner">' + renderAbout() + '</div></section>';
    html += '<section class="sec dark reveal" id="skills"><div class="sec-inner">' + renderSkills() + '</div></section>';
    html += '<section class="sec dark-alt reveal" id="projects"><div class="sec-inner">' + renderProjects() + '</div></section>';
    html += '<section class="sec dark reveal" id="contact"><div class="sec-inner">' + renderContact() + '</div></section>';

    html += '<footer>Built by ' + esc(state.name) + '</footer>';
    html += renderModal();

    app.innerHTML = html;

    if (modal) {
      var firstInput = document.getElementById('setup-pass') || document.getElementById('login-pass');
      if (firstInput) firstInput.focus();
    }

    setupDockMagnify();
    setupReveal();
  }

  // ---- Dock magnify (mac dock style, scoped to the dot only so labels never spill out) ----
  function setupDockMagnify() {
    var dock = document.getElementById('dock');
    if (!dock) return;
    var dots = Array.prototype.slice.call(dock.querySelectorAll('.dock-dot'));
    if (window.matchMedia('(hover: none)').matches) return; // skip on touch
    dock.addEventListener('mousemove', function (e) {
      dots.forEach(function (dot) {
        var rect = dot.getBoundingClientRect();
        var center = rect.top + rect.height / 2;
        var dist = Math.abs(e.clientY - center);
        var scale = 1 + Math.max(0, (50 - dist) / 50) * 1.6;
        dot.style.transform = 'scale(' + scale.toFixed(2) + ')';
      });
    });
    dock.addEventListener('mouseleave', function () {
      dots.forEach(function (dot) { dot.style.transform = 'scale(1)'; });
    });
  }

  // ---- Scroll spy ----
  function setupScrollSpy() {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          activeSection = entry.target.id;
          document.querySelectorAll('.dock-item').forEach(function (el, i) {
            if (i < SECTIONS.length) { el.classList.toggle('active', SECTIONS[i].id === activeSection); }
          });
        }
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    SECTIONS.forEach(function (s) {
      var el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
  }

  // ---- Ambient light: cursor parallax + gentle autonomous drift ----
  function setupAmbient() {
    var blobs = [
      { el: document.querySelector('.blob-a'), depth: 60, driftX: 40, driftY: 30, speed: 0.00021, phase: 0 },
      { el: document.querySelector('.blob-b'), depth: -70, driftX: 35, driftY: 45, speed: 0.00017, phase: 2 },
      { el: document.querySelector('.blob-c'), depth: 45, driftX: 50, driftY: 25, speed: 0.00025, phase: 4 }
    ];
    var glow = document.getElementById('cursor-glow');
    var mouseX = 0, mouseY = 0; // normalized -1..1
    function updateGlow(clientX, clientY) {
      if (!glow) return;
      glow.style.transform = 'translate3d(' + clientX + 'px,' + clientY + 'px,0)';
      glow.classList.add('on');
    }
    window.addEventListener('mousemove', function (e) {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.clientY / window.innerHeight) * 2 - 1;
      updateGlow(e.clientX, e.clientY);
    });
    window.addEventListener('mouseleave', function () { if (glow) glow.classList.remove('on'); });
    window.addEventListener('touchmove', function (e) {
      if (!e.touches || !e.touches[0]) return;
      mouseX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.touches[0].clientY / window.innerHeight) * 2 - 1;
      updateGlow(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function tick(t) {
      blobs.forEach(function (b) {
        if (!b.el) return;
        var driftX = reduceMotion ? 0 : Math.sin(t * b.speed + b.phase) * b.driftX;
        var driftY = reduceMotion ? 0 : Math.cos(t * b.speed * 0.8 + b.phase) * b.driftY;
        var parX = mouseX * b.depth;
        var parY = mouseY * b.depth;
        b.el.style.transform = 'translate3d(' + (driftX + parX).toFixed(1) + 'px,' + (driftY + parY).toFixed(1) + 'px,0)';
      });
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  function setupReveal() {
    var els = document.querySelectorAll('.reveal:not(.in)');
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.15 });
    els.forEach(function (el) { obs.observe(el); });
  }

  loadData();
})();
