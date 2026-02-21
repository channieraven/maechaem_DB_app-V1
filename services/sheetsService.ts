
import { APPSCRIPT_URL } from '../constants';

export async function apiPost(payload: any) {
  // Use POST method for writing data, especially for large payloads like images (Base64)
  // We use 'text/plain' to avoid CORS Preflight (OPTIONS request) which Apps Script doesn't handle well.
  try {
    const res = await fetch(APPSCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
    }

    const result = await res.json();
    return result;
  } catch (err: any) {
    console.error("API Post Error:", err);
    return { success: false, error: err.message };
  }
}

export async function apiGet(sheetName: string) {
  try {
    const res = await fetch(`${APPSCRIPT_URL}?sheet=${sheetName}`, {
      method: 'GET'
    });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const result = await res.json();
    return result;
  } catch (err: any) {
    throw new Error('Could not fetch data: ' + err.message);
  }
}
