/**
 * Visitor Records Controller
 * Real-time search, multi-criteria filtering, edit modal, checkout, and deletion.
 */

let allLoadedVisitors = [];
let searchDebounceTimer = null;

document.addEventListener("DOMContentLoaded", () => {
  loadVisitorRecords();

  const searchInput = document.getElementById("records-search");
  const statusFilter = document.getElementById("records-status-filter");
  const dateFilter = document.getElementById("records-date-filter");
  const resetBtn = document.getElementById("btn-reset-filters");
  const refreshBtn = document.getElementById("btn-refresh-records");
  const editForm = document.getElementById("edit-visitor-form");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        loadVisitorRecords();
      }, 250);
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", () => loadVisitorRecords());
  }

  if (dateFilter) {
    dateFilter.addEventListener("change", () => loadVisitorRecords());
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (statusFilter) statusFilter.value = "all";
      if (dateFilter) dateFilter.value = "";
      loadVisitorRecords();
      App.toastInfo("Filters Reset", "Showing all visitor log records.");
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      loadVisitorRecords(true);
    });
  }

  if (editForm) {
    editForm.addEventListener("submit", handleEditFormSubmit);
  }
});

async function loadVisitorRecords(showToast = false) {
  const tbody = document.getElementById("visitors-tbody");
  const countLabel = document.getElementById("records-count-label");

  const searchVal = document.getElementById("records-search")?.value.trim() || "";
  const statusVal = document.getElementById("records-status-filter")?.value || "all";
  const dateVal = document.getElementById("records-date-filter")?.value || "";

  // Build query string
  const params = new URLSearchParams();
  if (searchVal) params.append("search", searchVal);
  if (statusVal && statusVal !== "all") params.append("status", statusVal);
  if (dateVal) params.append("date", dateVal);

  const endpoint = `/visitors?${params.toString()}`;

  try {
    const visitors = await App.fetchAPI(endpoint);
    allLoadedVisitors = visitors;

    if (countLabel) {
      countLabel.textContent = `Displaying ${visitors.length} record${visitors.length === 1 ? '' : 's'}`;
    }

    renderVisitorsTable(visitors);

    if (showToast) {
      App.toastInfo("Records Refreshed", `${visitors.length} records retrieved from server.`);
    }
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-state">
            <div class="empty-title" style="color: var(--danger);">Failed to load visitor records</div>
            <div class="empty-text">${err.message || 'Check server connection.'}</div>
            <button class="btn btn-primary btn-sm" onclick="loadVisitorRecords(true)">Retry</button>
          </td>
        </tr>
      `;
    }
    App.toastError("Data Load Error", err.message);
  }
}

function renderVisitorsTable(visitors) {
  const tbody = document.getElementById("visitors-tbody");
  if (!tbody) return;

  if (!visitors || visitors.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          <div class="empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <div class="empty-title">No matching visitor records found</div>
          <div class="empty-text">Try adjusting your search criteria, dates, or status filter.</div>
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

    const checkOutDisplay = v.check_out 
      ? `<div>${App.formatTime(v.check_out)}</div><div class="visitor-meta-sub">${App.formatDate(v.check_out)} (${v.duration})</div>`
      : `<span style="color: var(--primary); font-weight: 600;">Currently Inside</span>`;

    const vJsonEscaped = JSON.stringify(v).replace(/'/g, "&apos;");

    return `
      <tr id="row-${v.visitor_id}">
        <td>
          <a href="visitor-details.html?id=${encodeURIComponent(v.visitor_id)}" class="visitor-id-tag">
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
              <div class="visitor-meta-sub">${v.phone} • ${v.email}</div>
            </div>
          </div>
        </td>
        <td><strong>${v.organization}</strong></td>
        <td>${v.person_to_visit}</td>
        <td><span style="font-size: 0.84rem;">${v.purpose}</span></td>
        <td>
          <div>${App.formatTime(v.check_in)}</div>
          <div class="visitor-meta-sub">${App.formatDate(v.check_in)}</div>
        </td>
        <td>${checkOutDisplay}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="action-buttons">
            <a href="visitor-details.html?id=${encodeURIComponent(v.visitor_id)}" class="action-btn btn-view" title="View Full Details">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </a>

            <button class="action-btn" title="View / Print Visitor Pass" onclick='App.showPassModal(${vJsonEscaped})'>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h6"/></svg>
            </button>

            ${isInside ? `
              <button class="action-btn btn-checkout" title="Check Out Visitor" onclick="handleCheckoutAction('${v.visitor_id}', '${v.full_name.replace(/'/g, "\\'")}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
            ` : ''}

            <button class="action-btn" title="Edit Visitor Information" onclick="openEditModal('${v.visitor_id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>

            <button class="action-btn btn-delete" title="Delete Visitor Record" onclick="handleDeleteAction('${v.visitor_id}', '${v.full_name.replace(/'/g, "\\'")}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function handleCheckoutAction(visitorId, visitorName) {
  App.checkOutVisitor(visitorId, visitorName, () => {
    loadVisitorRecords(false);
  });
}

function handleDeleteAction(visitorId, visitorName) {
  App.deleteVisitor(visitorId, visitorName, () => {
    loadVisitorRecords(false);
  });
}

// Edit Modal Opening & Pre-filling
function openEditModal(visitorId) {
  const visitor = allLoadedVisitors.find(v => v.visitor_id === visitorId);
  if (!visitor) return;

  document.getElementById("edit-modal-title").textContent = `Edit Visitor: ${visitor.visitor_id}`;
  document.getElementById("edit-visitor-id").value = visitor.visitor_id;
  document.getElementById("edit-full-name").value = visitor.full_name;
  document.getElementById("edit-phone").value = visitor.phone;
  document.getElementById("edit-email").value = visitor.email;
  document.getElementById("edit-org").value = visitor.organization;
  document.getElementById("edit-person").value = visitor.person_to_visit;
  document.getElementById("edit-purpose").value = visitor.purpose;
  document.getElementById("edit-vehicle").value = visitor.vehicle_number || "";
  document.getElementById("edit-id-number").value = visitor.id_number || "";
  document.getElementById("edit-notes").value = visitor.notes || "";

  App.openModal("edit-visitor-modal");
}

async function handleEditFormSubmit(e) {
  e.preventDefault();
  const visitorId = document.getElementById("edit-visitor-id").value;
  const saveBtn = document.getElementById("btn-save-edit");

  const payload = {
    full_name: document.getElementById("edit-full-name").value.trim(),
    phone: document.getElementById("edit-phone").value.trim(),
    email: document.getElementById("edit-email").value.trim(),
    organization: document.getElementById("edit-org").value.trim(),
    person_to_visit: document.getElementById("edit-person").value.trim(),
    purpose: document.getElementById("edit-purpose").value.trim(),
    vehicle_number: document.getElementById("edit-vehicle").value.trim() || null,
    id_number: document.getElementById("edit-id-number").value.trim() || null,
    notes: document.getElementById("edit-notes").value.trim() || null
  };

  try {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    await App.fetchAPI(`/visitors/${visitorId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    App.toastSuccess("Record Updated", `Visitor record "${visitorId}" was successfully updated.`);
    App.closeModal("edit-visitor-modal");
    loadVisitorRecords(false);
  } catch (err) {
    App.toastError("Update Failed", err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Changes";
  }
}
