const API = import.meta.env.VITE_API_URL || "";

async function req(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
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
