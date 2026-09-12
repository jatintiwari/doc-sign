// Generate a sample document canvas for quick testing
export function generateSampleDocumentDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1200, 1600);

  // Subtle border / shadow frame
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, 1140, 1540);

  // Header band
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(30, 30, 1140, 120);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('NON-DISCLOSURE & SERVICE AGREEMENT', 80, 105);

  // Meta info
  ctx.fillStyle = '#64748b';
  ctx.font = '16px monospace';
  ctx.fillText('DOC-ID: NDA-2026-09-12-XK9 | CONFIDENTIAL', 80, 200);
  ctx.fillText('DATE: September 12, 2026 | STATUS: PENDING SIGNATURE', 80, 230);

  // Divider
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(80, 260);
  ctx.lineTo(1120, 260);
  ctx.stroke();

  // Paragraphs
  ctx.fillStyle = '#334155';
  ctx.font = '20px "Plus Jakarta Sans", sans-serif';
  const textLines = [
    '1. PURPOSE & SCOPE',
    'This Agreement governs the disclosure of confidential and proprietary information between the parties for',
    'the purpose of collaborative project development and technological integration.',
    '',
    '2. OBLIGATIONS OF RECEIVING PARTY',
    'The Receiving Party agrees to protect the Confidential Information with the same degree of care it exercises',
    'with its own confidential materials of similar nature, and in any event no less than a reasonable degree of care.',
    '',
    '3. PERMITTED DISCLOSURES',
    'Disclosures shall be restricted strictly to employees, contractors, and advisors on a need-to-know basis who',
    'are bound by confidentiality obligations substantially similar to those contained herein.',
    '',
    '4. TERM & TERMINATION',
    'This Agreement shall remain in effect for a period of five (5) years from the effective execution date.',
    '',
    '5. ACKNOWLEDGEMENT & EXECUTION',
    'By signing below, the authorized representative acknowledges having read, understood, and agreed to all terms.'
  ];

  let y = 310;
  for (const line of textLines) {
    if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('4.') || line.startsWith('5.')) {
      ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#0f172a';
      y += 10;
    } else {
      ctx.font = '18px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#475569';
    }
    ctx.fillText(line, 80, y);
    y += 38;
  }

  // Signature Block Areas
  const sigY = 1250;

  // Party A Box
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(80, sigY, 480, 200);
  ctx.fillRect(80, sigY, 480, 200);

  ctx.setLineDash([]);
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('AUTHORIZED SIGNATURE (DISCLOSING PARTY)', 100, sigY + 40);
  ctx.font = '15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Alex Johnson, VP Engineering', 100, sigY + 165);
  ctx.fillText('Date: 2026-09-12', 100, sigY + 185);

  // Party B Box (Target for User Signature)
  ctx.fillStyle = '#eff6ff';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(640, sigY, 480, 200);
  ctx.fillRect(640, sigY, 480, 200);

  ctx.setLineDash([]);
  ctx.fillStyle = '#1e40af';
  ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('AUTHORIZED SIGNATURE (RECIPIENT)', 660, sigY + 40);
  ctx.fillStyle = '#60a5fa';
  ctx.font = 'italic 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('<<< Place & adjust your signature here >>>', 660, sigY + 100);
  ctx.fillStyle = '#1e3a8a';
  ctx.font = '15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Name: Authorized Representative', 660, sigY + 165);
  ctx.fillText('Date: [ Auto-stamped ]', 660, sigY + 185);

  return canvas.toDataURL('image/png');
}

// Generate a realistic paper signature with off-white textured background for testing background removal
export function generateSampleSignatureDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 700;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  // Realistic paper background (off-white / subtle cream with slight noise)
  ctx.fillStyle = '#f6f4ee';
  ctx.fillRect(0, 0, 700, 320);

  // Subtle paper grain/shadow gradient
  const grad = ctx.createLinearGradient(0, 0, 700, 320);
  grad.addColorStop(0, 'rgba(235, 230, 220, 0.6)');
  grad.addColorStop(1, 'rgba(248, 246, 240, 0.3)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 700, 320);

  // Draw cursive handwritten signature strokes in dark blue ink
  ctx.strokeStyle = '#002244';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  // "J" flourish
  ctx.moveTo(80, 180);
  ctx.bezierCurveTo(90, 80, 130, 60, 160, 80);
  ctx.bezierCurveTo(190, 100, 180, 230, 150, 250);
  ctx.bezierCurveTo(130, 260, 110, 240, 140, 190);

  // "a-t-i-n"
  ctx.bezierCurveTo(170, 150, 200, 180, 230, 170);
  ctx.bezierCurveTo(250, 160, 270, 120, 280, 175);
  ctx.bezierCurveTo(290, 190, 320, 165, 340, 170);
  ctx.bezierCurveTo(360, 175, 380, 155, 410, 170);

  // Big swoosh loop
  ctx.bezierCurveTo(450, 130, 520, 90, 560, 120);
  ctx.bezierCurveTo(600, 150, 580, 220, 500, 230);
  ctx.bezierCurveTo(400, 240, 260, 245, 120, 235);
  ctx.bezierCurveTo(220, 230, 480, 225, 620, 215);

  ctx.stroke();

  // Accent cross / flourish
  ctx.beginPath();
  ctx.lineWidth = 3.5;
  ctx.moveTo(250, 140);
  ctx.bezierCurveTo(280, 135, 310, 145, 340, 138);
  ctx.stroke();

  return canvas.toDataURL('image/png');
}
