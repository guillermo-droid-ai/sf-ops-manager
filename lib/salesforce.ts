// Salesforce API client using OAuth2 username-password flow
// All queries run server-side only — credentials never exposed to browser

const SF_BASE_URL = process.env.SF_LOGIN_URL || 'https://login.salesforce.com';

interface SFAuthResponse {
  access_token: string;
  instance_url: string;
  token_type: string;
}

let _cachedToken: { token: string; instanceUrl: string; expiresAt: number } | null = null;

export async function getSFToken(): Promise<{ token: string; instanceUrl: string }> {
  // Reuse token for 1 hour
  if (_cachedToken && Date.now() < _cachedToken.expiresAt) {
    return { token: _cachedToken.token, instanceUrl: _cachedToken.instanceUrl };
  }

  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: process.env.SF_CLIENT_ID!,
    client_secret: process.env.SF_CLIENT_SECRET!,
    username: process.env.SF_USERNAME!,
    password: `${process.env.SF_PASSWORD}${process.env.SF_SECURITY_TOKEN || ''}`,
  });

  const res = await fetch(`${SF_BASE_URL}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Salesforce auth failed: ${err}`);
  }

  const data: SFAuthResponse = await res.json();
  _cachedToken = {
    token: data.access_token,
    instanceUrl: data.instance_url,
    expiresAt: Date.now() + 55 * 60 * 1000, // 55 min
  };

  return { token: data.access_token, instanceUrl: data.instance_url };
}

export async function sfQuery<T = Record<string, unknown>>(soql: string): Promise<T[]> {
  const { token, instanceUrl } = await getSFToken();
  const encoded = encodeURIComponent(soql);
  const res = await fetch(`${instanceUrl}/services/data/v63.0/query/?q=${encoded}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SOQL query failed: ${err}\nQuery: ${soql}`);
  }

  const data = await res.json();
  let records = data.records || [];

  // Handle pagination
  let nextUrl = data.nextRecordsUrl;
  while (nextUrl) {
    const pageRes = await fetch(`${instanceUrl}${nextUrl}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const pageData = await pageRes.json();
    records = records.concat(pageData.records || []);
    nextUrl = pageData.nextRecordsUrl;
  }

  return records as T[];
}

export async function sfUpdate(objectType: string, id: string, fields: Record<string, unknown>): Promise<void> {
  const { token, instanceUrl } = await getSFToken();
  const res = await fetch(`${instanceUrl}/services/data/v63.0/sobjects/${objectType}/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.text();
    throw new Error(`SF update failed: ${err}`);
  }
}
