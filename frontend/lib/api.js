// lib/api.js
// Centralized API client service for Campus Navigator FastAPI Backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://campnav.shreyanshpande.work/api';

export { API_BASE_URL };

/**
 * Returns full URL for relative backend paths
 */
export function getApiUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Common fetch wrapper handling headers, auth token, and response parsing
 */
async function fetchApi(endpoint, options = {}) {
  const url = getApiUrl(endpoint);
  
  const headers = {
    ...options.headers,
  };

  // Add Auth token if present in localStorage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Set default content-type for non-FormData requests
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle Unauthorized 401
  if (response.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }

  return response;
}

// ==========================================
// 1. EVENTS API
// ==========================================

/**
 * List all events (GET /events/)
 */
export async function listEvents() {
  const res = await fetchApi('/events/');
  if (!res.ok) {
    throw new Error(`Failed to fetch events: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Get active registration event IDs for a given attendee email (GET /events/user-registrations?email=...)
 */
export async function getUserRegistrations(email) {
  if (!email) return [];
  const params = new URLSearchParams({ email });
  const res = await fetchApi(`/events/user-registrations?${params.toString()}`);
  if (!res.ok) return [];
  return await res.json();
}

/**
 * Get details for a specific event (GET /events/{event_id})
 */
export async function getEvent(eventId) {
  const res = await fetchApi(`/events/${eventId}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.message || `Failed to fetch event details: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Register for an event (POST /events/{event_id}/register)
 */
export async function registerEvent(eventId, registrationData = {}) {
  const res = await fetchApi(`/events/${eventId}/register`, {
    method: 'POST',
    body: JSON.stringify(registrationData),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.message || `Failed to register for event: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Cancel registration for an event (POST /events/{event_id}/cancel-registration)
 */
export async function cancelRegistration(eventId, cancelData = {}) {
  const options = {
    method: 'POST',
  };
  if (cancelData && Object.keys(cancelData).length > 0) {
    options.body = JSON.stringify(cancelData);
  }

  const res = await fetchApi(`/events/${eventId}/cancel-registration`, options);
  if (!res.ok) {
    const textData = await res.text().catch(() => '');
    let detailMsg = res.statusText;
    try {
      const data = JSON.parse(textData);
      detailMsg = data.detail || data.message || data.error || detailMsg;
    } catch {
      if (textData) detailMsg = textData;
    }
    throw new Error(`Failed to cancel registration (${res.status}): ${detailMsg}`);
  }
  
  const text = await res.text().catch(() => '');
  try {
    return JSON.parse(text);
  } catch {
    return { message: text || 'Registration cancelled' };
  }
}

// ==========================================
// 2. USER AUTHENTICATION & PROFILE API
// ==========================================

/**
 * Register a new user (POST /user/register)
 * Payload: { username, password, email, mobile_number, gender, title, position }
 */
export async function registerUser(userData) {
  const res = await fetchApi('/user/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Registration failed: ${res.statusText}`);
  }
  return data;
}

/**
 * Login user (POST /user/login)
 */
export async function loginUser(credentials) {
  const res = await fetchApi('/user/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Login failed: ${res.statusText}`);
  }
  return data;
}

/**
 * Get user profile (GET /user/profile)
 */
export async function getUserProfile() {
  const res = await fetchApi('/user/profile');
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.message || `Failed to fetch profile: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Get current logged in user details (GET /user/me)
 */
export async function getUserMe() {
  const res = await fetchApi('/user/me');
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.message || `Failed to fetch current user: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Update user profile (PUT /user/profile)
 * Payload: { email, mobile_number, gender, title, position }
 */
export async function updateUserProfile(profileData) {
  const res = await fetchApi('/user/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Failed to update profile: ${res.statusText}`);
  }
  return data;
}

/**
 * Delete user profile (DELETE /user/profile)
 */
export async function deleteUserProfile() {
  const res = await fetchApi('/user/profile', {
    method: 'DELETE',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Failed to delete profile: ${res.statusText}`);
  }
  return data;
}

/**
 * Update user password (PUT /user/password)
 * Payload: { current_password, new_password }
 */
export async function updateUserPassword(passwordData) {
  const res = await fetchApi('/user/password', {
    method: 'PUT',
    body: JSON.stringify(passwordData),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Failed to update password: ${res.statusText}`);
  }
  return data;
}

/**
 * Get login history (GET /user/login-history)
 */
export async function getLoginHistory() {
  const res = await fetchApi('/user/login-history');
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.message || `Failed to fetch login history: ${res.statusText}`);
  }
  return await res.json();
}

// ==========================================
// 3. USER CREATED EVENTS API (CPANEL)
// ==========================================

/**
 * List user events (GET /user/events/)
 */
export async function listUserEvents() {
  const res = await fetchApi('/user/events/');
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.message || `Failed to fetch user events: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Create user event (POST /user/events/)
 */
export async function createUserEvent(eventData) {
  const res = await fetchApi('/user/events/', {
    method: 'POST',
    body: JSON.stringify(eventData),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Failed to create user event: ${res.statusText}`);
  }
  return data;
}

/**
 * Get specific user event (GET /user/events/{event_id})
 */
export async function getUserEvent(eventId) {
  const res = await fetchApi(`/user/events/${eventId}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.message || `Failed to get user event: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Update user event (PUT /user/events/{event_id})
 */
export async function updateUserEvent(eventId, eventData) {
  const res = await fetchApi(`/user/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(eventData),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Failed to update user event: ${res.statusText}`);
  }
  return data;
}

/**
 * Delete user event (DELETE /user/events/{event_id})
 */
export async function deleteUserEvent(eventId) {
  const res = await fetchApi(`/user/events/${eventId}`, {
    method: 'DELETE',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Failed to delete user event: ${res.statusText}`);
  }
  return data;
}

/**
 * Get attendees for a user event (GET /user/events/{event_id}/attendees)
 */
export async function getUserEventAttendees(eventId) {
  const res = await fetchApi(`/user/events/${eventId}/attendees`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.message || `Failed to fetch attendees: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Delete an attendee from a user event (DELETE /user/events/{event_id}/attendees/{attendee_id})
 */
export async function deleteUserEventAttendee(eventId, attendeeId) {
  const res = await fetchApi(`/user/events/${eventId}/attendees/${attendeeId}`, {
    method: 'DELETE',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Failed to delete attendee: ${res.statusText}`);
  }
  return data;
}

// ==========================================
// 4. MAP & PATHFINDING API
// ==========================================

/**
 * Load SVG map (GET /load_svg?floor=...&building=...)
 */
export async function loadSvg(floor, building) {
  const params = new URLSearchParams();
  if (floor) params.append('floor', floor);
  if (building) params.append('building', building);

  const res = await fetchApi(`/load_svg?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to load SVG: ${res.statusText}`);
  }
  return res;
}

/**
 * Load Shortest Path SVG (GET /load_shortest_path_svg?floor=...&building=...)
 */
export async function loadShortestPathSvg(floor, building) {
  const params = new URLSearchParams();
  if (floor) params.append('floor', floor);
  if (building) params.append('building', building);

  const res = await fetchApi(`/load_shortest_path_svg?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to load shortest path SVG: ${res.statusText}`);
  }
  return res;
}

/**
 * Process Path (POST /process_path)
 * Payload: { start, end, preference, building }
 */
export async function processPath(pathData) {
  const res = await fetchApi('/process_path', {
    method: 'POST',
    body: JSON.stringify(pathData),
  });
  return res;
}

/**
 * Multi Building Process Path (POST /multi_building_process_path)
 * Payload: { "Start Location", "End Location", "building_name_1", "building_name_2" }
 */
export async function multiBuildingProcessPath(pathData) {
  const res = await fetchApi('/multi_building_process_path', {
    method: 'POST',
    body: JSON.stringify(pathData),
  });
  return res;
}

/**
 * Custom Process Path (POST /custom_process)
 * Payload: { type, start, end, preference, building }
 */
export async function customProcessPath(customPathData) {
  const res = await fetchApi('/custom_process', {
    method: 'POST',
    body: JSON.stringify(customPathData),
  });
  return res;
}

// ==========================================
// 5. TEACHERS API
// ==========================================

/**
 * Get Teachers list with optional filters (GET /teachers?name=...&cabin_no=...&room_no=...)
 */
export async function getTeachers({ name, cabin_no, room_no } = {}) {
  const params = new URLSearchParams();
  if (name) params.append('name', name);
  if (cabin_no) params.append('cabin_no', cabin_no);
  if (room_no) params.append('room_no', room_no);

  const res = await fetchApi(`/teachers?${params.toString()}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.message || `Failed to fetch teachers: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Create a new teacher entry (POST /teachers)
 * Payload: { name, cabin_no, room_no, phone_number }
 */
export async function createTeacher(teacherData) {
  const res = await fetchApi('/teachers', {
    method: 'POST',
    body: JSON.stringify(teacherData),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Failed to create teacher: ${res.statusText}`);
  }
  return data;
}

/**
 * Search teacher by name (GET /search_teacher?teacher_name=...)
 */
export async function searchTeacher(teacherName) {
  const params = new URLSearchParams({ teacher_name: teacherName });
  const res = await fetchApi(`/search_teacher?${params.toString()}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.message || `Failed to search teacher: ${res.statusText}`);
  }
  return await res.json();
}

// ==========================================
// 6. CHATBOT & KNOWLEDGE API
// ==========================================

/**
 * Upload Audio or Voice prompt (POST /upload)
 * Body: FormData with fields "text" and optional "audio_file"
 */
export async function uploadAudio(formData) {
  const res = await fetchApi('/upload', {
    method: 'POST',
    body: formData,
  });
  return res;
}

/**
 * Send chat message (POST /chat)
 * Payload: { message }
 */
export async function sendChatMessage(message) {
  const res = await fetchApi('/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Failed to send message: ${res.statusText}`);
  }
  return data;
}

/**
 * Reload Knowledge base (POST /reload_knowledge)
 */
export async function reloadKnowledge() {
  const res = await fetchApi('/reload_knowledge', {
    method: 'POST',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Failed to reload knowledge: ${res.statusText}`);
  }
  return data;
}
