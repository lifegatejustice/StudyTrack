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
  const updatedAssignments = assignments.filter(
    assignment => assignment.id !== id
  );

  if (saveAssignments(updatedAssignments)) {
    assignments = updatedAssignments;
    render();
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
}

/**
 * Closes the Edit Assignment modal.
 */
function closeEditAssignmentModal() {
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
 * Renders the assignment list and updates the UI.
 */
function render() {
  // Update assignment count
  if (countBadge) {
    countBadge.textContent =
      `${assignments.length} Assignment${assignments.length !== 1 ? 's' : ''}`;
  }

  // Handle empty state
  if (assignments.length === 0) {
    if (assignmentsList) {
      assignmentsList.innerHTML = '';

      if (emptyState) {
        assignmentsList.appendChild(emptyState);
        emptyState.style.display = 'block';
      }
    }

    return;
  }

  if (emptyState) {
    emptyState.style.display = 'none';
  }

  if (assignmentsList) {
    assignmentsList.innerHTML = '';

    // Sort assignments by due date
    const sorted = [...assignments].sort(
      (a, b) =>
        new Date(a.dueDate) - new Date(b.dueDate)
    );

    sorted.forEach(assignment => {
      const card = createAssignmentCard(assignment);
      assignmentsList.appendChild(card);
    });
  }
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

  div.innerHTML = `
    <div class="card-top">
      <div class="card-title-group">
        <h3>${escapeHtml(assignment.name)}</h3>
        <span class="card-course">
          ${escapeHtml(assignment.course)}
        </span>
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
      <div
        class="card-due-date ${
          isUrgent(assignment.dueDate) ? 'urgent' : ''
        }"
      >
        <i class="fa-regular fa-calendar-days"></i>
        Due: ${formatDate(assignment.dueDate)}
      </div>

      <div class="card-actions">
        <button
          class="btn-icon btn-icon-edit"
          title="Edit Assignment"
          data-id="${assignment.id}"
        >
          <i class="fa-solid fa-pen-to-square"></i>
        </button>

        <button
          class="btn-icon btn-icon-delete"
          title="Delete Assignment"
          data-id="${assignment.id}"
        >
          <i class="fa-solid fa-trash-can"></i>
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

// Start the application.
init();