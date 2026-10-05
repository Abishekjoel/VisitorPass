/**
 * VisitorPass - Shared Core Application Utilities
 * API Connector, UI Shell, Toasts, Modals, and Formatting
 */

const App = (() => {
  // Determine API base endpoint dynamically
  const isDirectBackend = window.location.port === "8000" || window.location.pathname.startsWith("/static");
  const API_BASE = isDirectBackend 
    ? `${window.location.origin}/api` 
    : "http://127.0.0.1:8000/api";

  // Reusable API Request Wrapper
  async function fetchAPI(endpoint, options = {}) {
    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    
    const headers = {
      "Accept": "application/json",
      ...(options.body && typeof options.body === "string" ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(url, { ...options, headers });
      
      // If it's a blob/file response (e.g. CSV export)
      if (options.asBlob) {
        if (!response.ok) throw new Error(`Download failed with status ${response.status}`);
        return await response.blob();
      }

      const contentType = response.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        let errorMsg = "An error occurred with the server.";
        if (data && data.detail) {
          if (Array.isArray(data.detail)) {
            // Pydantic validation errors
            errorMsg = data.detail.map(err => `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg}`).join("<br>");
          } else {
            errorMsg = data.detail;
          }
        }
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error(`[API Error ${endpoint}]:`, err);
      throw err;
    }
  }

  // Toast Notification System
  function ensureToastContainer() {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    return container;
  }

  function toast(type, title, message, duration = 4500) {
    const container = ensureToastContainer();
    const toastEl = document.createElement("div");
    toastEl.className = `toast toast-${type}`;

    let iconSvg = "";
    if (type === "success") {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
    } else if (type === "error") {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
    } else if (type === "warning") {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toastEl.innerHTML = `
      ${iconSvg}
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    container.appendChild(toastEl);
    requestAnimationFrame(() => toastEl.classList.add("show"));

    const closeBtn = toastEl.querySelector(".toast-close");
    const removeToast = () => {
      toastEl.classList.remove("show");
      toastEl.classList.add("hide");
      setTimeout(() => toastEl.remove(), 300);
    };

    closeBtn.addEventListener("click", removeToast);
    if (duration > 0) {
      setTimeout(removeToast, duration);
    }
  }

  // Format Date and Time
  function formatDateTime(isoString) {
    if (!isoString) return "—";
    try {
      const dt = new Date(isoString);
      return dt.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return isoString;
    }
  }

  function formatTime(isoString) {
    if (!isoString) return "—";
    try {
      const dt = new Date(isoString);
      return dt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return isoString;
    }
  }

  function formatDate(isoString) {
    if (!isoString) return "—";
    try {
      const dt = new Date(isoString);
      return dt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return isoString;
    }
  }

  function getInitials(name) {
    if (!name) return "VP";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  // Modals management
  function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add("open");
  }

  function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove("open");
  }

  // Global Check-Out Action
  async function checkOutVisitor(visitorId, visitorName, onSuccess) {
    const confirmed = confirm(`Are you sure you want to check out "${visitorName}" (${visitorId})?`);
    if (!confirmed) return;

    try {
      const res = await fetchAPI(`/visitors/${visitorId}/checkout`, { method: "POST" });
      toast("success", "Checked Out", `${visitorName} has successfully checked out. Duration: ${res.duration}`);
      if (typeof onSuccess === "function") {
        onSuccess(res);
      }
      updateInsideBadgeCount();
    } catch (err) {
      toast("error", "Check-out Failed", err.message);
    }
  }

  // Global Delete Visitor Action
  async function deleteVisitor(visitorId, visitorName, onSuccess) {
    const confirmed = confirm(`PERMANENT ACTION: Are you sure you want to delete visitor record for "${visitorName}" (${visitorId})?`);
    if (!confirmed) return;

    try {
      await fetchAPI(`/visitors/${visitorId}`, { method: "DELETE" });
      toast("info", "Record Deleted", `Visitor record "${visitorId}" has been removed.`);
      if (typeof onSuccess === "function") {
        onSuccess();
      }
      updateInsideBadgeCount();
    } catch (err) {
      toast("error", "Delete Failed", err.message);
    }
  }

  // Update Inside count badge in sidebar
  async function updateInsideBadgeCount() {
    const badgeEl = document.getElementById("nav-inside-count");
    if (!badgeEl) return;
    try {
      const insideVisitors = await fetchAPI("/visitors/current");
      const count = insideVisitors.length;
      badgeEl.textContent = count;
      if (count > 0) {
        badgeEl.classList.add("active-badge");
      } else {
        badgeEl.classList.remove("active-badge");
      }
    } catch (e) {
      // quiet fail for badge background update
    }
  }

  // Generate QR SVG mockup for pass
  function generateQrMockSvg(content) {
    return `
      <svg class="badge-qr-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="white"/>
        <!-- Top Left Corner -->
        <rect x="10" y="10" width="26" height="26" fill="black"/>
        <rect x="14" y="14" width="18" height="18" fill="white"/>
        <rect x="18" y="18" width="10" height="10" fill="black"/>
        
        <!-- Top Right Corner -->
        <rect x="64" y="10" width="26" height="26" fill="black"/>
        <rect x="68" y="14" width="18" height="18" fill="white"/>
        <rect x="72" y="18" width="10" height="10" fill="black"/>
        
        <!-- Bottom Left Corner -->
        <rect x="10" y="64" width="26" height="26" fill="black"/>
        <rect x="14" y="68" width="18" height="18" fill="white"/>
        <rect x="18" y="72" width="10" height="10" fill="black"/>
        
        <!-- Data Dots Pattern -->
        <rect x="42" y="12" width="6" height="6" fill="black"/>
        <rect x="52" y="18" width="6" height="6" fill="black"/>
        <rect x="42" y="24" width="6" height="6" fill="black"/>
        <rect x="12" y="42" width="6" height="6" fill="black"/>
        <rect x="24" y="48" width="6" height="6" fill="black"/>
        <rect x="44" y="44" width="12" height="12" fill="black"/>
        <rect x="64" y="42" width="6" height="6" fill="black"/>
        <rect x="76" y="48" width="6" height="6" fill="black"/>
        <rect x="84" y="42" width="6" height="6" fill="black"/>
        <rect x="42" y="66" width="6" height="6" fill="black"/>
        <rect x="52" y="74" width="6" height="6" fill="black"/>
        <rect x="42" y="82" width="6" height="6" fill="black"/>
        <rect x="66" y="68" width="8" height="8" fill="black"/>
        <rect x="78" y="78" width="12" height="12" fill="black"/>
      </svg>
    `;
  }

  // Show Visitor Pass Modal
  function showPassModal(visitor) {
    let passModal = document.getElementById("pass-modal");
    if (!passModal) {
      passModal = document.createElement("div");
      passModal.id = "pass-modal";
      passModal.className = "modal-overlay";
      passModal.innerHTML = `
        <div class="modal-window" style="max-width: 440px;">
          <div class="modal-header">
            <h3>Digital Visitor Pass</h3>
            <button class="modal-close" onclick="App.closeModal('pass-modal')">&times;</button>
          </div>
          <div class="modal-body" id="pass-modal-content"></div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="App.closeModal('pass-modal')">Close</button>
            <button class="btn btn-primary" onclick="window.print()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              Print Pass
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(passModal);
    }

    const container = document.getElementById("pass-modal-content");
    container.innerHTML = `
      <div class="badge-pass-container">
        <div class="visitor-badge-card">
          <div class="badge-top-lanyard">
            <div class="badge-lanyard-hole"></div>
          </div>
          <div class="badge-header">
            <div class="badge-company-name">ORGANIZATION VISITOR ACCESS</div>
            <div class="badge-pass-title">OFFICIAL VISITOR PASS</div>
          </div>
          <div class="badge-body">
            <div class="badge-avatar-wrap">
              ${getInitials(visitor.full_name)}
            </div>
            <div class="badge-visitor-name">${visitor.full_name}</div>
            <div class="badge-visitor-org">${visitor.organization}</div>
            
            <div class="badge-id-box">${visitor.visitor_id}</div>

            <div class="badge-details-grid">
              <div class="badge-detail-item">
                <div class="label">Person to Visit</div>
                <div class="val">${visitor.person_to_visit}</div>
              </div>
              <div class="badge-detail-item">
                <div class="label">Purpose</div>
                <div class="val">${visitor.purpose}</div>
              </div>
              <div class="badge-detail-item">
                <div class="label">Check-In Date</div>
                <div class="val">${formatDate(visitor.check_in)}</div>
              </div>
              <div class="badge-detail-item">
                <div class="label">Check-In Time</div>
                <div class="val">${formatTime(visitor.check_in)}</div>
              </div>
              <div class="badge-detail-item">
                <div class="label">ID Verification</div>
                <div class="val">${visitor.id_type} (${visitor.id_number})</div>
              </div>
              <div class="badge-detail-item">
                <div class="label">Status</div>
                <div class="val">
                  <span class="badge ${visitor.status === 'Checked In' ? 'badge-in' : 'badge-out'}">
                    <span class="badge-dot"></span>${visitor.status}
                  </span>
                </div>
              </div>
            </div>

            <div class="badge-qr-area">
              ${generateQrMockSvg(visitor.visitor_id)}
              <div class="badge-footer-note">Please return badge to front-desk at check-out</div>
            </div>
          </div>
        </div>
      </div>
    `;

    openModal("pass-modal");
  }

  // Setup Live Clock
  function initLiveClock() {
    const clockEl = document.getElementById("live-clock");
    if (!clockEl) return;
    function update() {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
    }
    update();
    setInterval(update, 1000);
  }

  // Setup Mobile Sidebar Toggle
  function initMobileMenu() {
    const toggleBtn = document.getElementById("menu-toggle-btn");
    const sidebar = document.querySelector(".sidebar");
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("open");
      });
      // Close on clicking outside
      document.addEventListener("click", (e) => {
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target) && sidebar.classList.contains("open")) {
          sidebar.classList.remove("open");
        }
      });
    }
  }

  // Auto initialize on DOM ready
  document.addEventListener("DOMContentLoaded", () => {
    initLiveClock();
    initMobileMenu();
    updateInsideBadgeCount();
  });

  return {
    API_BASE,
    fetchAPI,
    toast,
    toastSuccess: (title, msg) => toast("success", title, msg),
    toastError: (title, msg) => toast("error", title, msg),
    toastWarning: (title, msg) => toast("warning", title, msg),
    toastInfo: (title, msg) => toast("info", title, msg),
    formatDateTime,
    formatTime,
    formatDate,
    getInitials,
    openModal,
    closeModal,
    checkOutVisitor,
    deleteVisitor,
    updateInsideBadgeCount,
    showPassModal
  };
})();
