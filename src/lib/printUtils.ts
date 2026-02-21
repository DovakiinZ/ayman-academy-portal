/**
 * Utility for isolation-based printing.
 * Creates a hidden iframe to print specific HTML content without the app layout.
 */

export function printCertificate(htmlContent: string, options: { title?: string } = {}) {
    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.name = 'printIframe';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
        console.error('Could not access iframe document');
        return;
    }

    // Build full HTML document
    const fullHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${options.title || 'Certificate'}</title>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4 landscape;
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
        }
        
        .certificate-wrapper {
          width: 100%;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          position: relative;
        }

        /* Certificate-specific styles provided by the content */
        ${htmlContent.includes('is-certificate') ? `
          .is-certificate {
            border: 15px double #ae944f; /* Academic Gold */
            padding: 3rem;
            width: 90%;
            max-width: 25cm;
            min-height: 16cm;
            text-align: center;
            background: #fff;
            position: relative;
            box-shadow: none !important;
          }
        ` : ''}

        /* Responsive overrides for different templates */
        .preview-content {
          width: 100%;
          line-height: 1.8;
          font-size: 18pt;
          color: #1a1a1a;
        }
      </style>
    </head>
    <body class="${htmlContent.includes('is-certificate') ? 'is-certificate-body' : ''}">
      <div class="certificate-wrapper">
        ${htmlContent}
      </div>
      <script>
        window.onload = () => {
          window.focus();
          window.print();
          setTimeout(() => {
            window.parent.document.body.removeChild(window.frameElement);
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

    doc.open();
    doc.write(fullHtml);
    doc.close();
}
