import { useState } from 'react';
import type { Sismo } from '../services/api';

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (typeof val === 'string' && /^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

export default function ShareExportCard({ sismo }: { sismo: Sismo }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const { attributes: a } = sismo;
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `Sismo M ${a.magnitude.toFixed(1)} - ${a.place} registrado en Telurify.`;

  async function handleCopyLink() {
    if (!navigator.clipboard) {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 2500);
      return;
    }
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 2500);
    }
  }

  function handleDownloadJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sismo, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sismo-${sismo.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function handleDownloadCsv() {
    const headers = ['id', 'title', 'place', 'magnitude', 'mag_type', 'latitude', 'longitude', 'time', 'tsunami', 'external_url'];
    const row = [
      sismo.id,
      a.title,
      a.place,
      a.magnitude,
      a.mag_type || '',
      a.coordinates.latitude,
      a.coordinates.longitude,
      a.time,
      a.tsunami ? 'true' : 'false',
      sismo.links?.external_url || '',
    ];

    const csvHeaders = headers.map(escapeCsvField).join(',');
    const csvRow = row.map(escapeCsvField).join(',');
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent([csvHeaders, csvRow].join('\n'));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', csvContent);
    downloadAnchor.setAttribute('download', `sismo-${sismo.id}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(currentUrl)}`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + currentUrl)}`;

  return (
    <div className="tf-card" style={{ marginTop: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="ti ti-share" style={{ color: 'var(--tf-accent)', fontSize: 18 }} />
        Compartir y Exportar Evento Sísmico
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {/* Copy Link button */}
        <button
          onClick={handleCopyLink}
          className="tf-button-secondary"
          style={{ fontSize: 12, padding: '8px 14px' }}
        >
          <i className={`ti ti-${copied ? 'check' : copyError ? 'alert-triangle' : 'link'}`} style={{ color: copied ? '#34C759' : copyError ? '#FF3B30' : 'var(--tf-accent)' }} />
          {copied ? '¡Enlace copiado!' : copyError ? 'Error al copiar' : 'Copiar enlace'}
        </button>

        {/* WhatsApp Share */}
        <a
          href={whatsappShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="tf-button-secondary"
          style={{ fontSize: 12, padding: '8px 14px', textDecoration: 'none' }}
        >
          <i className="ti ti-brand-whatsapp" style={{ color: '#25D366' }} />
          WhatsApp
        </a>

        {/* Twitter Share */}
        <a
          href={twitterShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="tf-button-secondary"
          style={{ fontSize: 12, padding: '8px 14px', textDecoration: 'none' }}
        >
          <i className="ti ti-brand-x" style={{ color: 'var(--tf-text)' }} />
          Compartir en X
        </a>

        {/* Export JSON */}
        <button
          onClick={handleDownloadJson}
          className="tf-button-secondary"
          style={{ fontSize: 12, padding: '8px 14px', marginLeft: 'auto' }}
        >
          <i className="ti ti-file-code" style={{ color: '#FF9500' }} />
          JSON
        </button>

        {/* Export CSV */}
        <button
          onClick={handleDownloadCsv}
          className="tf-button-secondary"
          style={{ fontSize: 12, padding: '8px 14px' }}
        >
          <i className="ti ti-file-spreadsheet" style={{ color: '#34C759' }} />
          CSV
        </button>
      </div>
    </div>
  );
}
