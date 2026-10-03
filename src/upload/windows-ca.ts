import { execFileSync } from 'child_process';
import https from 'https';
import tls from 'tls';

export function trustWindowsCertificates() {
  if (process.platform !== 'win32') return;
  const script = [
    "$certs = Get-ChildItem Cert:\\LocalMachine\\Root, Cert:\\LocalMachine\\CA, Cert:\\CurrentUser\\Root, Cert:\\CurrentUser\\CA",
    "$certs | ForEach-Object { '-----BEGIN CERTIFICATE-----'; [Convert]::ToBase64String($_.RawData, 'InsertLineBreaks'); '-----END CERTIFICATE-----' }",
  ].join('; ');
  const pem = execFileSync('powershell', ['-NoProfile', '-Command', script], { encoding: 'utf8' });
  const extras = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) ?? [];
  https.globalAgent = new https.Agent({
    ca: [...tls.rootCertificates, ...extras],
  });
}
