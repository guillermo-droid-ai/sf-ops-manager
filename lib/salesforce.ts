// Salesforce client using SOAP login — no Connected App required
// Just needs SF_USERNAME + SF_PASSWORD (+ optional SF_SECURITY_TOKEN)
// Session is cached for 2 hours server-side

const SF_LOGIN_URL = process.env.SF_LOGIN_URL || 'https://login.salesforce.com';

interface SFSession {
  sessionId: string;
  instanceUrl: string;
  expiresAt: number;
}

let _session: SFSession | null = null;

export async function getSFSession(): Promise<SFSession> {
  if (_session && Date.now() < _session.expiresAt) return _session;

  const username = process.env.SF_USERNAME!;
  const password = `${process.env.SF_PASSWORD}${process.env.SF_SECURITY_TOKEN || ''}`;

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:urn="urn:partner.soap.sforce.com">
  <soapenv:Body>
    <urn:login>
      <urn:username>${username}</urn:username>
      <urn:password>${password}</urn:password>
    </urn:login>
  </soapenv:Body>
</soapenv:Envelope>`;

  const res = await fetch(`${SF_LOGIN_URL}/services/Soap/u/63.0`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=UTF-8',
      SOAPAction: 'login',
    },
    body: soapBody,
  });

  const xml = await res.text();

  if (!res.ok || xml.includes('faultstring')) {
    const fault = xml.match(/<faultstring>(.*?)<\/faultstring>/)?.[1] || 'Unknown error';
    throw new Error(`Salesforce SOAP login failed: ${fault}`);
  }

  const sessionId = xml.match(/<sessionId>(.*?)<\/sessionId>/)?.[1];
  const serverUrl = xml.match(/<serverUrl>(.*?)<\/serverUrl>/)?.[1];

  if (!sessionId || !serverUrl) throw new Error('Could not parse SF login response');

  // Extract instance URL from serverUrl (e.g. https://na1.salesforce.com/services/...)
  const instanceUrl = serverUrl.match(/(https:\/\/[^/]+)/)?.[1] || '';

  _session = { sessionId, instanceUrl, expiresAt: Date.now() + 2 * 60 * 60 * 1000 };
  return _session;
}

export async function sfQuery<T = Record<string, unknown>>(soql: string): Promise<T[]> {
  const { sessionId, instanceUrl } = await getSFSession();
  const encoded = encodeURIComponent(soql);

  const res = await fetch(`${instanceUrl}/services/data/v63.0/query/?q=${encoded}`, {
    headers: { Authorization: `Bearer ${sessionId}`, 'Content-Type': 'application/json' },
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
      headers: { Authorization: `Bearer ${sessionId}` },
    });
    const pageData = await pageRes.json();
    records = records.concat(pageData.records || []);
    nextUrl = pageData.nextRecordsUrl;
  }

  return records as T[];
}

export async function sfUpdate(
  objectType: string,
  id: string,
  fields: Record<string, unknown>
): Promise<void> {
  const { sessionId, instanceUrl } = await getSFSession();

  const res = await fetch(`${instanceUrl}/services/data/v63.0/sobjects/${objectType}/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sessionId}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.text();
    throw new Error(`SF update failed: ${err}`);
  }
}
