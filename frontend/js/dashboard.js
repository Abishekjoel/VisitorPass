/**
 * Dashboard Controller
 * Fetches dashboard statistics and renders real-time recent visitor log.
 */

document.addEventListener("DOMContentLoaded", () => {
  loadDashboardData();

  const refreshBtn = document.getElementById("btn-refresh-dashboard");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      loadDashboardData(true);
    });
  }

  // Periodic silent polling every 30s
  setInterval(() => {
    loadDashboardData(false);
  }, 30000);
});

async function loadDashboardData(showToastOnManual = false) {
  const tbody = document.getElementById("recent-visitors-tbody");
  
  try {
    const stats = await App.fetchAPI("/dashboard/stats");

    // Update Stat Cards with smooth count
    document.getElementById("stat-today-count").textContent = stats.total_visitors_today;
    document.getElementById("stat-inside-count").textContent = stats.currently_inside;
    document.getElementById("stat-checkout-count").textContent = stats.visitors_checked_out_today;
    document.getElementById("stat-total-count").textContent = stats.total_visits;

    // Render Recent Visitors Table
    renderRecentVisitors(stats.recent_visitors);

    if (showToastOnManual) {
      App.toastInfo("Dashboard Updated", "Latest visitor activity and counts synchronized.");
    }
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            <div class="empty-title" style="color: var(--danger);">Unable to connect to backend</div>
            <div class="empty-text">Ensure the FastAPI server is running on http://127.0.0.1:8000</div>
            <button class="btn btn-primary btn-sm" onclick="loadDashboardData(true)">Retry Connection</button>
          </td>
        </tr>
      `;
    }
    App.toastError("Connection Error", err.message || "Failed to fetch dashboard data.");
  }
}

function renderRecentVisitors(visitors) {
  const tbody = document.getElementById("recent-visitors-tbody");
  if (!tbody) return;

  if (!visitors || visitors.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <div class="empty-title">No visitor records yet</div>
          <div class="empty-text">Incoming visitors registered at reception will automatically appear here.</div>
          <a href="register.html" class="btn btn-primary btn-sm">Register First Visitor</a>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = visitors.map(v => {
    const isInside = v.status === "Checked In";
    const statusBadge = isInside
      ? `<span class="badge badge-in"><span class="badge-dot"></span>Checked In</span>`
      : `<span class="badge badge-out"><span class="badge-dot"></span>Checked Out</span>`;

    return `
      <tr id="row-${v.visitor_id}">
        <td>
          <a href="visitor-details.html?id=${encodeURIComponent(v.visitor_id)}" class="visitor-id-tag" title="Click to view full record">
            ${v.visitor_id}
          </a>
        </td>
        <td>
          <div class="visitor-user-cell">
            <div class="visitor-avatar">${App.getInitials(v.full_name)}</div>
            <div>
              <div class="visitor-meta-name">
                <a href="visitor-details.html?id=${encodeURIComponent(v.visitor_id)}" style="color: inherit; text-decoration: none;">
                  ${v.full_name}
                </a>
              </div>
              <div class="visitor-meta-sub">${v.phone}</div>
            </div>
          </div>
        </td>
        <td><strong>${v.organization}</strong></td>
        <td>
          <div style="font-weight: 600; color: var(--text-main);">${v.person_to_visit}</div>
          <div class="visitor-meta-sub">${v.purpose}</div>
        </td>
        <td>
          <div>${App.formatTime(v.check_in)}</div>
          <div class="visitor-meta-sub">${App.formatDate(v.check_in)}</div>
        </td>
        <td>
          <span style="font-weight: 600; color: ${isInside ? 'var(--primary)' : 'var(--text-muted)'};">
            ${v.duration}
          </span>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div class="action-buttons">
            <a href="visitor-details.html?id=${encodeURIComponent(v.visitor_id)}" class="action-btn btn-view" title="View Profile">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </a>
            
            <button class="action-btn" title="View / Print Visitor Pass" onclick='App.showPassModal(${JSON.stringify(v).replace(/'/g, "&apos;")})'>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h6"/></svg>
            </button>

            ${isInside ? `
              <button class="action-btn btn-checkout" title="Check Out Visitor" onclick="handleDashboardCheckout('${v.visitor_id}', '${v.full_name.replace(/'/g, "\\'")}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Check Out
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function handleDashboardCheckout(visitorId, visitorName) {
  App.checkOutVisitor(visitorId, visitorName, () => {
    loadDashboardData(false);
  });
}
