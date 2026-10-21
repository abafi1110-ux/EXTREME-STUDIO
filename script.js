/* ===== Extreme Studio : script.js ===== */
"use strict";

(function () {
  /* ---------- Helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const KEYS = { designs: "extremeStudio.designs", projects: "extremeStudio.projects" };
  const STUDIO_LISTS = {
    Logo: "logo-list", Banner: "banner-list", Facebook: "facebook-list",
    LinkedIn: "linkedin-list", Instagram: "instagram-list",
    Pinterest: "pinterest-list", YouTube: "youtube-list"
  };
  const CATEGORIES = ["Logo", "Banner", "Facebook", "LinkedIn", "Instagram", "Pinterest", "YouTube", "Other"];
  const CAT_COLORS = ["#8b5cf6", "#22d3ee", "#60a5fa", "#38bdf8", "#f472b6", "#fb7185", "#f87171", "#fbbf24"];
  const STATUS_CLASS = { "Pending": "pending", "In Progress": "progress", "Completed": "completed" };

  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const money = (n) => "৳ " + (Number(n) || 0).toLocaleString("en-US");
  const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function fmtDate(s) {
    if (!s) return "—";
    return new Date(s + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function daysBetween(a, b) {
    return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
  }

  /* ---------- Storage ---------- */
  function load(key) {
    try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  let designs = load(KEYS.designs);
  let projects = load(KEYS.projects);
  let editingId = null;

  /* ---------- Welcome screen + navigation ---------- */
  function showPage(id) {
    $$(".page").forEach((p) => { p.hidden = p.id !== id; });
    $$(".nav-btn").forEach((b) => {
      const on = b.dataset.page === id;
      b.classList.toggle("active", on);
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  $("#enter-studio").addEventListener("click", () => {
    const w = $("#welcome-screen");
    $("#studio").hidden = false;
    showPage("dashboard");
    w.classList.add("is-leaving");
    setTimeout(() => { w.hidden = true; }, 600);
  });

  $(".studio-nav").addEventListener("click", (e) => {
    const b = e.target.closest(".nav-btn");
    if (b) showPage(b.dataset.page);
  });

  /* ---------- Image processing, download, print ---------- */
  function processImage(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error("read"));
      r.onload = () => {
        const im = new Image();
        im.onerror = () => reject(new Error("image"));
        im.onload = () => {
          const w0 = im.naturalWidth || 1000, h0 = im.naturalHeight || 1000;
          const k = Math.min(1, 1400 / Math.max(w0, h0));
          const c = document.createElement("canvas");
          c.width = Math.round(w0 * k);
          c.height = Math.round(h0 * k);
          const ctx = c.getContext("2d");
          const keepAlpha = ["image/png", "image/webp", "image/svg+xml"].includes(file.type);
          if (!keepAlpha) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height); }
          ctx.drawImage(im, 0, 0, c.width, c.height);
          resolve(keepAlpha ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.85));
        };
        im.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }

  function downloadDesign(d) {
    const ext = d.src.indexOf("data:image/png") === 0 ? "png" : "jpg";
    const base = d.title.replace(/[\\/:*?"<>|]+/g, "_").trim() || "design";
    const a = document.createElement("a");
    a.href = d.src;
    a.download = base + "." + ext;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function printDesign(d) {
    const f = document.createElement("iframe");
    f.setAttribute("aria-hidden", "true");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(f);
    const doc = f.contentWindow.document;
    doc.open();
    doc.write(
      '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + esc(d.title) + "</title>" +
      "<style>@page{margin:12mm}body{margin:0;text-align:center;font-family:Arial,sans-serif}" +
      "h1{font-size:16px;margin:0 0 10px}img{max-width:100%;max-height:90vh;object-fit:contain}</style></head>" +
      "<body><h1>" + esc(d.title) + '</h1><img id="p" src="' + d.src + '" alt=""></body></html>'
    );
    doc.close();
    const img = doc.getElementById("p");
    const go = () => {
      f.contentWindow.focus();
      f.contentWindow.print();
      setTimeout(() => f.remove(), 2000);
    };
    if (img.complete) go(); else img.onload = go;
  }

  /* ---------- Render: designs ---------- */
  function designCardHTML(d, withDelete) {
    return '<article class="gallery-item">' +
      '<img src="' + d.src + '" alt="' + esc(d.title) + '" loading="lazy">' +
      '<div class="gallery-item-body">' +
      "<h4>" + esc(d.title) + "</h4>" +
      '<span class="tag">' + esc(d.category) + "</span> <small>" + fmtDate(d.date) + "</small>" +
      '<div class="project-actions">' +
      '<button class="btn btn-ghost btn-small" type="button" data-action="download" data-id="' + d.id + '">Download</button>' +
      '<button class="btn btn-ghost btn-small" type="button" data-action="print" data-id="' + d.id + '">Print</button>' +
      (withDelete ? '<button class="btn btn-danger btn-small" type="button" data-action="delete-design" data-id="' + d.id + '">Delete</button>' : "") +
      "</div></div></article>";
  }

  function renderGallery() {
    const f = $("#gallery-category-filter").value;
    $("#gallery").innerHTML = designs
      .filter((d) => f === "All" || d.category === f)
      .map((d) => designCardHTML(d, true)).join("");
  }

  function renderStudioLists() {
    Object.keys(STUDIO_LISTS).forEach((cat) => {
      $("#" + STUDIO_LISTS[cat]).innerHTML = designs
        .filter((d) => d.category === cat)
        .map((d) => designCardHTML(d, false)).join("");
    });
  }

  /* ---------- Render: projects ---------- */
  function projectCardHTML(p) {
    const sc = STATUS_CLASS[p.status] || "pending";
    const due = Math.max(0, (Number(p.amount) || 0) - (Number(p.paid) || 0));
    const opts = Object.keys(STATUS_CLASS).map((s) =>
      "<option" + (s === p.status ? " selected" : "") + ">" + s + "</option>").join("");
    return '<article class="project-card is-' + sc + '">' +
      '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">' +
      "<div><h4>" + esc(p.name) + '</h4><p class="client">' + esc(p.client) + "</p></div>" +
      '<span class="badge status-' + sc + '">' + esc(p.status) + "</span></div>" +
      '<div class="project-meta">' +
      "<div><span>Design type</span>" + esc(p.type) + "</div>" +
      "<div><span>Start date</span>" + fmtDate(p.start) + "</div>" +
      "<div><span>Deadline</span>" + fmtDate(p.deadline) + "</div>" +
      "<div><span>Finished</span>" + fmtDate(p.end) + "</div></div>" +
      '<div class="project-money">' +
      "<div><small>Total</small>" + money(p.amount) + "</div>" +
      '<div class="paid"><small>Received</small>' + money(p.paid) + "</div>" +
      '<div class="due"><small>Due</small>' + money(due) + "</div></div>" +
      (p.notes ? '<p class="project-notes">' + esc(p.notes) + "</p>" : "") +
      '<div class="project-actions">' +
      '<select data-status-id="' + p.id + '" aria-label="Change status" style="width:auto;min-height:34px;padding:4px 10px">' + opts + "</select>" +
      '<button class="btn btn-ghost btn-small" type="button" data-action="edit-project" data-id="' + p.id + '">Edit</button>' +
      '<button class="btn btn-danger btn-small" type="button" data-action="delete-project" data-id="' + p.id + '">Delete</button>' +
      "</div></article>";
  }

  function renderProjects() {
    $("#project-list").innerHTML = projects.slice().reverse().map(projectCardHTML).join("");
  }

  /* ---------- Render: dashboard ---------- */
  function totals() {
    const total = projects.length;
    const done = projects.filter((p) => p.status === "Completed").length;
    const running = projects.filter((p) => p.status === "In Progress").length;
    const pending = projects.filter((p) => p.status === "Pending").length;
    const amount = projects.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const paid = projects.reduce((s, p) => s + (Number(p.paid) || 0), 0);
    return { total, done, running, pending, amount, paid, due: Math.max(0, amount - paid) };
  }

  function barChart(items) {
    const max = Math.max(1, ...items.map((i) => i.value));
    return '<div class="bar-chart">' + items.map((i) =>
      '<div class="bar-col"><span class="bar-value">' + esc(i.text) + "</span>" +
      '<div class="bar" style="--h:' + (i.value / max * 78) + "%;--bc:" + i.color + '"></div>' +
      '<span class="bar-label">' + esc(i.label) + "</span></div>").join("") + "</div>";
  }

  function renderDashboard() {
    const t = totals();
    const stats = [
      ["Total Orders", t.total], ["Completed", t.done], ["In Progress", t.running],
      ["Income Received", money(t.paid)], ["Amount Due", money(t.due)], ["Designs in Gallery", designs.length]
    ];
    $("#dashboard-stats").innerHTML = stats.map((s) =>
      '<div class="stat"><span class="stat-label">' + s[0] + '</span><strong class="stat-value">' + s[1] + "</strong></div>").join("");

    let box = $("#dashboard-charts");
    if (!box) {
      box = document.createElement("div");
      box.id = "dashboard-charts";
      box.className = "chart-grid";
      $("#dashboard .page-body").appendChild(box);
    }

    const pct = t.total ? Math.round(t.done / t.total * 100) : 0;
    const perCat = CATEGORIES.map((c, i) => {
      const n = designs.filter((d) => d.category === c).length;
      return { label: c, value: n, text: String(n), color: CAT_COLORS[i] };
    });

    box.innerHTML =
      '<div class="chart-card"><h3>Orders by status</h3>' + barChart([
        { label: "Pending", value: t.pending, text: String(t.pending), color: "#fbbf24" },
        { label: "In Progress", value: t.running, text: String(t.running), color: "#60a5fa" },
        { label: "Completed", value: t.done, text: String(t.done), color: "#34d399" }
      ]) + "</div>" +
      '<div class="chart-card"><h3>Income and due</h3>' + barChart([
        { label: "Total", value: t.amount, text: money(t.amount), color: "#8b5cf6" },
        { label: "Received", value: t.paid, text: money(t.paid), color: "#34d399" },
        { label: "Due", value: t.due, text: money(t.due), color: "#fb7185" }
      ]) + "</div>" +
      '<div class="chart-card"><h3>Completion rate</h3>' +
      '<div class="donut" style="--p:' + pct + '"><span>' + pct + "%</span></div>" +
      '<div class="legend"><span><i style="--lc:#34d399"></i>Completed ' + t.done + "</span>" +
      '<span><i style="--lc:rgba(255,255,255,.35)"></i>Remaining ' + (t.total - t.done) + "</span></div></div>" +
      '<div class="chart-card"><h3>Portfolio by category</h3>' + barChart(perCat) + "</div>";
  }

  /* ---------- Render: income + timeline ---------- */
  function renderIncome() {
    const t = totals();
    $("#total-orders").textContent = t.total;
    $("#completed-orders").textContent = t.done;
    $("#running-orders").textContent = t.running;
    $("#total-income").textContent = money(t.paid);
    $("#total-due").textContent = money(t.due);
  }

  function renderTimeline() {
    const today = todayStr();
    const items = projects.slice().sort((a, b) => (a.start || "9999").localeCompare(b.start || "9999"));
    $("#timeline-list").innerHTML = items.map((p) => {
      const done = p.status === "Completed";
      const late = !done && p.deadline && today > p.deadline;
      let pct = 0, note = "";
      if (done) {
        pct = 100;
        if (p.end && p.deadline && p.end > p.deadline) note = "Finished " + plural(daysBetween(p.deadline, p.end), "day") + " late";
        else note = "Finished on time";
      } else if (p.start && p.deadline) {
        const span = Math.max(1, daysBetween(p.start, p.deadline));
        pct = Math.min(100, Math.max(0, daysBetween(p.start, today) / span * 100));
      }
      if (!done && p.deadline) {
        note = late ? plural(daysBetween(p.deadline, today), "day") + " overdue"
                    : plural(Math.max(0, daysBetween(today, p.deadline)), "day") + " left";
      }
      return '<article class="timeline-item' + (done ? " is-completed" : "") + (late ? " is-late" : "") + '">' +
        "<h4>" + esc(p.name) + " – " + esc(p.client) + "</h4>" +
        '<div class="timeline-dates">' +
        "<span>Started: <strong>" + fmtDate(p.start) + "</strong></span>" +
        "<span>Deadline: <strong>" + fmtDate(p.deadline) + "</strong></span>" +
        "<span>Finished: <strong>" + (p.end ? fmtDate(p.end) : "Not yet") + "</strong></span></div>" +
        '<div class="timeline-bar"><div class="timeline-fill" style="--w:' + pct + '%"></div></div>' +
        (note ? '<p class="project-notes">' + note + "</p>" : "") + "</article>";
    }).join("");
  }

  function renderAll() {
    renderDashboard();
    renderStudioLists();
    renderGallery();
    renderProjects();
    renderIncome();
    renderTimeline();
  }

  /* ---------- Portfolio form ---------- */
  $("#design-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = $("#design-image").files[0];
    const title = $("#design-title").value.trim();
    const category = $("#design-category").value;
    if (!file || !title) return;
    if (!file.type.startsWith("image/")) { alert("Please choose an image file."); return; }
    if (file.size > 15 * 1024 * 1024) { alert("This image is larger than 15 MB. Please choose a smaller one."); return; }

    const btn = e.submitter || $("#design-form button[type=submit]");
    btn.disabled = true;
    try {
      const src = await processImage(file);
      const item = { id: uid(), title, category, src, date: todayStr() };
      designs.unshift(item);
      if (!save(KEYS.designs, designs)) {
        designs.shift();
        alert("Browser storage is full. Delete some designs and try again.");
      } else {
        e.target.reset();
        const flt = $("#gallery-category-filter");
        if (flt.value !== "All" && flt.value !== category) flt.value = category;
        renderAll();
      }
    } catch (err) {
      alert("This image could not be read. Please try another file.");
    }
    btn.disabled = false;
  });

  $("#gallery-category-filter").addEventListener("change", renderGallery);

  /* ---------- Project form ---------- */
  const projectForm = $("#project-form");
  const submitBtn = $("button[type=submit]", projectForm);

  function resetProjectForm() {
    projectForm.reset();
    $("#project-start").value = todayStr();
    editingId = null;
    submitBtn.textContent = "Save Project";
  }

  projectForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const amount = Number($("#project-amount").value) || 0;
    const paid = Number($("#project-paid").value) || 0;
    const start = $("#project-start").value;
    const deadline = $("#project-deadline").value;
    if (paid > amount) { alert("Amount received cannot be more than the total amount."); return; }
    if (start && deadline && deadline < start) { alert("Deadline cannot be before the start date."); return; }

    const status = $("#project-status").value;
    const old = projects.find((p) => p.id === editingId);
    const data = {
      id: old ? old.id : uid(),
      client: $("#client-name").value.trim(),
      name: $("#project-name").value.trim(),
      type: $("#project-type").value,
      start, deadline, amount, paid, status,
      notes: $("#project-notes").value.trim(),
      end: status === "Completed" ? ((old && old.end) || todayStr()) : ""
    };
    if (old) Object.assign(old, data); else projects.push(data);
    if (!save(KEYS.projects, projects)) alert("Could not save. Browser storage is full or blocked.");
    resetProjectForm();
    renderAll();
  });

  document.addEventListener("change", (e) => {
    const s = e.target.closest("[data-status-id]");
    if (!s) return;
    const p = projects.find((x) => x.id === s.dataset.statusId);
    if (!p) return;
    p.status = s.value;
    p.end = p.status === "Completed" ? (p.end || todayStr()) : "";
    save(KEYS.projects, projects);
    renderAll();
  });

  /* ---------- Buttons on cards ---------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-action]");
    if (!b) return;
    const id = b.dataset.id;
    const act = b.dataset.action;
    const d = designs.find((x) => x.id === id);
    const p = projects.find((x) => x.id === id);

    if (act === "download" && d) downloadDesign(d);
    else if (act === "print" && d) printDesign(d);
    else if (act === "delete-design" && d) {
      if (confirm("Delete this design from your gallery?")) {
        designs = designs.filter((x) => x.id !== id);
        save(KEYS.designs, designs);
        renderAll();
      }
    } else if (act === "edit-project" && p) {
      editingId = p.id;
      $("#client-name").value = p.client;
      $("#project-name").value = p.name;
      $("#project-type").value = p.type;
      $("#project-start").value = p.start;
      $("#project-deadline").value = p.deadline;
      $("#project-amount").value = p.amount;
      $("#project-paid").value = p.paid;
      $("#project-status").value = p.status;
      $("#project-notes").value = p.notes;
      submitBtn.textContent = "Update Project";
      projectForm.scrollIntoView({ behavior: "smooth", block: "start" });
      $("#client-name").focus({ preventScroll: true });
    } else if (act === "delete-project" && p) {
      if (confirm("Delete this project?")) {
        projects = projects.filter((x) => x.id !== id);
        if (editingId === id) resetProjectForm();
        save(KEYS.projects, projects);
        renderAll();
      }
    }
  });

  /* ---------- Start ---------- */
  $("#project-start").value = todayStr();
  renderAll();
})();