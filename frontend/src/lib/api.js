const API = import.meta.env.VITE_API_URL || "";

// Cross-origin `download` attributes are ignored by browsers — appending
// this to a Supabase storage URL forces a real download instead of opening.
export const downloadUrl = (url) =>
  url ? url + (url.includes("?") ? "&" : "?") + "download" : url;

async function req(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail || detail;
    } catch {}
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return res.json();
}

export async function getContent() {
  return req("/api/content");
}

export async function saveSection(section, data, token) {
  return req(`/api/content/${section}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function deleteSection(section, token) {
  return req(`/api/content/${section}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateAdminCredentials(creds, token) {
  return req("/api/admin/credentials", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(creds),
  });
}

export async function sendContactMessage({ name, email, message }) {
  return req("/api/contact", {
    method: "POST",
    body: JSON.stringify({ name, email, message }),
  });
}

export async function signupUser({ email, password, name }) {
  return req("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function sendAdminCode(token) {
  return req("/api/admin/2fa/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
}

export async function verifyAdminCode(code, token) {
  return req("/api/admin/2fa/verify", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code }),
  });
}

export async function uploadFile(file, token) {
  const res = await fetch(
    `${API}/api/upload?filename=${encodeURIComponent(file.name)}&content_type=${encodeURIComponent(file.type || "application/octet-stream")}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: file }
  );
  if (!res.ok) throw new Error((await res.text()) || "Upload failed");
  return res.json();
}

export async function submitFeedback(fb) {
  return req("/api/feedback", {
    method: "POST",
    body: JSON.stringify(fb),
  });
}

export async function getFeedback(token) {
  return req("/api/feedback", { headers: { Authorization: `Bearer ${token}` } });
}

export async function approveFeedback(id, approved, token) {
  return req("/api/feedback/approve", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ id, approved }),
  });
}
