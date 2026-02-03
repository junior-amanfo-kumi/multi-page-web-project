(() => {
  "use strict";

  // -----------------------------
  // Storage keys + helpers
  // -----------------------------
  const LS = {
    USERS: "cto_users_v1",
    SESSION: "cto_session_v1",
    POSTS: "cto_posts_v1",
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function uid() {
    // Small unique ID good enough for local demo
    return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
  }

  function msgBox(el, text, type) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.remove("show", "ok", "bad");
    if (!text) return;
    el.classList.add("show");
    if (type === "ok") el.classList.add("ok");
    if (type === "bad") el.classList.add("bad");
  }

  function escapeHTML(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // -----------------------------
  // "Auth" (client-side demo)
  // -----------------------------
  function getUsers() {
    return load(LS.USERS, []);
  }
  function setUsers(users) {
    save(LS.USERS, users);
  }

  function getSession() {
    return load(LS.SESSION, null);
  }
  function setSession(sessionObjOrNull) {
    save(LS.SESSION, sessionObjOrNull);
  }

  function currentUser() {
    const s = getSession();
    return s && s.username ? s.username : null;
  }

  function pseudoHash(pw) {
    // NOTE: not real security;is client-side only. For demo purposes.
    return btoa(unescape(encodeURIComponent(pw)));
  }

  function registerUser(username, password) {
    const users = getUsers();
    const exists = users.some((u) => u.username.toLowerCase() === username.toLowerCase());
    if (exists) return { ok: false, error: "That username is already taken." };

    users.push({
      username,
      pw: pseudoHash(password),
      createdAt: nowISO(),
    });
    setUsers(users);
    return { ok: true };
  }

  function loginUser(username, password) {
    const users = getUsers();
    const u = users.find((x) => x.username.toLowerCase() === username.toLowerCase());
    if (!u) return { ok: false, error: "No such user. Please register first." };
    if (u.pw !== pseudoHash(password)) return { ok: false, error: "Incorrect password." };

    setSession({ username: u.username, loggedInAt: nowISO() });
    return { ok: true, username: u.username };
  }

  function logoutUser() {
    setSession(null);
  }

  // -----------------------------
  // Posts
  // -----------------------------
  function getPosts() {
    return load(LS.POSTS, []);
  }
  function setPosts(posts) {
    save(LS.POSTS, posts);
  }

  function addPost(post) {
    const posts = getPosts();
    posts.unshift(post); // newest first
    setPosts(posts);
  }

  function updatePost(postId, patch) {
    const posts = getPosts();
    const i = posts.findIndex((p) => p.id === postId);
    if (i === -1) return { ok: false, error: "Post not found." };
    posts[i] = { ...posts[i], ...patch, updatedAt: nowISO() };
    setPosts(posts);
    return { ok: true };
  }

  function deletePost(postId) {
    const posts = getPosts();
    const next = posts.filter((p) => p.id !== postId);
    setPosts(next);
    return { ok: true };
  }

  function matchesSearch(post, q) {
    if (!q) return true;
    const hay = [
      post.username,
      post.location,
      post.bird,
      post.activity,
      post.comments,
      post.dateObs,
      post.timeObs,
      String(post.duration),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  // -----------------------------
  // Shared UI bits across pages
  // -----------------------------
  function applyLoginPills() {
    const u = currentUser();
    const pill1 = $("#loggedInAs");
    const pill2 = $("#whoamiPill");
    const logoutBtn = $("#logoutBtn");
    const logoutBtn2 = $("#logoutBtn2");

    if (pill1) pill1.textContent = u ? `Logged in as: ${u}` : "Not logged in";
    if (pill2) pill2.textContent = u ? `Logged in as: ${u}` : "Not logged in";

    // Show/hide logout buttons if present
    [logoutBtn, logoutBtn2].forEach((btn) => {
      if (!btn) return;
      btn.style.display = u ? "inline-flex" : "none";
    });
  }

  function wireLogoutButtons() {
    const logoutBtn = $("#logoutBtn");
    const logoutBtn2 = $("#logoutBtn2");

    [logoutBtn, logoutBtn2].forEach((btn) => {
      if (!btn) return;
      btn.addEventListener("click", () => {
        logoutUser();
        applyLoginPills();
        // Friendly redirect: if you log out on posts/newpost, go to login
        const path = (location.pathname || "").toLowerCase();
        if (path.includes("posts") || path.includes("newpost")) {
          location.href = "login.html";
        } else {
          msgBox($("#loginMsg") || $("#postsMsg") || $("#postMsg"), "Logged out.", "ok");
        }
      });
    });
  }

  // Optional: gently enforce login for pages that need it
  function requireLoginFor(pageNames) {
    const u = currentUser();
    const path = (location.pathname || "").toLowerCase();
    const hit = pageNames.some((p) => path.includes(p));
    if (hit && !u) {
      // For Task 2 it’s okay to redirect; still “not wired” to server
      location.href = "login.html";
    }
  }

  // -----------------------------
  // Landing page behaviour
  // -----------------------------
  function initLanding() {
    const getStartedBtn = $("#getStartedBtn");
    if (getStartedBtn) {
      getStartedBtn.addEventListener("click", () => {
        // If logged in, go to posts; else go to register
        location.href = currentUser() ? "posts.html" : "register.html";
      });
    }

    // Footer action buttons
    const footerActions = $("#footerActions");
    if (footerActions) {
      footerActions.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const action = btn.getAttribute("data-action");
        if (action === "report") {
          location.href = currentUser() ? "newpost.html" : "login.html";
        } else if (action === "view") {
          location.href = "posts.html";
        } else if (action === "learn") {
          alert(
            "This is just there for fun."
          );
        }
      });
    }
  }

  // -----------------------------
  // Register page behaviour
  // -----------------------------
  function initRegister() {
    const form = $("#registerForm");
    const msg = $("#registerMsg");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      msgBox(msg, "", "");

      const username = ($("#regUsername")?.value || "").trim();
      const password = $("#regPassword")?.value || "";
      const confirm = $("#regConfirm")?.value || "";

      // Basic validation 
      if (username.length < 3 || username.length > 20) {
        return msgBox(msg, "Username must be 3–20 characters.", "bad");
      }
      if (password.length < 6) {
        return msgBox(msg, "Password must be at least 6 characters.", "bad");
      }
      if (password !== confirm) {
        return msgBox(msg, "Passwords do not match.", "bad");
      }

      const result = registerUser(username, password);
      if (!result.ok) return msgBox(msg, result.error, "bad");

      // Auto-login after registration 
      loginUser(username, password);
      applyLoginPills();

      msgBox(msg, "Registration successful! Redirecting to posts…", "ok");
      setTimeout(() => (location.href = "posts.html"), 700);
    });
  }

  // -----------------------------
  // Login page behaviour
  // -----------------------------
  function initLogin() {
    const form = $("#loginForm");
    const msg = $("#loginMsg");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      msgBox(msg, "", "");

      const username = ($("#loginUsername")?.value || "").trim();
      const password = $("#loginPassword")?.value || "";

      if (!username || !password) {
        return msgBox(msg, "Please enter a username and password.", "bad");
      }

      const result = loginUser(username, password);
      if (!result.ok) return msgBox(msg, result.error, "bad");

      applyLoginPills();
      msgBox(msg, `Welcome back, ${result.username}! Redirecting…`, "ok");
      setTimeout(() => (location.href = "posts.html"), 650);
    });
  }

  // -----------------------------
  // New post page behaviour
  // -----------------------------
  function initNewPost() {
    const form = $("#postForm");
    const msg = $("#postMsg");
    if (!form) return;

    const photoInput = $("#photo");
    const previewWrap = $("#imgPreview");
    const previewImg = $("#previewImg");

    // Set default date/time (nice UX)
    const dateEl = $("#dateObs");
    const timeEl = $("#timeObs");
    if (dateEl && !dateEl.value) {
      const d = new Date();
      dateEl.value = d.toISOString().slice(0, 10);
    }
    if (timeEl && !timeEl.value) {
      const d = new Date();
      timeEl.value = d.toTimeString().slice(0, 5);
    }

    let imageDataUrl = null;

    function clearPreview() {
      imageDataUrl = null;
      if (previewImg) previewImg.src = "";
      if (previewWrap) previewWrap.hidden = true;
    }

    if (photoInput) {
      photoInput.addEventListener("change", async () => {
        msgBox(msg, "", "");
        clearPreview();

        const file = photoInput.files && photoInput.files[0];
        if (!file) return;

        // Validate type
        const okTypes = ["image/jpeg", "image/png"];
        if (!okTypes.includes(file.type)) {
          photoInput.value = "";
          msgBox(msg, "Photo must be JPG or PNG.", "bad");
          return;
        }

        // Validate size (max 1.2MB)
        const MAX = 1.2 * 1024 * 1024; // bytes
        if (file.size > MAX) {
          photoInput.value = "";
          msgBox(msg, "Photo is too large. Max size is 1.2MB.", "bad");
          return;
        }

        // Read as data URL for client-side storage/preview
        imageDataUrl = await fileToDataUrl(file);
        if (previewImg) previewImg.src = imageDataUrl;
        if (previewWrap) previewWrap.hidden = false;
      });
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      msgBox(msg, "", "");

      const u = currentUser();
      if (!u) return msgBox(msg, "You must be logged in to submit a post.", "bad");

      const locationVal = $("#location")?.value || "";
      const birdVal = $("#bird")?.value || "";
      const dateVal = $("#dateObs")?.value || "";
      const timeVal = $("#timeObs")?.value || "";
      const activityVal = $("#activity")?.value || "";
      const durationVal = $("#duration")?.value || "";
      const commentsVal = ($("#comments")?.value || "").trim();

      // Required validation based on spec
      if (!locationVal) return msgBox(msg, "Please choose a location.", "bad");
      if (!birdVal) return msgBox(msg, "Please choose a bird species.", "bad");
      if (!dateVal) return msgBox(msg, "Please choose a date.", "bad");
      if (!timeVal) return msgBox(msg, "Please choose a time.", "bad");
      if (!activityVal) return msgBox(msg, "Please choose an activity.", "bad");

      const durationNum = Number(durationVal);
      if (!Number.isFinite(durationNum) || durationNum < 1 || durationNum > 1440) {
        return msgBox(msg, "Duration must be a number from 1–1440 minutes.", "bad");
      }

      if (!commentsVal) return msgBox(msg, "Please add comments.", "bad");
      if (commentsVal.length > 500) return msgBox(msg, "Comments must be 500 characters or less.", "bad");

      const post = {
        id: uid(),
        username: u,
        location: locationVal,
        bird: birdVal,
        dateObs: dateVal,
        timeObs: timeVal,
        activity: activityVal,
        duration: durationNum,
        comments: commentsVal,
        imageDataUrl: imageDataUrl, 
        createdAt: nowISO(),
        updatedAt: null,
      };

      addPost(post);

      msgBox(msg, "Post submitted! Redirecting to posts…", "ok");
      setTimeout(() => (location.href = "posts.html"), 650);
    });

    // If user removes file after selecting, hide preview
    if (photoInput) {
      photoInput.addEventListener("input", () => {
        if (!photoInput.value) clearPreview();
      });
    }
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("File read failed"));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
  }

  // -----------------------------
  // Posts page behaviour
  // -----------------------------
  function initPosts() {
    const list = $("#postsList");
    const msg = $("#postsMsg");
    const searchBox = $("#searchBox");
    if (!list) return;

    // If not logged in, still allow viewing posts ,
    // but only authors get edit/delete buttons.
    const render = () => {
      const posts = getPosts();
      const q = (searchBox?.value || "").trim();

      const filtered = posts.filter((p) => matchesSearch(p, q));

      if (posts.length === 0) {
        msgBox(msg, "No posts yet. Click “New Post” to add one.", "ok");
      } else if (filtered.length === 0) {
        msgBox(msg, "No posts match your search.", "bad");
      } else {
        msgBox(msg, "", "");
      }

      list.innerHTML = filtered.map((p) => postCardHTML(p)).join("");

      // Wire buttons after render
      $$("#postsList [data-action]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const action = btn.getAttribute("data-action");
          const postId = btn.getAttribute("data-id");
          if (!postId) return;

          if (action === "delete") handleDelete(postId);
          if (action === "edit") handleEdit(postId);
        });
      });
    };

    function handleDelete(postId) {
      const u = currentUser();
      const post = getPosts().find((p) => p.id === postId);
      if (!post) return msgBox(msg, "Post not found.", "bad");

      if (!u) return msgBox(msg, "Please login to delete your post.", "bad");
      if (post.username !== u) return msgBox(msg, "You can only delete your own posts.", "bad");

      const ok = confirm("Delete this post? This cannot be undone (client-side).");
      if (!ok) return;

      deletePost(postId);
      msgBox(msg, "Post deleted.", "ok");
      render();
    }

    function handleEdit(postId) {
      const u = currentUser();
      const post = getPosts().find((p) => p.id === postId);
      if (!post) return msgBox(msg, "Post not found.", "bad");

      if (!u) return msgBox(msg, "Please login to edit your post.", "bad");
      if (post.username !== u) return msgBox(msg, "You can only edit your own posts.", "bad");

      // Task 2 note: edit should “trigger” an action;  here we use prompt() for simplicity.
      const updatedComments = prompt("Edit your comments (max 500 chars):", post.comments);
      if (updatedComments === null) return; // cancelled

      const cleaned = updatedComments.trim();
      if (!cleaned) return msgBox(msg, "Comments cannot be empty.", "bad");
      if (cleaned.length > 500) return msgBox(msg, "Comments must be 500 characters or less.", "bad");

      updatePost(postId, { comments: cleaned });
      msgBox(msg, "Post updated.", "ok");
      render();
    }

    if (searchBox) {
      searchBox.addEventListener("input", render);
    }

    render();
  }

  function postCardHTML(p) {
    const u = currentUser();
    const isAuthor = u && p.username === u;

    const created = new Date(p.createdAt);
    const createdText = isFinite(created) ? created.toLocaleString() : p.createdAt;

    const updatedText =
      p.updatedAt ? ` • updated ${new Date(p.updatedAt).toLocaleString()}` : "";

    const imgHTML = p.imageDataUrl
      ? `<img src="${p.imageDataUrl}" alt="Observation photo uploaded by ${escapeHTML(p.username)}">`
      : "";

    const buttonsHTML = isAuthor
      ? `
        <div class="post-actions">
          <button class="btn btn-ghost" type="button" data-action="edit" data-id="${p.id}">Edit</button>
          <button class="btn btn-danger" type="button" data-action="delete" data-id="${p.id}">Delete</button>
        </div>
      `
      : `
        <div class="post-actions">
          <button class="btn btn-ghost" type="button" disabled title="Login as the author to edit/delete">
            Edit
          </button>
          <button class="btn btn-ghost" type="button" disabled title="Login as the author to edit/delete">
            Delete
          </button>
        </div>
      `;

    return `
      <article class="post" data-post="${p.id}">
        <div class="post-top">
          <h2 class="post-title">${escapeHTML(p.bird)} — ${escapeHTML(p.location)}</h2>
          <div class="meta">${escapeHTML(p.username)} • ${createdText}${updatedText}</div>
        </div>

        <div class="meta">
          Observed: ${escapeHTML(p.dateObs)} at ${escapeHTML(p.timeObs)} •
          Activity: ${escapeHTML(p.activity)} • Duration: ${escapeHTML(p.duration)} min
        </div>

        <p>${escapeHTML(p.comments)}</p>

        ${imgHTML}

        ${buttonsHTML}
      </article>
    `;
  }

  // -----------------------------
  // Boot
  // -----------------------------
  function init() {
    // Task 2: relevant page behaviours
    applyLoginPills();
    wireLogoutButtons();

    // Optional route protection 
    requireLoginFor(["newpost.html"]);

    initLanding();
    initRegister();
    initLogin();
    initNewPost();
    initPosts();

    // Friendly: if logout buttons exist, hide if not logged in
    applyLoginPills();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
