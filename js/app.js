/**
 * Main Application Orchestrator for StudyTrack
 * Handles UI events, form validation, assignment status,
 * editing, deletion, and rendering.
 */

import { loadAssignments, saveAssignments } from './storage.js';

// --- State Management ---
let assignments = [];
let editingAssignmentId = null;

// --- DOM Elements ---
const addForm = document.getElementById('add-assignment-form');
const assignmentsList = document.getElementById('assignments-list');
const emptyState = document.getElementById('empty-state');
const countBadge = document.getElementById('assignment-count');

// Add Assignment Form Inputs
const nameInput = document.getElementById('assignment-name');
const courseInput = document.getElementById('assignment-course');
const dateInput = document.getElementById('assignment-due-date');
const descInput = document.getElementById('assignment-desc');

// Edit Assignment Modal
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-assignment-form');
const editNameInput = document.getElementById('edit-assignment-name');
const editCourseInput = document.getElementById('edit-assignment-course');
const editDateInput = document.getElementById('edit-assignment-due-date');
const editDescInput = document.getElementById('edit-assignment-desc');
const closeEditModal = document.getElementById('close-edit-modal');
const cancelEdit = document.getElementById('cancel-edit');

// Filter & Sort Controls
const filterCourseSelect = document.getElementById('filter-course');
const filterStatusSelect = document.getElementById('filter-status');
const filterDeadlineSelect = document.getElementById('filter-deadline');
const sortBySelect = document.getElementById('sort-by');
const clearFiltersBtn = document.getElementById('clear-filters-btn');

// Progress Dashboard DOM Elements
const statTotal = document.getElementById('stat-total');
const statCompleted = document.getElementById('stat-completed');
const statInProgress = document.getElementById('stat-in-progress');
const statNotStarted = document.getElementById('stat-not-started');
const statCompletedRate = document.getElementById('stat-completed-rate');
const dashboardRateBadge = document.getElementById('dashboard-rate-badge');
const dashboardCompletionRate = document.getElementById('dashboard-completion-rate');
const dashboardProgressRatio = document.getElementById('dashboard-progress-ratio');
const dashboardProgressBar = document.getElementById('dashboard-progress-bar');
const dashboardProgressFill = document.getElementById('dashboard-progress-fill');
const dashboardRingFill = document.getElementById('dashboard-ring-fill');
const dashboardStatusMessage = document.getElementById('dashboard-status-message');

/**
 * Initializes the application.
 */
function init() {
  assignments = loadAssignments();

  if (addForm) {
    addForm.addEventListener('submit', handleAddFormSubmit);
  }

  if (editForm) {
    editForm.addEventListener('submit', handleEditFormSubmit);
  }

  if (closeEditModal) {
    closeEditModal.addEventListener('click', closeEditAssignmentModal);
  }

  if (cancelEdit) {
    cancelEdit.addEventListener('click', closeEditAssignmentModal);
  }

  if (editModal) {
    editModal.addEventListener('click', event => {
      if (event.target === editModal) {
        closeEditAssignmentModal();
      }
    });
  }

  // Global keydown handler for Escape key (date picker -> dropdowns -> edit modal)
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (isDatePickerOpen()) {
        closeDatePicker();
        event.stopPropagation();
        return;
      }
      if (document.querySelector('.custom-dropdown.open')) {
        closeAllCustomDropdowns();
        event.stopPropagation();
        return;
      }
      if (editModal && editModal.style.display === 'flex') {
        closeEditAssignmentModal();
      }
    }
  });

  // Global click outside listener to close custom dropdowns
  document.addEventListener('click', event => {
    if (!event.target.closest('.custom-dropdown')) {
      closeAllCustomDropdowns();
    }
  });

  // Filter & Sort event listeners
  if (filterCourseSelect) {
    filterCourseSelect.addEventListener('change', () => render());
  }

  if (filterStatusSelect) {
    filterStatusSelect.addEventListener('change', () => render());
  }

  if (filterDeadlineSelect) {
    filterDeadlineSelect.addEventListener('change', () => render());
  }

  if (sortBySelect) {
    sortBySelect.addEventListener('change', () => render());
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', handleClearFilters);
  }

  initDatePicker();

  // Attach date picker triggers for both sidebar and modal inputs
  document.querySelectorAll('.date-input-container').forEach(container => {
    const input = container.querySelector('input');
    const btn = container.querySelector('.date-picker-trigger');
    if (input) {
      input.addEventListener('click', e => {
        e.stopPropagation();
        openDatePicker(input);
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          openDatePicker(input);
        }
      });
    }
    if (btn) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (input) openDatePicker(input);
      });
    }
  });

  updateCourseFilterOptions();

  // Initialize custom glassmorphic dropdowns for filter panel
  [filterCourseSelect, filterStatusSelect, filterDeadlineSelect, sortBySelect].forEach(sel => {
    if (sel) setupCustomDropdown(sel);
  });

  render();
}

/**
 * Handles submission of the Add Assignment form.
 */
function handleAddFormSubmit(event) {
  event.preventDefault();

  if (!validateForm()) return;

  const newAssignment = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(),
    name: nameInput.value.trim(),
    course: courseInput.value.trim(),
    dueDate: dateInput.value,
    description: descInput.value.trim(),
    status: 'Not Started',
    createdAt: new Date().toISOString()
  };

  const updatedAssignments = [...assignments, newAssignment];

  if (saveAssignments(updatedAssignments)) {
    assignments = updatedAssignments;
    resetForm();
    updateCourseFilterOptions();
    render();
  }
}

/**
 * Handles status changes for an assignment.
 */
function handleStatusChange(id, newStatus) {
  const assignmentIndex = assignments.findIndex(
    assignment => assignment.id === id
  );

  if (assignmentIndex === -1) return;

  const updatedAssignments = [...assignments];

  updatedAssignments[assignmentIndex] = {
    ...updatedAssignments[assignmentIndex],
    status: newStatus,
    updatedAt: new Date().toISOString()
  };

  if (saveAssignments(updatedAssignments)) {
    assignments = updatedAssignments;
    render();
  }
}

/**
 * Handles deletion of an assignment.
 */
function handleDeleteAssignment(id) {
  const card = document.querySelector(`.btn-icon-delete[data-id="${id}"]`)?.closest('.assignment-card');
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const performDelete = () => {
    const updatedAssignments = assignments.filter(
      assignment => assignment.id !== id
    );

    if (saveAssignments(updatedAssignments)) {
      assignments = updatedAssignments;
      updateCourseFilterOptions();
      render();
    }
  };

  if (card && !prefersReducedMotion) {
    card.classList.add('card-deleting');
    setTimeout(performDelete, 220);
  } else {
    performDelete();
  }
}

/**
 * Opens the Edit Assignment modal and loads the selected assignment.
 */
function handleEditAssignment(id) {
  const assignment = assignments.find(
    assignment => assignment.id === id
  );

  if (!assignment) return;

  editingAssignmentId = id;

  editNameInput.value = assignment.name;
  editCourseInput.value = assignment.course;
  editDateInput.value = assignment.dueDate;
  editDescInput.value = assignment.description;

  clearEditErrors();

  if (editModal) {
    editModal.style.display = 'flex';
  }
}

/**
 * Handles submission of the Edit Assignment modal form.
 */
function handleEditFormSubmit(event) {
  event.preventDefault();

  if (!validateEditForm()) return;

  handleUpdateAssignment();
}

/**
 * Updates the selected assignment.
 */
function handleUpdateAssignment() {
  const assignmentIndex = assignments.findIndex(
    assignment => assignment.id === editingAssignmentId
  );

  if (assignmentIndex === -1) return;

  const updatedAssignment = {
    ...assignments[assignmentIndex],
    name: editNameInput.value.trim(),
    course: editCourseInput.value.trim(),
    dueDate: editDateInput.value,
    description: editDescInput.value.trim(),
    updatedAt: new Date().toISOString()
  };

  const updatedAssignments = [...assignments];

  updatedAssignments[assignmentIndex] = updatedAssignment;

  if (saveAssignments(updatedAssignments)) {
    assignments = updatedAssignments;
    closeEditAssignmentModal();
    updateCourseFilterOptions();
    render();
  }
}

/**
 * Validates the Add Assignment form.
 */
function validateForm() {
  let isValid = true;

  clearErrors();

  if (!nameInput.value.trim()) {
    showError(
      nameInput,
      'name-error',
      'Assignment name is required'
    );
    isValid = false;
  }

  if (!courseInput.value.trim()) {
    showError(
      courseInput,
      'course-error',
      'Course name is required'
    );
    isValid = false;
  }

  if (!dateInput.value) {
    showError(
      dateInput,
      'date-error',
      'Please select a due date'
    );
    isValid = false;
  }

  return isValid;
}

/**
 * Validates the Edit Assignment modal form.
 */
function validateEditForm() {
  let isValid = true;

  clearEditErrors();

  if (!editNameInput.value.trim()) {
    showEditError(
      editNameInput,
      'edit-name-error',
      'Assignment name is required'
    );
    isValid = false;
  }

  if (!editCourseInput.value.trim()) {
    showEditError(
      editCourseInput,
      'edit-course-error',
      'Course name is required'
    );
    isValid = false;
  }

  if (!editDateInput.value) {
    showEditError(
      editDateInput,
      'edit-date-error',
      'Please select a due date'
    );
    isValid = false;
  }

  return isValid;
}

/**
 * Displays an error message for the Add Assignment form.
 */
function showError(inputElement, errorId, message) {
  const errorSpan = document.getElementById(errorId);

  if (errorSpan) {
    errorSpan.textContent = message;
  }

  const group = inputElement.closest('.form-group');

  if (group) {
    group.classList.add('has-error');
  }
}

/**
 * Clears all Add Assignment form errors.
 */
function clearErrors() {
  const errorSpans = document.querySelectorAll(
    '#add-assignment-form .error-msg'
  );

  errorSpans.forEach(span => {
    span.textContent = '';
  });

  const groups = document.querySelectorAll(
    '#add-assignment-form .form-group'
  );

  groups.forEach(group => {
    group.classList.remove('has-error');
  });
}

/**
 * Displays an error message for the Edit Assignment form.
 */
function showEditError(inputElement, errorId, message) {
  const errorSpan = document.getElementById(errorId);

  if (errorSpan) {
    errorSpan.textContent = message;
  }

  const group = inputElement.closest('.form-group');

  if (group) {
    group.classList.add('has-error');
  }
}

/**
 * Clears all Edit Assignment form errors.
 */
function clearEditErrors() {
  const errorSpans = document.querySelectorAll(
    '#edit-assignment-form .error-msg'
  );

  errorSpans.forEach(span => {
    span.textContent = '';
  });

  const groups = document.querySelectorAll(
    '#edit-assignment-form .form-group'
  );

  groups.forEach(group => {
    group.classList.remove('has-error');
  });
}

/**
 * Resets the Add Assignment form.
 */
function resetForm() {
  if (addForm) {
    addForm.reset();
  }

  clearErrors();
  closeDatePicker();
}

/**
 * Closes the Edit Assignment modal.
 */
function closeEditAssignmentModal() {
  closeDatePicker();
  closeAllCustomDropdowns();

  if (editModal) {
    editModal.style.display = 'none';
  }

  if (editForm) {
    editForm.reset();
  }

  editingAssignmentId = null;
  clearEditErrors();
}

/**
 * Updates the course filter dropdown options dynamically based on current assignments.
 */
function updateCourseFilterOptions() {
  if (!filterCourseSelect) return;

  const currentSelection = filterCourseSelect.value;
  const courses = [
    ...new Set(
      assignments
        .map(a => (a.course ? a.course.trim() : ''))
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  filterCourseSelect.innerHTML = '<option value="all">All Courses</option>';

  courses.forEach(course => {
    const option = document.createElement('option');
    option.value = course;
    option.textContent = course;
    filterCourseSelect.appendChild(option);
  });

  if (currentSelection && courses.includes(currentSelection)) {
    filterCourseSelect.value = currentSelection;
  } else {
    filterCourseSelect.value = 'all';
  }

  syncCustomDropdown(filterCourseSelect);
}

/**
 * Resets all filters and sorting controls to their default values.
 */
function handleClearFilters() {
  if (filterCourseSelect) filterCourseSelect.value = 'all';
  if (filterStatusSelect) filterStatusSelect.value = 'all';
  if (filterDeadlineSelect) filterDeadlineSelect.value = 'all';
  if (sortBySelect) sortBySelect.value = 'due-asc';

  [filterCourseSelect, filterStatusSelect, filterDeadlineSelect, sortBySelect].forEach(sel => {
    if (sel) syncCustomDropdown(sel);
  });

  render();
}

/**
 * Computes deadline urgency, status, and presentation details for an assignment.
 * @param {string} dueDateString - Due date string in YYYY-MM-DD format
 * @param {string} status - Assignment status ('Not Started', 'In Progress', 'Completed')
 * @returns {object} Status metadata including category, badges, and CSS classes
 */
function getDeadlineInfo(dueDateString, status) {
  if (!dueDateString) {
    return {
      category: 'upcoming',
      isOverdue: false,
      isDueSoon: false,
      isUpcoming: false,
      label: 'No Due Date',
      icon: 'bx bx-calendar',
      badgeClass: 'upcoming',
      dateClass: ''
    };
  }

  if (status === 'Completed') {
    return {
      category: 'completed',
      isOverdue: false,
      isDueSoon: false,
      isUpcoming: false,
      label: 'Completed',
      icon: 'bx bxs-check-circle',
      badgeClass: 'completed',
      dateClass: 'completed'
    };
  }

  // Normalize both dates to midnight local time for calendar-accurate comparison
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const parts = dueDateString.split('-');
  const dueYear = parseInt(parts[0], 10);
  const dueMonth = parseInt(parts[1], 10) - 1;
  const dueDay = parseInt(parts[2], 10);
  const dueDate = new Date(dueYear, dueMonth, dueDay);

  const diffMs = dueDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysAgo = Math.abs(diffDays);
    const dayText = daysAgo === 1 ? '1 day' : `${daysAgo} days`;
    return {
      category: 'overdue',
      isOverdue: true,
      isDueSoon: false,
      isUpcoming: false,
      label: `Overdue (${dayText})`,
      icon: 'bx bx-error-circle',
      badgeClass: 'overdue',
      dateClass: 'overdue urgent'
    };
  }

  if (diffDays === 0) {
    return {
      category: 'due-soon',
      isOverdue: false,
      isDueSoon: true,
      isUpcoming: true,
      label: 'Due Today',
      icon: 'bx bx-time',
      badgeClass: 'due-soon',
      dateClass: 'due-today urgent'
    };
  }

  if (diffDays === 1) {
    return {
      category: 'due-soon',
      isOverdue: false,
      isDueSoon: true,
      isUpcoming: true,
      label: 'Due Tomorrow',
      icon: 'bx bx-time',
      badgeClass: 'due-soon',
      dateClass: 'urgent'
    };
  }

  if (diffDays <= 2) {
    return {
      category: 'due-soon',
      isOverdue: false,
      isDueSoon: true,
      isUpcoming: true,
      label: `Due in ${diffDays} days`,
      icon: 'bx bx-time',
      badgeClass: 'due-soon',
      dateClass: 'urgent'
    };
  }

  return {
    category: 'upcoming',
    isOverdue: false,
    isDueSoon: false,
    isUpcoming: true,
    label: diffDays <= 7 ? `Due in ${diffDays} days` : 'Upcoming',
    icon: 'bx bx-calendar-check',
    badgeClass: 'upcoming',
    dateClass: ''
  };
}

/**
 * Calculates dashboard statistics based on all saved assignments.
 * @param {Array} allAssignments - Array of all saved assignment objects.
 * @returns {{total: number, completed: number, inProgress: number, notStarted: number, completionRate: number}} Dashboard statistics.
 */
export function calculateDashboardStats(allAssignments = []) {
  const total = allAssignments.length;
  let completed = 0;
  let inProgress = 0;
  let notStarted = 0;

  for (const assignment of allAssignments) {
    const status = assignment && assignment.status ? assignment.status.trim() : '';
    if (status === 'Completed') {
      completed++;
    } else if (status === 'In Progress') {
      inProgress++;
    } else if (status === 'Not Started') {
      notStarted++;
    }
  }

  // Calculate completion rate percentage safely, avoiding division by zero
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    inProgress,
    notStarted,
    completionRate
  };
}

/**
 * Updates the Progress Dashboard UI elements with statistics from all saved assignments.
 * @param {Array} [allAssignments=assignments] - Array of all saved assignments.
 * @returns {object} The calculated statistics.
 */
export function updateDashboard(allAssignments = assignments) {
  const stats = calculateDashboardStats(allAssignments);

  if (statTotal) {
    statTotal.textContent = String(stats.total);
  }

  if (statCompleted) {
    statCompleted.textContent = String(stats.completed);
  }

  if (statInProgress) {
    statInProgress.textContent = String(stats.inProgress);
  }

  if (statNotStarted) {
    statNotStarted.textContent = String(stats.notStarted);
  }

  if (statCompletedRate) {
    statCompletedRate.textContent = `${stats.completionRate}% completion`;
  }

  if (dashboardRateBadge) {
    dashboardRateBadge.textContent = `${stats.completionRate}% Completed`;
  }

  if (dashboardCompletionRate) {
    dashboardCompletionRate.textContent = `${stats.completionRate}%`;
  }

  if (dashboardProgressRatio) {
    dashboardProgressRatio.textContent = `${stats.completed} of ${stats.total} Completed`;
  }

  if (dashboardProgressBar) {
    dashboardProgressBar.setAttribute('aria-valuenow', String(stats.completionRate));
    dashboardProgressBar.setAttribute('aria-valuetext', `${stats.completionRate}% completed`);
  }

  if (dashboardProgressFill) {
    dashboardProgressFill.style.width = `${stats.completionRate}%`;
  }

  if (dashboardRingFill) {
    const circumference = 314.16;
    const offset = circumference - (stats.completionRate / 100) * circumference;
    dashboardRingFill.style.strokeDashoffset = String(offset);
  }

  if (dashboardStatusMessage) {
    if (stats.total === 0) {
      dashboardStatusMessage.textContent = 'No assignments yet. Add an assignment to start tracking your progress.';
    } else if (stats.completionRate === 100) {
      dashboardStatusMessage.textContent = 'All assignments completed! Outstanding work! 🎉';
    } else if (stats.completionRate >= 75) {
      dashboardStatusMessage.textContent = 'Almost there! Just a few assignments left.';
    } else if (stats.completionRate >= 50) {
      dashboardStatusMessage.textContent = 'Great progress! You are more than halfway through.';
    } else if (stats.completionRate > 0) {
      dashboardStatusMessage.textContent = 'Good start! Keep up the momentum.';
    } else {
      dashboardStatusMessage.textContent = 'Ready to begin? Choose an assignment to start working on.';
    }
  }

  return stats;
}

/**
 * Renders the filtered and sorted assignment list and updates the UI.
 */
function render() {
  // Always update dashboard statistics from all saved assignments
  updateDashboard(assignments);

  const selectedCourse = filterCourseSelect ? filterCourseSelect.value : 'all';
  const selectedStatus = filterStatusSelect ? filterStatusSelect.value : 'all';
  const selectedDeadline = filterDeadlineSelect ? filterDeadlineSelect.value : 'all';
  const selectedSort = sortBySelect ? sortBySelect.value : 'due-asc';

  const isFilteringActive =
    selectedCourse !== 'all' ||
    selectedStatus !== 'all' ||
    selectedDeadline !== 'all';

  // Apply filters non-destructively
  let filtered = assignments.filter(assignment => {
    // Filter by Course
    if (selectedCourse !== 'all' && assignment.course !== selectedCourse) {
      return false;
    }

    // Filter by Status
    if (selectedStatus !== 'all' && assignment.status !== selectedStatus) {
      return false;
    }

    // Filter by Deadline
    if (selectedDeadline !== 'all') {
      const deadlineInfo = getDeadlineInfo(assignment.dueDate, assignment.status);
      if (selectedDeadline === 'upcoming' && !deadlineInfo.isUpcoming) {
        return false;
      }
      if (selectedDeadline === 'due-soon' && !deadlineInfo.isDueSoon) {
        return false;
      }
      if (selectedDeadline === 'overdue' && !deadlineInfo.isOverdue) {
        return false;
      }
    }

    return true;
  });

  // Apply sorting
  filtered.sort((a, b) => {
    if (selectedSort === 'due-desc') {
      return new Date(b.dueDate + 'T00:00:00') - new Date(a.dueDate + 'T00:00:00');
    }
    if (selectedSort === 'name-asc') {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
    // Default: 'due-asc'
    return new Date(a.dueDate + 'T00:00:00') - new Date(b.dueDate + 'T00:00:00');
  });

  // Update assignment count badge
  if (countBadge) {
    if (isFilteringActive) {
      countBadge.textContent = `Showing ${filtered.length} of ${assignments.length} Assignment${assignments.length !== 1 ? 's' : ''}`;
    } else {
      countBadge.textContent = `${assignments.length} Assignment${assignments.length !== 1 ? 's' : ''}`;
    }
  }

  if (!assignmentsList) return;

  assignmentsList.innerHTML = '';

  // Handle total empty state (no assignments in app at all)
  if (assignments.length === 0) {
    if (emptyState) {
      emptyState.style.display = 'block';
      assignmentsList.appendChild(emptyState);
    }
    return;
  }

  // Handle filter empty state (assignments exist, but none match criteria)
  if (filtered.length === 0) {
    const filterEmpty = document.createElement('div');
    filterEmpty.className = 'empty-state filter-empty-state';
    filterEmpty.innerHTML = `
      <div class="empty-icon">
        <i class="bx bx-filter-alt"></i>
      </div>
      <h3>No matching assignments</h3>
      <p>No assignments match the selected filter criteria. Try adjusting or clearing your filters.</p>
      <button type="button" class="btn btn-secondary inline-reset-btn" id="inline-clear-filters">
        <i class="bx bx-reset"></i> Reset Filters
      </button>
    `;

    const inlineBtn = filterEmpty.querySelector('#inline-clear-filters');
    if (inlineBtn) {
      inlineBtn.addEventListener('click', handleClearFilters);
    }

    assignmentsList.appendChild(filterEmpty);
    return;
  }

  if (emptyState) {
    emptyState.style.display = 'none';
  }

  // Render assignment cards
  filtered.forEach(assignment => {
    const card = createAssignmentCard(assignment);
    assignmentsList.appendChild(card);
  });
}

/**
 * Creates a DOM element for an assignment card.
 */
function createAssignmentCard(assignment) {
  const div = document.createElement('div');

  const statusClass = assignment.status
    .toLowerCase()
    .replace(/\s+/g, '-');

  div.className = `assignment-card status-${statusClass}`;

  const deadlineInfo = getDeadlineInfo(assignment.dueDate, assignment.status);

  div.innerHTML = `
    <div class="card-top">
      <div class="card-title-group">
        <h3>${escapeHtml(assignment.name)}</h3>
        <div class="card-tags">
          <span class="card-course">
            ${escapeHtml(assignment.course)}
          </span>
          <span class="deadline-badge ${deadlineInfo.badgeClass}">
            <i class="${deadlineInfo.icon}"></i> ${escapeHtml(deadlineInfo.label)}
          </span>
        </div>
      </div>

      <div class="status-container">
        <select
          class="status-badge ${statusClass}"
          aria-label="Change assignment status"
        >
          <option
            value="Not Started"
            ${assignment.status === 'Not Started' ? 'selected' : ''}
          >
            Not Started
          </option>

          <option
            value="In Progress"
            ${assignment.status === 'In Progress' ? 'selected' : ''}
          >
            In Progress
          </option>

          <option
            value="Completed"
            ${assignment.status === 'Completed' ? 'selected' : ''}
          >
            Completed
          </option>
        </select>
      </div>
    </div>

    ${
      assignment.description
        ? `
          <p class="card-description">
            ${escapeHtml(assignment.description)}
          </p>
        `
        : ''
    }

    <div class="card-footer">
      <div class="card-due-date ${deadlineInfo.dateClass}">
        <i class="bx bx-calendar"></i>
        Due: ${formatDate(assignment.dueDate)}
      </div>

      <div class="card-actions">
        <button
          class="btn-icon btn-icon-edit"
          title="Edit Assignment"
          aria-label="Edit Assignment"
          data-id="${assignment.id}"
        >
          <i class="bx bx-edit-alt"></i>
        </button>

        <button
          class="btn-icon btn-icon-delete"
          title="Delete Assignment"
          aria-label="Delete Assignment"
          data-id="${assignment.id}"
        >
          <i class="bx bx-trash"></i>
        </button>
      </div>
    </div>
  `;

  // Status change
  const statusSelect = div.querySelector('.status-badge');

  if (statusSelect) {
    statusSelect.addEventListener('change', event => {
      handleStatusChange(
        assignment.id,
        event.target.value
      );
    });

    setupCustomDropdown(statusSelect);
  }

  // Edit button
  const editButton = div.querySelector('.btn-icon-edit');

  if (editButton) {
    editButton.addEventListener('click', () => {
      handleEditAssignment(assignment.id);
    });
  }

  // Delete button
  const deleteButton = div.querySelector('.btn-icon-delete');

  if (deleteButton) {
    deleteButton.addEventListener('click', () => {
      handleDeleteAssignment(assignment.id);
    });
  }

  return div;
}

/**
 * Formats an ISO date string into a readable date.
 */
function formatDate(dateString) {
  const options = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  };

  // Use T00:00:00 to avoid timezone shifts.
  return new Date(
    dateString + 'T00:00:00'
  ).toLocaleDateString(
    undefined,
    options
  );
}

/**
 * Checks if a date is within the next 48 hours.
 */
function isUrgent(dateString) {
  const dueDate = new Date(
    dateString + 'T00:00:00'
  );

  const now = new Date();
  const diff = dueDate - now;
  const fortyEightHours = 48 * 60 * 60 * 1000;

  return diff > 0 && diff < fortyEightHours;
}

/**
 * Escapes HTML to prevent XSS.
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==========================================================================
// Custom Glassmorphic Date Picker Implementation
// ==========================================================================

let datePickerEl = null;
let activeDateInput = null;
let pickerCurrentYear = new Date().getFullYear();
let pickerCurrentMonth = new Date().getMonth();
let selectedDateString = '';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Initializes the singleton custom date picker element and attaches global handlers.
 */
function initDatePicker() {
  if (datePickerEl) return;

  datePickerEl = document.createElement('div');
  datePickerEl.className = 'glass-datepicker';
  datePickerEl.id = 'studytrack-glass-datepicker';
  datePickerEl.setAttribute('role', 'dialog');
  datePickerEl.setAttribute('aria-label', 'Choose date');
  datePickerEl.style.display = 'none';

  datePickerEl.innerHTML = `
    <div class="datepicker-header">
      <button type="button" class="datepicker-nav-btn prev-month-btn" aria-label="Previous month">
        <i class="bx bx-chevron-left"></i>
      </button>
      <span class="datepicker-title" aria-live="polite"></span>
      <button type="button" class="datepicker-nav-btn next-month-btn" aria-label="Next month">
        <i class="bx bx-chevron-right"></i>
      </button>
    </div>
    <div class="datepicker-weekdays" aria-hidden="true">
      <span>Su</span>
      <span>Mo</span>
      <span>Tu</span>
      <span>We</span>
      <span>Th</span>
      <span>Fr</span>
      <span>Sa</span>
    </div>
    <div class="datepicker-grid" role="grid"></div>
    <div class="datepicker-footer">
      <button type="button" class="datepicker-today-btn">Today</button>
      <button type="button" class="datepicker-clear-btn">Clear</button>
    </div>
  `;

  document.body.appendChild(datePickerEl);

  const prevBtn = datePickerEl.querySelector('.prev-month-btn');
  const nextBtn = datePickerEl.querySelector('.next-month-btn');
  const todayBtn = datePickerEl.querySelector('.datepicker-today-btn');
  const clearBtn = datePickerEl.querySelector('.datepicker-clear-btn');

  prevBtn.addEventListener('click', event => {
    event.stopPropagation();
    pickerCurrentMonth--;
    if (pickerCurrentMonth < 0) {
      pickerCurrentMonth = 11;
      pickerCurrentYear--;
    }
    renderDatePickerCalendar();
  });

  nextBtn.addEventListener('click', event => {
    event.stopPropagation();
    pickerCurrentMonth++;
    if (pickerCurrentMonth > 11) {
      pickerCurrentMonth = 0;
      pickerCurrentYear++;
    }
    renderDatePickerCalendar();
  });

  todayBtn.addEventListener('click', event => {
    event.stopPropagation();
    const now = new Date();
    const todayFormatted = formatToYYYYMMDD(now.getFullYear(), now.getMonth() + 1, now.getDate());
    selectDate(todayFormatted);
  });

  clearBtn.addEventListener('click', event => {
    event.stopPropagation();
    clearDate();
  });

  // Stop clicks inside the calendar popover from bubbling up to document
  datePickerEl.addEventListener('click', event => {
    event.stopPropagation();
  });

  // Outside click to close date picker
  document.addEventListener('click', event => {
    if (!isDatePickerOpen()) return;
    const container = activeDateInput ? activeDateInput.closest('.date-input-container') : null;
    if (datePickerEl.contains(event.target) || (container && container.contains(event.target))) {
      return;
    }
    closeDatePicker();
  });

  // Keep datepicker positioned on window resize or scroll
  window.addEventListener('resize', () => {
    if (isDatePickerOpen() && activeDateInput) {
      positionDatePicker(activeDateInput);
    }
  });

  window.addEventListener('scroll', () => {
    if (isDatePickerOpen() && activeDateInput) {
      positionDatePicker(activeDateInput);
    }
  }, true);
}

/**
 * Checks whether the date picker is currently displayed.
 * @returns {boolean}
 */
function isDatePickerOpen() {
  return !!(datePickerEl && datePickerEl.style.display === 'block');
}

/**
 * Opens the custom date picker for a specific date input element.
 * @param {HTMLInputElement} input - Target date input
 */
function openDatePicker(input) {
  if (!input) return;

  // Toggle if clicked while already open for the same input
  if (isDatePickerOpen() && activeDateInput === input) {
    closeDatePicker();
    return;
  }

  activeDateInput = input;
  closeAllCustomDropdowns();

  if (input.value && /^\d{4}-\d{2}-\d{2}$/.test(input.value.trim())) {
    const parts = input.value.trim().split('-');
    pickerCurrentYear = parseInt(parts[0], 10);
    pickerCurrentMonth = parseInt(parts[1], 10) - 1;
    selectedDateString = input.value.trim();
  } else {
    const now = new Date();
    pickerCurrentYear = now.getFullYear();
    pickerCurrentMonth = now.getMonth();
    selectedDateString = '';
  }

  renderDatePickerCalendar();
  positionDatePicker(input);
}

/**
 * Closes the date picker and cleans up active references.
 */
function closeDatePicker() {
  if (datePickerEl) {
    datePickerEl.style.display = 'none';
  }
  activeDateInput = null;
}

/**
 * Positions the date picker fixed near the target input within viewport bounds.
 * @param {HTMLInputElement} input - The input element to anchor to.
 */
function positionDatePicker(input) {
  if (!datePickerEl || !input) return;

  datePickerEl.style.display = 'block';
  datePickerEl.style.position = 'fixed';
  datePickerEl.style.visibility = 'hidden';

  const rect = input.getBoundingClientRect();
  const pickerWidth = datePickerEl.offsetWidth || 310;
  const pickerHeight = datePickerEl.offsetHeight || 330;
  const margin = 8;

  let top = rect.bottom + margin;
  let left = rect.left;

  // Horizontal containment
  if (left + pickerWidth > window.innerWidth - 10) {
    left = window.innerWidth - pickerWidth - 10;
  }
  if (left < 10) {
    left = 10;
  }

  // Vertical positioning: try below first, flip above if bottom overflows
  if (top + pickerHeight > window.innerHeight - 10) {
    if (rect.top - pickerHeight - margin >= 10) {
      top = rect.top - pickerHeight - margin;
    }
  }

  // Final vertical viewport containment
  if (top + pickerHeight > window.innerHeight - 10) {
    top = window.innerHeight - pickerHeight - 10;
  }
  if (top < 10) {
    top = 10;
  }

  datePickerEl.style.top = `${Math.round(top)}px`;
  datePickerEl.style.left = `${Math.round(left)}px`;
  datePickerEl.style.visibility = 'visible';
}

/**
 * Renders days grid and header for pickerCurrentYear and pickerCurrentMonth.
 */
function renderDatePickerCalendar() {
  if (!datePickerEl) return;

  const titleEl = datePickerEl.querySelector('.datepicker-title');
  const gridEl = datePickerEl.querySelector('.datepicker-grid');

  titleEl.textContent = `${MONTH_NAMES[pickerCurrentMonth]} ${pickerCurrentYear}`;
  gridEl.innerHTML = '';
  gridEl.classList.remove('calendar-changing');
  void gridEl.offsetWidth;
  gridEl.classList.add('calendar-changing');

  const now = new Date();
  const todayStr = formatToYYYYMMDD(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const firstDay = new Date(pickerCurrentYear, pickerCurrentMonth, 1).getDay();
  const daysInCurrentMonth = new Date(pickerCurrentYear, pickerCurrentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(pickerCurrentYear, pickerCurrentMonth, 0).getDate();

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonth = pickerCurrentMonth === 0 ? 11 : pickerCurrentMonth - 1;
    const prevYear = pickerCurrentMonth === 0 ? pickerCurrentYear - 1 : pickerCurrentYear;
    const dateStr = formatToYYYYMMDD(prevYear, prevMonth + 1, dayNum);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'datepicker-day other-month';
    btn.textContent = String(dayNum);
    btn.setAttribute('aria-label', dateStr);
    btn.dataset.date = dateStr;
    btn.addEventListener('click', () => selectDate(dateStr));
    gridEl.appendChild(btn);
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = formatToYYYYMMDD(pickerCurrentYear, pickerCurrentMonth + 1, d);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'datepicker-day';
    btn.textContent = String(d);
    btn.setAttribute('aria-label', dateStr);
    btn.dataset.date = dateStr;

    if (dateStr === todayStr) {
      btn.classList.add('today');
    }
    if (dateStr === selectedDateString) {
      btn.classList.add('selected');
    }

    btn.addEventListener('click', () => selectDate(dateStr));
    gridEl.appendChild(btn);
  }

  // Next month leading days to complete grid row
  const totalCells = firstDay + daysInCurrentMonth;
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let d = 1; d <= remainingCells; d++) {
    const nextMonth = pickerCurrentMonth === 11 ? 0 : pickerCurrentMonth + 1;
    const nextYear = pickerCurrentMonth === 11 ? pickerCurrentYear + 1 : pickerCurrentYear;
    const dateStr = formatToYYYYMMDD(nextYear, nextMonth + 1, d);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'datepicker-day other-month';
    btn.textContent = String(d);
    btn.setAttribute('aria-label', dateStr);
    btn.dataset.date = dateStr;
    btn.addEventListener('click', () => selectDate(dateStr));
    gridEl.appendChild(btn);
  }
}

/**
 * Selects a date string (YYYY-MM-DD), updates the active input, triggers events, and closes the picker.
 * @param {string} dateStr - Date string in YYYY-MM-DD
 */
function selectDate(dateStr) {
  if (!activeDateInput) return;

  activeDateInput.value = dateStr;
  selectedDateString = dateStr;

  const formGroup = activeDateInput.closest('.form-group');
  if (formGroup) {
    formGroup.classList.remove('has-error');
    const errorSpan = formGroup.querySelector('.error-msg');
    if (errorSpan) errorSpan.textContent = '';
  }

  activeDateInput.dispatchEvent(new Event('input', { bubbles: true }));
  activeDateInput.dispatchEvent(new Event('change', { bubbles: true }));

  closeDatePicker();
}

/**
 * Clears the active date input and closes the picker.
 */
function clearDate() {
  if (!activeDateInput) return;

  activeDateInput.value = '';
  selectedDateString = '';

  activeDateInput.dispatchEvent(new Event('input', { bubbles: true }));
  activeDateInput.dispatchEvent(new Event('change', { bubbles: true }));

  closeDatePicker();
}

/**
 * Formats year, month, and day into YYYY-MM-DD.
 * @param {number} year - Full year (e.g. 2026)
 * @param {number} month - 1-indexed month (1-12)
 * @param {number} day - Day of month (1-31)
 * @returns {string} Formatted date string
 */
function formatToYYYYMMDD(year, month, day) {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ==========================================================================
// Custom Glassmorphic Dropdowns Implementation
// ==========================================================================

/**
 * Sets up a custom glassmorphic dropdown replacement for a native select element.
 * @param {HTMLSelectElement} select - The native select element to enhance.
 */
function setupCustomDropdown(select) {
  if (!select) return;

  if (select._customDropdown) {
    syncCustomDropdown(select);
    return;
  }

  const isStatusBadge = select.classList.contains('status-badge');

  const wrapper = document.createElement('div');
  wrapper.className = isStatusBadge
    ? 'custom-dropdown custom-status-container'
    : 'custom-dropdown';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = isStatusBadge
    ? `status-badge ${select.value.toLowerCase().replace(/\s+/g, '-')}`
    : 'custom-dropdown-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');

  const labelSpan = document.createElement('span');
  labelSpan.className = 'custom-dropdown-label';

  const icon = document.createElement('i');
  icon.className = 'bx bx-chevron-down custom-dropdown-icon';

  trigger.appendChild(labelSpan);
  trigger.appendChild(icon);

  const menu = document.createElement('div');
  menu.className = 'custom-dropdown-menu';
  menu.setAttribute('role', 'listbox');

  wrapper.appendChild(trigger);
  wrapper.appendChild(menu);

  select.style.display = 'none';
  select.setAttribute('tabindex', '-1');
  select.setAttribute('aria-hidden', 'true');

  select.parentNode.insertBefore(wrapper, select.nextSibling);

  select._customDropdown = wrapper;
  wrapper._nativeSelect = select;
  wrapper._trigger = trigger;
  wrapper._labelSpan = labelSpan;
  wrapper._menu = menu;

  const toggleDropdown = () => {
    const isOpen = wrapper.classList.contains('open');
    closeAllCustomDropdowns();
    closeDatePicker();
    if (!isOpen) {
      wrapper.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      const formGroup = wrapper.closest('.form-group');
      if (formGroup) formGroup.classList.add('dropdown-open');
      const card = wrapper.closest('.assignment-card');
      if (card) card.classList.add('dropdown-open');
    }
  };

  trigger.addEventListener('click', event => {
    event.stopPropagation();
    toggleDropdown();
  });

  trigger.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      toggleDropdown();
    }
  });

  select.addEventListener('change', () => {
    syncCustomDropdown(select);
  });

  syncCustomDropdown(select);
}

/**
 * Synchronizes custom dropdown menu and trigger label with native select state.
 * @param {HTMLSelectElement} select - Native select element.
 */
function syncCustomDropdown(select) {
  if (!select || !select._customDropdown) return;

  const wrapper = select._customDropdown;
  const trigger = wrapper._trigger;
  const labelSpan = wrapper._labelSpan;
  const menu = wrapper._menu;
  const isStatusBadge = select.classList.contains('status-badge');

  const selectedOption = select.options[select.selectedIndex] || select.options[0];
  const currentValue = selectedOption ? selectedOption.value : '';
  const currentText = selectedOption ? selectedOption.textContent.trim() : '';

  labelSpan.textContent = currentText;

  if (isStatusBadge) {
    const statusClass = currentValue.toLowerCase().replace(/\s+/g, '-');
    trigger.className = `status-badge ${statusClass}`;
  }

  menu.innerHTML = '';

  Array.from(select.options).forEach(opt => {
    const item = document.createElement('div');
    item.className = 'custom-dropdown-item';
    if (opt.value === currentValue) {
      item.classList.add('selected');
    }
    item.setAttribute('role', 'option');
    item.setAttribute('data-value', opt.value);
    item.textContent = opt.textContent.trim();

    item.addEventListener('click', event => {
      event.stopPropagation();
      const valueChanged = select.value !== opt.value;
      select.value = opt.value;
      closeAllCustomDropdowns();
      syncCustomDropdown(select);

      if (valueChanged) {
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    menu.appendChild(item);
  });
}

/**
 * Closes all active custom dropdowns across the page.
 */
function closeAllCustomDropdowns() {
  document.querySelectorAll('.custom-dropdown.open').forEach(dd => {
    dd.classList.remove('open');
    const tr = dd.querySelector('button[aria-expanded]');
    if (tr) tr.setAttribute('aria-expanded', 'false');
  });

  document.querySelectorAll('.form-group.dropdown-open').forEach(fg => {
    fg.classList.remove('dropdown-open');
  });

  document.querySelectorAll('.assignment-card.dropdown-open').forEach(card => {
    card.classList.remove('dropdown-open');
  });
}

// Start the application.
init();