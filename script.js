/* =========================================================
   HackHub - Hackathon Management Platform
   Plain JavaScript + LocalStorage (no libraries, no backend)
   ========================================================= */

/* ---------- Settings ---------- */
var ORGANIZER_PASSWORD = "admin123";   // password for the Organizer Panel
var MAX_TEAM_SIZE = 4;

var KEYS = {
  users: "hh_users",
  teams: "hh_teams",
  subs: "hh_submissions",
  scores: "hh_scores",
  announcements: "hh_announcements",
  session: "hh_current_user",
  organizer: "hh_organizer_logged_in"
};

var PROBLEMS = [
  { id: 1, title: "Smart Campus Attendance", description: "Build a system that marks and tracks student attendance automatically and gives teachers simple reports." },
  { id: 2, title: "Waste Management Tracker", description: "Create a solution that helps cities or campuses monitor waste collection and encourage recycling." },
  { id: 3, title: "Mental Wellness Companion", description: "Design a tool that helps students track their mood, reduce stress and find support resources." },
  { id: 4, title: "Local Farmer Marketplace", description: "Build a platform that connects local farmers directly with buyers and shows fair market prices." },
  { id: 5, title: "Disaster Alert and Relief", description: "Develop a way to send timely disaster alerts and coordinate help between volunteers and affected people." },
  { id: 6, title: "Personal Finance for Students", description: "Make an easy app that helps students plan budgets, track spending and build saving habits." }
];

/* ---------- LocalStorage helpers ---------- */
function load(key, fallback) {
  try {
    var value = JSON.parse(localStorage.getItem(key));
    return value === null || value === undefined ? fallback : value;
  } catch (e) {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getUsers()         { return load(KEYS.users, []); }
function getTeams()         { return load(KEYS.teams, []); }
function getSubmissions()   { return load(KEYS.subs, []); }
function getScores()        { return load(KEYS.scores, {}); }
function getAnnouncements() { return load(KEYS.announcements, []); }

function getCurrentUser() {
  var id = load(KEYS.session, null);
  if (!id) return null;
  var users = getUsers();
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === id) return users[i];
  }
  return null;
}

function isOrganizer() {
  return load(KEYS.organizer, false) === true;
}

function getUserById(id) {
  var users = getUsers();
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === id) return users[i];
  }
  return null;
}

function getTeamById(id) {
  var teams = getTeams();
  for (var i = 0; i < teams.length; i++) {
    if (teams[i].id === id) return teams[i];
  }
  return null;
}

function getProblemById(id) {
  for (var i = 0; i < PROBLEMS.length; i++) {
    if (PROBLEMS[i].id === id) return PROBLEMS[i];
  }
  return null;
}

function getSubmissionByTeam(teamId) {
  var subs = getSubmissions();
  for (var i = 0; i < subs.length; i++) {
    if (subs[i].teamId === teamId) return subs[i];
  }
  return null;
}

function getUserTeam(user) {
  if (!user || !user.teamId) return null;
  return getTeamById(user.teamId);
}

/* ---------- Small utilities ---------- */
function $(id) { return document.getElementById(id); }

// Prevents user text from being treated as HTML
function esc(text) {
  var div = document.createElement("div");
  div.textContent = String(text === undefined || text === null ? "" : text);
  return div.innerHTML;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUrl(url) {
  return /^https?:\/\/[^\s]+\.[^\s]+$/i.test(url);
}

var toastTimer = null;
function showToast(message, isError) {
  var toast = $("toast");
  toast.textContent = message;
  toast.className = "toast" + (isError ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.className = "toast hidden";
  }, 3000);
}

function calcTotal(score) {
  return score.innovation + score.technical + score.problem + score.presentation;
}

/* =========================================================
   NAVIGATION
   ========================================================= */
var currentPage = "home";
var PROTECTED_PAGES = ["dashboard", "teams", "problems", "submit"];

function renderNav() {
  var user = getCurrentUser();
  var links = [
    ["home", "Home"],
    ["dashboard", "Dashboard"],
    ["teams", "Teams"],
    ["problems", "Problems"],
    ["submit", "Submission"],
    ["leaderboard", "Leaderboard"],
    ["announcements", "Announcements"],
    ["organizer", "Organizer"]
  ];

  var html = "";
  for (var i = 0; i < links.length; i++) {
    var active = links[i][0] === currentPage ? " active" : "";
    html += '<a href="#" class="' + active + '" data-page="' + links[i][0] + '">' + links[i][1] + "</a>";
  }

  if (user) {
    html += '<a href="#" data-action="logout">Logout (' + esc(user.name.split(" ")[0]) + ")</a>";
  } else {
    var authActive = currentPage === "auth" ? " active" : "";
    html += '<a href="#" class="' + authActive + '" data-page="auth">Login / Register</a>';
  }

  $("nav-links").innerHTML = html;
}

function showPage(name) {
  // Pages that need a logged-in participant
  if (PROTECTED_PAGES.indexOf(name) !== -1 && !getCurrentUser()) {
    showToast("Please login first.", true);
    name = "auth";
  }

  currentPage = name;

  var pages = document.querySelectorAll(".page");
  for (var i = 0; i < pages.length; i++) {
    pages[i].classList.add("hidden");
  }
  $("page-" + name).classList.remove("hidden");

  $("nav-links").classList.remove("open");
  renderPage(name);
  renderNav();
  window.scrollTo(0, 0);

  try { history.replaceState(null, "", "#" + name); } catch (e) { /* ignore */ }
}

function renderPage(name) {
  if (name === "home") renderHome();
  else if (name === "dashboard") renderDashboard();
  else if (name === "teams") renderTeams();
  else if (name === "problems") renderProblems();
  else if (name === "submit") renderSubmit();
  else if (name === "leaderboard") renderLeaderboard();
  else if (name === "announcements") renderAnnouncements();
  else if (name === "organizer") renderOrganizer();
}

/* =========================================================
   ANNOUNCEMENT HTML (used on several pages)
   ========================================================= */
function announcementsHtml(limit) {
  var list = getAnnouncements();
  if (list.length === 0) {
    return '<div class="card"><p class="muted">No announcements yet.</p></div>';
  }
  var html = "";
  var count = limit ? Math.min(limit, list.length) : list.length;
  for (var i = 0; i < count; i++) {
    var a = list[i];
    html += '<div class="card announcement">' +
      "<h3>" + esc(a.title) + "</h3>" +
      "<p>" + esc(a.message) + "</p>" +
      "<small>" + formatDate(a.date) + "</small></div>";
  }
  return html;
}

/* =========================================================
   HOME
   ========================================================= */
function renderHome() {
  var user = getCurrentUser();
  $("hero-buttons").innerHTML = user
    ? '<button class="btn" data-page="dashboard">Go to Dashboard</button>' +
      '<button class="btn outline" data-page="leaderboard">View Leaderboard</button>'
    : '<button class="btn" data-page="auth">Register / Login</button>' +
      '<button class="btn outline" data-page="leaderboard">View Leaderboard</button>';

  $("stat-participants").textContent = getUsers().length;
  $("stat-teams").textContent = getTeams().length;
  $("stat-projects").textContent = getSubmissions().length;
  $("home-announcements").innerHTML = announcementsHtml(3);
}

/* =========================================================
   REGISTER / LOGIN / LOGOUT
   ========================================================= */
function showLoginTab() {
  $("login-form").classList.remove("hidden");
  $("register-form").classList.add("hidden");
  $("tab-login").classList.add("active");
  $("tab-register").classList.remove("active");
}

function showRegisterTab() {
  $("register-form").classList.remove("hidden");
  $("login-form").classList.add("hidden");
  $("tab-register").classList.add("active");
  $("tab-login").classList.remove("active");
}

function handleRegister(e) {
  e.preventDefault();
  var name = $("reg-name").value.trim();
  var email = $("reg-email").value.trim().toLowerCase();
  var college = $("reg-college").value.trim();
  var password = $("reg-password").value;

  if (!name || !email || !college || !password) {
    showToast("Please fill in all fields.", true);
    return;
  }
  if (!isValidEmail(email)) {
    showToast("Please enter a valid email address.", true);
    return;
  }
  if (password.length < 6) {
    showToast("Password must be at least 6 characters.", true);
    return;
  }

  var users = getUsers();
  for (var i = 0; i < users.length; i++) {
    if (users[i].email === email) {
      showToast("This email is already registered.", true);
      return;
    }
  }

  var user = {
    id: "U" + Date.now(),
    name: name,
    email: email,
    college: college,
    password: password,
    teamId: null
  };
  users.push(user);
  save(KEYS.users, users);
  save(KEYS.session, user.id);

  $("register-form").reset();
  showToast("Registration successful! Welcome, " + name + ".");
  showPage("dashboard");
}

function handleLogin(e) {
  e.preventDefault();
  var email = $("login-email").value.trim().toLowerCase();
  var password = $("login-password").value;

  if (!email || !password) {
    showToast("Please enter email and password.", true);
    return;
  }

  var users = getUsers();
  for (var i = 0; i < users.length; i++) {
    if (users[i].email === email && users[i].password === password) {
      save(KEYS.session, users[i].id);
      $("login-form").reset();
      showToast("Welcome back, " + users[i].name + "!");
      showPage("dashboard");
      return;
    }
  }
  showToast("Incorrect email or password.", true);
}

function handleLogout() {
  localStorage.removeItem(KEYS.session);
  showToast("You have been logged out.");
  showPage("home");
}

/* =========================================================
   DASHBOARD
   ========================================================= */
function renderDashboard() {
  var user = getCurrentUser();
  if (!user) return;

  var team = getUserTeam(user);
  var teamHtml, problemHtml, submissionHtml;

  if (team) {
    var leader = getUserById(team.leaderId);
    teamHtml = "<p><strong>" + esc(team.name) + "</strong> (ID: " + esc(team.id) + ")</p>" +
      "<p class='muted'>Leader: " + esc(leader ? leader.name : "Unknown") +
      " &bull; Members: " + team.members.length + "/" + MAX_TEAM_SIZE + "</p>";

    var problem = team.problemId ? getProblemById(team.problemId) : null;
    problemHtml = problem
      ? "<p><strong>" + esc(problem.title) + "</strong></p>"
      : "<p class='muted'>No problem statement selected yet.</p>";

    var sub = getSubmissionByTeam(team.id);
    var score = getScores()[team.id];
    if (sub) {
      submissionHtml = "<p><strong>" + esc(sub.title) + "</strong></p>" +
        "<p class='muted'>" + (score ? "Judged &mdash; total score: " + calcTotal(score) + "/100" : "Submitted, waiting to be judged.") + "</p>";
    } else {
      submissionHtml = "<p class='muted'>No project submitted yet.</p>";
    }
  } else {
    teamHtml = "<p class='muted'>You are not in a team yet.</p>" +
      '<button class="btn small" data-page="teams">Create or Join a Team</button>';
    problemHtml = "<p class='muted'>Join a team to choose a problem statement.</p>";
    submissionHtml = "<p class='muted'>Join a team to submit a project.</p>";
  }

  $("dashboard-content").innerHTML =
    '<div class="card"><h2>Hello, ' + esc(user.name) + "</h2>" +
    "<p class='muted'>" + esc(user.email) + " &bull; " + esc(user.college) + "</p></div>" +
    '<div class="grid grid-3">' +
      '<div class="card"><h3>My Team</h3>' + teamHtml + "</div>" +
      '<div class="card"><h3>Problem Statement</h3>' + problemHtml + "</div>" +
      '<div class="card"><h3>My Project</h3>' + submissionHtml + "</div>" +
    "</div>" +
    '<h2 class="section-title">Latest Announcements</h2>' + announcementsHtml(3);
}

/* =========================================================
   TEAMS
   ========================================================= */
function renderTeams() {
  var user = getCurrentUser();
  if (!user) return;

  var team = getUserTeam(user);
  var html = "";

  if (team) {
    var leader = getUserById(team.leaderId);
    var rows = "";
    for (var i = 0; i < team.members.length; i++) {
      var m = getUserById(team.members[i]);
      if (!m) continue;
      rows += "<tr><td>" + esc(m.name) + "</td><td>" + esc(m.email) + "</td><td>" + esc(m.college) + "</td><td>" +
        (m.id === team.leaderId ? '<span class="badge green">Leader</span>' : "Member") + "</td></tr>";
    }
    html += '<div class="card"><h2>' + esc(team.name) + "</h2>" +
      "<p>Team ID: <strong>" + esc(team.id) + "</strong> <span class='muted'>(share this ID so others can join)</span></p>" +
      "<p>Team Leader: <strong>" + esc(leader ? leader.name : "Unknown") + "</strong></p>" +
      '<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>College</th><th>Role</th></tr></thead><tbody>' +
      rows + "</tbody></table></div></div>";
  } else {
    html += '<div class="grid grid-2">' +
      '<form id="create-team-form" class="card" novalidate><h2>Create a Team</h2>' +
        '<label for="team-name">Team Name</label>' +
        '<input type="text" id="team-name" placeholder="e.g. Code Warriors">' +
        '<button type="submit" class="btn full">Create Team</button></form>' +
      '<form id="join-team-form" class="card" novalidate><h2>Join a Team</h2>' +
        '<label for="team-id">Team ID</label>' +
        '<input type="text" id="team-id" placeholder="e.g. T1001">' +
        '<button type="submit" class="btn full">Join Team</button></form>' +
      "</div>";
  }

  // List of all teams
  var teams = getTeams();
  var allRows = "";
  for (var j = 0; j < teams.length; j++) {
    var t = teams[j];
    var l = getUserById(t.leaderId);
    allRows += "<tr><td>" + esc(t.id) + "</td><td>" + esc(t.name) + "</td><td>" + esc(l ? l.name : "Unknown") +
      "</td><td>" + t.members.length + "/" + MAX_TEAM_SIZE + "</td></tr>";
  }
  html += '<h2 class="section-title">All Teams</h2><div class="card"><div class="table-wrap">';
  if (teams.length === 0) {
    html += "<p class='muted'>No teams created yet.</p>";
  } else {
    html += "<table><thead><tr><th>Team ID</th><th>Team Name</th><th>Leader</th><th>Members</th></tr></thead><tbody>" +
      allRows + "</tbody></table>";
  }
  html += "</div></div>";

  $("teams-content").innerHTML = html;
}

function handleCreateTeam(e) {
  e.preventDefault();
  var user = getCurrentUser();
  var name = $("team-name").value.trim();

  if (!name) {
    showToast("Please enter a team name.", true);
    return;
  }
  if (name.length < 3) {
    showToast("Team name must be at least 3 characters.", true);
    return;
  }

  var teams = getTeams();
  for (var i = 0; i < teams.length; i++) {
    if (teams[i].name.toLowerCase() === name.toLowerCase()) {
      showToast("A team with this name already exists.", true);
      return;
    }
  }

  var team = {
    id: "T" + (1001 + teams.length),
    name: name,
    leaderId: user.id,
    members: [user.id],
    problemId: null
  };
  teams.push(team);
  save(KEYS.teams, teams);

  setUserTeam(user.id, team.id);
  showToast("Team created! Your Team ID is " + team.id);
  renderTeams();
}

function handleJoinTeam(e) {
  e.preventDefault();
  var user = getCurrentUser();
  var teamId = $("team-id").value.trim().toUpperCase();

  if (!teamId) {
    showToast("Please enter a Team ID.", true);
    return;
  }

  var teams = getTeams();
  for (var i = 0; i < teams.length; i++) {
    if (teams[i].id === teamId) {
      if (teams[i].members.length >= MAX_TEAM_SIZE) {
        showToast("This team is full (max " + MAX_TEAM_SIZE + " members).", true);
        return;
      }
      teams[i].members.push(user.id);
      save(KEYS.teams, teams);
      setUserTeam(user.id, teamId);
      showToast("You joined " + teams[i].name + "!");
      renderTeams();
      return;
    }
  }
  showToast("No team found with this ID.", true);
}

function setUserTeam(userId, teamId) {
  var users = getUsers();
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === userId) users[i].teamId = teamId;
  }
  save(KEYS.users, users);
}

/* =========================================================
   PROBLEM STATEMENTS
   ========================================================= */
function renderProblems() {
  var user = getCurrentUser();
  if (!user) return;

  var team = getUserTeam(user);
  var isLeader = team && team.leaderId === user.id;

  if (!team) {
    $("problems-note").textContent = "Join or create a team to select a problem statement.";
  } else if (!isLeader) {
    $("problems-note").textContent = "Only your team leader can select the problem statement.";
  } else {
    $("problems-note").textContent = "As team leader, choose one problem statement for your team.";
  }

  var html = "";
  for (var i = 0; i < PROBLEMS.length; i++) {
    var p = PROBLEMS[i];
    var selected = team && team.problemId === p.id;
    var button = "";
    if (selected) {
      button = '<span class="badge green">Selected by your team</span>';
    } else if (isLeader) {
      button = '<button class="btn small" data-action="select-problem" data-id="' + p.id + '">Select</button>';
    }
    html += '<div class="card"><span class="badge">Problem ' + p.id + "</span>" +
      "<h3>" + esc(p.title) + "</h3><p class='muted'>" + esc(p.description) + "</p>" + button + "</div>";
  }
  $("problems-content").innerHTML = html;
}

function selectProblem(problemId) {
  var user = getCurrentUser();
  var teams = getTeams();
  for (var i = 0; i < teams.length; i++) {
    if (teams[i].id === user.teamId && teams[i].leaderId === user.id) {
      teams[i].problemId = problemId;
      save(KEYS.teams, teams);
      showToast("Problem statement selected.");
      renderProblems();
      return;
    }
  }
  showToast("Only a team leader can select a problem.", true);
}

/* =========================================================
   PROJECT SUBMISSION
   ========================================================= */
function renderSubmit() {
  var user = getCurrentUser();
  if (!user) return;

  var team = getUserTeam(user);
  var html = "";

  if (!team) {
    html = '<div class="card"><p class="muted">You need to be in a team to submit a project.</p>' +
      '<button class="btn small" data-page="teams">Go to Teams</button></div>';
  } else if (!team.problemId) {
    html = '<div class="card"><p class="muted">Your team leader must select a problem statement first.</p>' +
      '<button class="btn small" data-page="problems">Go to Problem Statements</button></div>';
  } else {
    var existing = getSubmissionByTeam(team.id);
    var problem = getProblemById(team.problemId);
    html = '<form id="submit-form" class="card" novalidate>' +
      "<h2>" + (existing ? "Update Your Submission" : "Submit Your Project") + "</h2>" +
      "<p class='muted'>Team: " + esc(team.name) + " &bull; Problem: " + esc(problem.title) + "</p>" +
      '<label for="project-title">Project Title</label>' +
      '<input type="text" id="project-title" value="' + esc(existing ? existing.title : "") + '">' +
      '<label for="project-desc">Project Description</label>' +
      '<textarea id="project-desc">' + esc(existing ? existing.description : "") + "</textarea>" +
      '<label for="project-github">GitHub Repository Link</label>' +
      '<input type="text" id="project-github" placeholder="https://github.com/username/repo" value="' + esc(existing ? existing.github : "") + '">' +
      '<label for="project-demo">Live Demo Link (optional)</label>' +
      '<input type="text" id="project-demo" placeholder="https://..." value="' + esc(existing ? existing.demo : "") + '">' +
      '<button type="submit" class="btn full">' + (existing ? "Update Project" : "Submit Project") + "</button></form>";
  }
  $("submit-content").innerHTML = html;

  // All submitted projects
  var subs = getSubmissions();
  var cards = "";
  if (subs.length === 0) {
    cards = '<div class="card"><p class="muted">No projects submitted yet.</p></div>';
  }
  for (var i = 0; i < subs.length; i++) {
    cards += projectCardHtml(subs[i], false);
  }
  $("submitted-projects").innerHTML = cards;
}

function projectCardHtml(sub, forOrganizer) {
  var team = getTeamById(sub.teamId);
  var problem = team && team.problemId ? getProblemById(team.problemId) : null;
  var html = '<div class="card">' +
    '<span class="badge">' + esc(team ? team.name : "Unknown team") + "</span>" +
    "<h3>" + esc(sub.title) + "</h3>" +
    "<p class='muted'>" + esc(sub.description) + "</p>";
  if (problem) html += "<p><small class='muted'>Problem: " + esc(problem.title) + "</small></p>";
  html += '<p><a href="' + esc(sub.github) + '" target="_blank" rel="noopener">GitHub Repository</a>';
  if (sub.demo) html += ' &bull; <a href="' + esc(sub.demo) + '" target="_blank" rel="noopener">Live Demo</a>';
  html += "</p>";
  if (!forOrganizer) html += "<small class='muted'>Submitted: " + formatDate(sub.date) + "</small>";
  return html + (forOrganizer ? "" : "</div>");
}

function handleSubmitProject(e) {
  e.preventDefault();
  var user = getCurrentUser();
  var team = getUserTeam(user);
  if (!team) return;

  var title = $("project-title").value.trim();
  var description = $("project-desc").value.trim();
  var github = $("project-github").value.trim();
  var demo = $("project-demo").value.trim();

  if (!title || !description || !github) {
    showToast("Title, description and GitHub link are required.", true);
    return;
  }
  if (description.length < 20) {
    showToast("Description should be at least 20 characters.", true);
    return;
  }
  if (!isValidUrl(github) || github.toLowerCase().indexOf("github.com") === -1) {
    showToast("Enter a valid GitHub link (https://github.com/...).", true);
    return;
  }
  if (demo && !isValidUrl(demo)) {
    showToast("Demo link must start with http:// or https://", true);
    return;
  }

  var subs = getSubmissions();
  var found = false;
  for (var i = 0; i < subs.length; i++) {
    if (subs[i].teamId === team.id) {
      subs[i].title = title;
      subs[i].description = description;
      subs[i].github = github;
      subs[i].demo = demo;
      subs[i].date = new Date().toISOString();
      found = true;
    }
  }
  if (!found) {
    subs.push({
      teamId: team.id,
      title: title,
      description: description,
      github: github,
      demo: demo,
      date: new Date().toISOString()
    });
  }
  save(KEYS.subs, subs);
  showToast("Project saved successfully!");
  renderSubmit();
}

/* =========================================================
   LEADERBOARD
   ========================================================= */
function buildLeaderboard() {
  var subs = getSubmissions();
  var scores = getScores();
  var judged = [];
  var pending = [];

  for (var i = 0; i < subs.length; i++) {
    var team = getTeamById(subs[i].teamId);
    var row = {
      teamName: team ? team.name : "Unknown",
      projectTitle: subs[i].title,
      total: null
    };
    if (scores[subs[i].teamId]) {
      row.total = calcTotal(scores[subs[i].teamId]);
      judged.push(row);
    } else {
      pending.push(row);
    }
  }

  // Highest score first
  judged.sort(function (a, b) { return b.total - a.total; });
  return { judged: judged, pending: pending };
}

function renderLeaderboard() {
  var data = buildLeaderboard();
  var html = '<div class="card"><div class="table-wrap">';

  if (data.judged.length === 0 && data.pending.length === 0) {
    html += "<p class='muted'>No projects have been submitted yet.</p>";
  } else {
    html += "<table><thead><tr><th>Rank</th><th>Team Name</th><th>Project Name</th><th>Total Score</th></tr></thead><tbody>";
    for (var i = 0; i < data.judged.length; i++) {
      var r = data.judged[i];
      html += '<tr class="' + (i === 0 ? "rank-1" : "") + '"><td>' + (i + 1) + "</td><td>" + esc(r.teamName) +
        "</td><td>" + esc(r.projectTitle) + "</td><td>" + r.total + " / 100</td></tr>";
    }
    for (var j = 0; j < data.pending.length; j++) {
      var p = data.pending[j];
      html += "<tr><td>-</td><td>" + esc(p.teamName) + "</td><td>" + esc(p.projectTitle) +
        "</td><td class='muted'>Not judged yet</td></tr>";
    }
    html += "</tbody></table>";
  }
  html += "</div></div>";
  $("leaderboard-content").innerHTML = html;
}

/* =========================================================
   ANNOUNCEMENTS PAGE
   ========================================================= */
function renderAnnouncements() {
  $("announcements-content").innerHTML = announcementsHtml();
}

/* =========================================================
   ORGANIZER PANEL
   ========================================================= */
function renderOrganizer() {
  if (!isOrganizer()) {
    $("organizer-content").innerHTML =
      '<form id="organizer-login-form" class="card auth-wrap" novalidate>' +
      "<h2>Organizer Login</h2>" +
      "<p class='muted'>Enter the organizer password to continue. (Demo password: " + ORGANIZER_PASSWORD + ")</p>" +
      '<label for="organizer-password">Password</label>' +
      '<input type="password" id="organizer-password" placeholder="Organizer password">' +
      '<button type="submit" class="btn full">Login as Organizer</button></form>';
    return;
  }

  var html = '<div class="btn-row" style="justify-content:flex-end;margin-bottom:12px;">' +
    '<button class="btn outline small" data-action="organizer-logout">Organizer Logout</button></div>';

  // --- Announcements ---
  html += '<form id="announcement-form" class="card" novalidate><h2>Post an Announcement</h2>' +
    '<label for="ann-title">Title</label><input type="text" id="ann-title" placeholder="Announcement title">' +
    '<label for="ann-message">Message</label><textarea id="ann-message" placeholder="Write your message"></textarea>' +
    '<button type="submit" class="btn full">Post Announcement</button></form>';

  var anns = getAnnouncements();
  html += "<h3>Posted Announcements</h3>";
  if (anns.length === 0) {
    html += '<div class="card"><p class="muted">No announcements posted.</p></div>';
  }
  for (var a = 0; a < anns.length; a++) {
    html += '<div class="card announcement"><h3>' + esc(anns[a].title) + "</h3><p>" + esc(anns[a].message) + "</p>" +
      "<small>" + formatDate(anns[a].date) + "</small><br><br>" +
      '<button class="btn danger small" data-action="delete-announcement" data-id="' + anns[a].id + '">Delete</button></div>';
  }

  // --- Judging ---
  html += '<h2 class="section-title">Judge Projects</h2>';
  var subs = getSubmissions();
  var scores = getScores();

  if (subs.length === 0) {
    html += '<div class="card"><p class="muted">No projects have been submitted yet.</p></div>';
  } else {
    html += '<div class="grid grid-2">';
    for (var i = 0; i < subs.length; i++) {
      var s = scores[subs[i].teamId] || { innovation: "", technical: "", problem: "", presentation: "" };
      var total = scores[subs[i].teamId] ? calcTotal(s) : 0;
      html += projectCardHtml(subs[i], true) +
        '<div class="score-grid" data-team="' + subs[i].teamId + '">' +
          scoreInput("Innovation", "innovation", s.innovation) +
          scoreInput("Technical", "technical", s.technical) +
          scoreInput("Problem Solving", "problem", s.problem) +
          scoreInput("Presentation", "presentation", s.presentation) +
        "</div>" +
        '<p class="total-line">Total: <strong class="total-value">' + total + "</strong> / 100</p>" +
        '<button class="btn small" data-action="save-score" data-team="' + subs[i].teamId + '">Save Marks</button>' +
        "</div>";
    }
    html += "</div>";
  }

  $("organizer-content").innerHTML = html;
}

function scoreInput(label, field, value) {
  return "<div><label>" + label + " (0-25)</label>" +
    '<input type="number" min="0" max="25" step="1" class="score-input" data-field="' + field + '" value="' + esc(value) + '"></div>';
}

function handleOrganizerLogin(e) {
  e.preventDefault();
  if ($("organizer-password").value === ORGANIZER_PASSWORD) {
    save(KEYS.organizer, true);
    showToast("Organizer login successful.");
    renderOrganizer();
  } else {
    showToast("Incorrect organizer password.", true);
  }
}

function organizerLogout() {
  localStorage.removeItem(KEYS.organizer);
  showToast("Organizer logged out.");
  renderOrganizer();
}

function handleAnnouncement(e) {
  e.preventDefault();
  var title = $("ann-title").value.trim();
  var message = $("ann-message").value.trim();

  if (!title || !message) {
    showToast("Please enter both title and message.", true);
    return;
  }

  var anns = getAnnouncements();
  anns.unshift({ id: "A" + Date.now(), title: title, message: message, date: new Date().toISOString() });
  save(KEYS.announcements, anns);
  showToast("Announcement posted.");
  renderOrganizer();
}

function deleteAnnouncement(id) {
  var anns = getAnnouncements().filter(function (a) { return a.id !== id; });
  save(KEYS.announcements, anns);
  showToast("Announcement deleted.");
  renderOrganizer();
}

function saveScore(teamId, button) {
  var box = button.closest(".card");
  var inputs = box.querySelectorAll(".score-input");
  var score = {};

  for (var i = 0; i < inputs.length; i++) {
    var raw = inputs[i].value.trim();
    var num = Number(raw);
    if (raw === "" || isNaN(num) || num < 0 || num > 25 || Math.floor(num) !== num) {
      showToast("Each mark must be a whole number from 0 to 25.", true);
      return;
    }
    score[inputs[i].dataset.field] = num;
  }

  var scores = getScores();
  scores[teamId] = score;
  save(KEYS.scores, scores);
  showToast("Marks saved. Total: " + calcTotal(score) + "/100");
  renderOrganizer();
}

// Live total while typing marks
function updateLiveTotal(input) {
  var box = input.closest(".card");
  var inputs = box.querySelectorAll(".score-input");
  var total = 0;
  for (var i = 0; i < inputs.length; i++) {
    var n = Number(inputs[i].value);
    if (!isNaN(n)) total += Math.min(Math.max(n, 0), 25);
  }
  box.querySelector(".total-value").textContent = total;
}

/* =========================================================
   EVENT LISTENERS
   ========================================================= */
document.addEventListener("click", function (e) {
  var pageLink = e.target.closest("[data-page]");
  if (pageLink) {
    e.preventDefault();
    showPage(pageLink.dataset.page);
    return;
  }

  var actionBtn = e.target.closest("[data-action]");
  if (!actionBtn) return;
  e.preventDefault();

  var action = actionBtn.dataset.action;
  if (action === "logout") handleLogout();
  else if (action === "show-login") showLoginTab();
  else if (action === "show-register") showRegisterTab();
  else if (action === "select-problem") selectProblem(Number(actionBtn.dataset.id));
  else if (action === "organizer-logout") organizerLogout();
  else if (action === "delete-announcement") deleteAnnouncement(actionBtn.dataset.id);
  else if (action === "save-score") saveScore(actionBtn.dataset.team, actionBtn);
});

// Forms are created dynamically, so listen on the document
document.addEventListener("submit", function (e) {
  var id = e.target.id;
  if (id === "register-form") handleRegister(e);
  else if (id === "login-form") handleLogin(e);
  else if (id === "create-team-form") handleCreateTeam(e);
  else if (id === "join-team-form") handleJoinTeam(e);
  else if (id === "submit-form") handleSubmitProject(e);
  else if (id === "organizer-login-form") handleOrganizerLogin(e);
  else if (id === "announcement-form") handleAnnouncement(e);
});

document.addEventListener("input", function (e) {
  if (e.target.classList.contains("score-input")) updateLiveTotal(e.target);
});

$("menu-btn").addEventListener("click", function () {
  $("nav-links").classList.toggle("open");
});

/* ---------- Start the app ---------- */
(function init() {
  var start = window.location.hash.replace("#", "");
  var valid = ["home", "auth", "dashboard", "teams", "problems", "submit", "leaderboard", "announcements", "organizer"];
  showPage(valid.indexOf(start) !== -1 ? start : "home");
})();
