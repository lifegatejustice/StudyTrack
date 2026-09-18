/**
 * Storage Utility for StudyTrack
 * Manages saving and loading assignments from the browser's localStorage.
 */

const STORAGE_KEY = 'studytrack_assignments';

/**
 * Loads all assignments from localStorage.
 * @returns {Array} An array of assignment objects.
 */
export function loadAssignments() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading assignments from localStorage:', error);
    return [];
  }
}

/**
 * Saves assignments to localStorage.
 * @param {Array} assignments - The array of assignment objects to save.
 * @returns {boolean} True if successful, false otherwise.
 */
export function saveAssignments(assignments) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
    return true;
  } catch (error) {
    console.error('Error saving assignments to localStorage:', error);
    return false;
  }
}
