/**
 * Main Application Orchestrator for StudyTrack
 * Handles UI events, form validation, and rendering.
 */

import { loadAssignments, saveAssignments } from './storage.js';

// --- State Management ---
let assignments = [];

// --- DOM Elements ---
const addForm = document.getElementById('add-assignment-form');
const assignmentsList = document.getElementById('assignments-list');
const emptyState = document.getElementById('empty-state');
const countBadge = document.getElementById('assignment-count');

// Form Inputs
const nameInput = document.getElementById('assignment-name');
const courseInput = document.getElementById('assignment-course');
const dateInput = document.getElementById('assignment-due-date');
const descInput = document.getElementById('assignment-desc');

/**
 * Initializes the application.
 */
function init() {
  // Load initial data
  assignments = loadAssignments();
  
  // Set up event listeners
  if (addForm) {
    addForm.addEventListener('submit', handleAddAssignment);
  }
  
  // Initial Render
  render();
}

/**
 * Handles the submission of the "Add Assignment" form.
 */
function handleAddAssignment(event) {
  event.preventDefault();
  
  if (!validateForm()) return;

  const newAssignment = {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    name: nameInput.value.trim(),
    course: courseInput.value.trim(),
    dueDate: dateInput.value,
    description: descInput.value.trim(),
    status: 'Not Started',
    createdAt: new Date().toISOString()
  };

  assignments.push(newAssignment);
  
  if (saveAssignments(assignments)) {
    addForm.reset();
    clearErrors();
    render();
  }
}

/**
 * Validates the form fields.
 */
function validateForm() {
  let isValid = true;
  clearErrors();

  if (!nameInput.value.trim()) {
    showError(nameInput, 'name-error', 'Assignment name is required');
    isValid = false;
  }

  if (!courseInput.value.trim()) {
    showError(courseInput, 'course-error', 'Course name is required');
    isValid = false;
  }

  if (!dateInput.value) {
    showError(dateInput, 'date-error', 'Please select a due date');
    isValid = false;
  }

  return isValid;
}

/**
 * Displays an error message for a specific field.
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
 * Clears all form errors.
 */
function clearErrors() {
  const errorSpans = document.querySelectorAll('.error-msg');
  errorSpans.forEach(span => span.textContent = '');
  
  const groups = document.querySelectorAll('.form-group');
  groups.forEach(group => group.classList.remove('has-error'));
}

/**
 * Renders the assignment list and updates UI state.
 */
function render() {
  // Update count badge
  if (countBadge) {
    countBadge.textContent = `${assignments.length} Assignment${assignments.length !== 1 ? 's' : ''}`;
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

    // Sort assignments by date (soonest first)
    const sorted = [...assignments].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

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
  div.className = `assignment-card status-${assignment.status.toLowerCase().replace(' ', '-')}`;
  
  const statusClass = assignment.status.toLowerCase().replace(' ', '-');
  
  div.innerHTML = `
    <div class="card-top">
      <div class="card-title-group">
        <h3>${escapeHtml(assignment.name)}</h3>
        <span class="card-course">${escapeHtml(assignment.course)}</span>
      </div>
      <span class="status-badge ${statusClass}">
        ${getStatusIcon(assignment.status)} ${assignment.status}
      </span>
    </div>
    
    ${assignment.description ? `<p class="card-description">${escapeHtml(assignment.description)}</p>` : ''}
    
    <div class="card-footer">
      <div class="card-due-date ${isUrgent(assignment.dueDate) ? 'urgent' : ''}">
        📅 Due: ${formatDate(assignment.dueDate)}
      </div>
      <div class="card-actions">
        <button class="btn-icon btn-icon-edit" title="Edit (Sprint 2)">
          ✏️
        </button>
        <button class="btn-icon btn-icon-delete" title="Delete (Sprint 2)">
          🗑️
        </button>
      </div>
    </div>
  `;
  
  return div;
}

/**
 * Helper: Formats ISO date string to a more readable format.
 */
function formatDate(dateString) {
  const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  // Use T00:00:00 to avoid timezone shifts on the date
  return new Date(dateString + 'T00:00:00').toLocaleDateString(undefined, options);
}

/**
 * Helper: Checks if a date is within the next 48 hours.
 */
function isUrgent(dateString) {
  const dueDate = new Date(dateString + 'T00:00:00');
  const now = new Date();
  const diff = dueDate - now;
  const fortyEightHours = 48 * 60 * 60 * 1000;
  return diff > 0 && diff < fortyEightHours;
}

/**
 * Helper: Returns an emoji based on status.
 */
function getStatusIcon(status) {
  switch (status) {
    case 'Completed': return '✅';
    case 'In Progress': return '⏳';
    default: return '⚪';
  }
}

/**
 * Helper: Escapes HTML to prevent XSS.
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start the app
init();
