import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

interface ReceiptData {
  // Booking
  booking_id: string;
  scheduled_date: string;
  scheduled_start: string;
  scheduled_end: string;
  total_hours: number | null;
  notes: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  // Category
  category_name: string;
  // Financial
  hourly_rate: string;
  gross_amount: string;
  platform_fee: string;
  insurance_fee: string;
  net_professional_amount: string;
  payment_status: string;
  // Contratante
  contratante_name: string;
  contratante_cpf: string;
  // Profissional
  profissional_name: string;
  profissional_cpf: string;
  // Condo
  condo_name: string;
  condo_cnpj: string;
  condo_endereco: string;
  condo_cidade: string;
  condo_uf: string;
}

function maskCPF(cpf: string): string {
  if (!cpf || cpf.length < 11) return cpf;
  const d = cpf.replace(/\D/g, '');
  return `${d.slice(0, 3)}.***.***.${d.slice(9)}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  // Handle YYYY-MM-DD format
  if (dateStr.length === 10 && dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatCurrency(value: string | number): string {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

export function generateContratanteReceipt(data: ReceiptData): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(stream);

  const PRIMARY = '#1B7A6E';
  const GRAY = '#666666';
  const DARK = '#1A2B3C';

  // Header
  doc.fontSize(22).fillColor(PRIMARY).text('CondoDaily', { align: 'center' });
  doc.fontSize(10).fillColor(GRAY).text('Plataforma de Serviços para Condomínios', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(14).fillColor(DARK).text('RESUMO DO SERVIÇO', { align: 'center' });

  // Divider
  doc.moveDown(0.5);
  doc.strokeColor('#E0E0E0').lineWidth(1)
    .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);

  // Transaction info
  doc.fontSize(9).fillColor(GRAY).text(`Nº Transação: ${data.booking_id.slice(0, 8).toUpperCase()}`);
  doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
  doc.moveDown(1);

  // Serviço
  doc.fontSize(12).fillColor(PRIMARY).text('SERVIÇO CONTRATADO');
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor(DARK);
  doc.text(`Categoria: ${data.category_name}`);
  doc.text(`Data: ${formatDate(data.scheduled_date)}`);
  doc.text(`Horário: ${data.scheduled_start} - ${data.scheduled_end}`);
  if (data.total_hours) doc.text(`Horas trabalhadas: ${data.total_hours.toFixed(1)}h`);
  if (data.check_in_at) doc.text(`Check-in: ${formatDateTime(data.check_in_at)}`);
  if (data.check_out_at) doc.text(`Check-out: ${formatDateTime(data.check_out_at)}`);
  doc.moveDown(1);

  // Profissional
  doc.fontSize(12).fillColor(PRIMARY).text('PRESTADOR DO SERVIÇO');
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor(DARK);
  doc.text(`Nome: ${data.profissional_name}`);
  doc.text(`CPF: ${maskCPF(data.profissional_cpf)}`);
  doc.moveDown(1);

  // Condomínio
  doc.fontSize(12).fillColor(PRIMARY).text('LOCAL DA PRESTAÇÃO');
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor(DARK);
  doc.text(`Condomínio: ${data.condo_name}`);
  doc.text(`CNPJ: ${data.condo_cnpj}`);
  doc.text(`Endereço: ${data.condo_endereco}, ${data.condo_cidade}/${data.condo_uf}`);
  doc.moveDown(1);

  // Valores
  doc.fontSize(12).fillColor(PRIMARY).text('RESUMO FINANCEIRO');
  doc.moveDown(0.3);

  const tableTop = doc.y;
  const col1 = 60;
  const col2 = 420;

  doc.fontSize(10).fillColor(DARK);
  doc.text('Valor do serviço', col1, tableTop);
  doc.text(formatCurrency(data.gross_amount), col2, tableTop, { align: 'right', width: 120 });

  doc.text('Taxa de intermediação (5%)', col1, tableTop + 20);
  doc.text(formatCurrency(data.platform_fee), col2, tableTop + 20, { align: 'right', width: 120 });

  doc.text('Seguro CondoDaily', col1, tableTop + 40);
  doc.text(formatCurrency(data.insurance_fee), col2, tableTop + 40, { align: 'right', width: 120 });

  // Divider
  doc.strokeColor('#E0E0E0').lineWidth(1)
    .moveTo(50, tableTop + 60).lineTo(545, tableTop + 60).stroke();

  doc.fontSize(12).font('Helvetica-Bold').fillColor(DARK);
  doc.text('TOTAL PAGO', col1, tableTop + 70);
  doc.text(formatCurrency(data.gross_amount), col2, tableTop + 70, { align: 'right', width: 120 });
  doc.font('Helvetica');

  doc.moveDown(4);

  // Aviso legal
  doc.fontSize(8).fillColor(GRAY);
  doc.text('────────────────────────────────────────────────────────────────────', { align: 'center' });
  doc.moveDown(0.3);
  doc.text(
    'Este documento é apenas um resumo informativo da transação realizada na plataforma CondoDaily (condodaily.com.br). ' +
    'NÃO possui valor fiscal. O comprovante oficial de pagamento é emitido pelo Mercado Pago. ' +
    'A CondoDaily atua exclusivamente como intermediadora tecnológica, não configurando vínculo empregatício ' +
    'entre as partes. O prestador de serviço é responsável por suas obrigações fiscais e tributárias.',
    { align: 'center', lineGap: 2 },
  );

  doc.moveDown(1);
  doc.fontSize(9).fillColor(PRIMARY).text('condodaily.com.br | contato@condodaily.com.br', { align: 'center' });

  doc.end();
  return stream;
}

export function generateProfissionalReceipt(data: ReceiptData): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(stream);

  const ORANGE = '#F5A623';
  const GRAY = '#666666';
  const DARK = '#1A2B3C';

  // Header
  doc.fontSize(22).fillColor(ORANGE).text('CondoDaily', { align: 'center' });
  doc.fontSize(10).fillColor(GRAY).text('Plataforma de Serviços para Condomínios', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(14).fillColor(DARK).text('RESUMO DO SERVIÇO PRESTADO', { align: 'center' });

  // Divider
  doc.moveDown(0.5);
  doc.strokeColor('#E0E0E0').lineWidth(1)
    .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);

  // Transaction info
  doc.fontSize(9).fillColor(GRAY).text(`Nº Transação: ${data.booking_id.slice(0, 8).toUpperCase()}`);
  doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
  doc.moveDown(1);

  // Serviço
  doc.fontSize(12).fillColor(ORANGE).text('SERVIÇO PRESTADO');
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor(DARK);
  doc.text(`Categoria: ${data.category_name}`);
  doc.text(`Data: ${formatDate(data.scheduled_date)}`);
  doc.text(`Horário: ${data.scheduled_start} - ${data.scheduled_end}`);
  if (data.total_hours) doc.text(`Horas trabalhadas: ${data.total_hours.toFixed(1)}h`);
  if (data.check_in_at) doc.text(`Check-in: ${formatDateTime(data.check_in_at)}`);
  if (data.check_out_at) doc.text(`Check-out: ${formatDateTime(data.check_out_at)}`);
  doc.moveDown(1);

  // Contratante
  doc.fontSize(12).fillColor(ORANGE).text('CONTRATANTE');
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor(DARK);
  doc.text(`Condomínio: ${data.condo_name}`);
  doc.text(`CNPJ: ${data.condo_cnpj}`);
  doc.text(`Endereço: ${data.condo_endereco}, ${data.condo_cidade}/${data.condo_uf}`);
  doc.text(`Responsável: ${data.contratante_name}`);
  doc.moveDown(1);

  // Valores — detalhamento completo pro profissional
  doc.fontSize(12).fillColor(ORANGE).text('DETALHAMENTO FINANCEIRO');
  doc.moveDown(0.3);

  const tableTop = doc.y;
  const col1 = 60;
  const col2 = 420;

  doc.fontSize(10).fillColor(DARK);
  doc.text(`Valor/hora: ${formatCurrency(data.hourly_rate)}`, col1, tableTop);
  if (data.total_hours) doc.text(`Horas: ${data.total_hours.toFixed(1)}h`, col2, tableTop, { align: 'right', width: 120 });

  doc.text('Valor bruto do serviço', col1, tableTop + 25);
  doc.text(formatCurrency(data.gross_amount), col2, tableTop + 25, { align: 'right', width: 120 });

  doc.fillColor('#CC0000');
  doc.text('(-) Taxa plataforma (5%)', col1, tableTop + 45);
  doc.text(`- ${formatCurrency(data.platform_fee)}`, col2, tableTop + 45, { align: 'right', width: 120 });

  doc.text('(-) Seguro CondoDaily', col1, tableTop + 65);
  doc.text(`- ${formatCurrency(data.insurance_fee)}`, col2, tableTop + 65, { align: 'right', width: 120 });

  // Divider
  doc.strokeColor('#E0E0E0').lineWidth(1)
    .moveTo(50, tableTop + 85).lineTo(545, tableTop + 85).stroke();

  doc.fontSize(13).font('Helvetica-Bold').fillColor('#00AA00');
  doc.text('VALOR LÍQUIDO RECEBIDO', col1, tableTop + 95);
  doc.text(formatCurrency(data.net_professional_amount), col2, tableTop + 95, { align: 'right', width: 120 });
  doc.font('Helvetica');

  doc.moveDown(6);

  // Aviso legal
  doc.fontSize(8).fillColor(GRAY);
  doc.text('────────────────────────────────────────────────────────────────────', { align: 'center' });
  doc.moveDown(0.3);
  doc.text(
    'Este documento é apenas um resumo informativo da transação realizada na plataforma CondoDaily (condodaily.com.br). ' +
    'NÃO possui valor fiscal. O comprovante oficial de pagamento é emitido pelo Mercado Pago. ' +
    'A CondoDaily atua exclusivamente como intermediadora tecnológica, não configurando vínculo empregatício. ' +
    'O profissional é responsável por suas obrigações fiscais e tributárias (MEI, Carnê-Leão, etc).',
    { align: 'center', lineGap: 2 },
  );

  doc.moveDown(1);
  doc.fontSize(9).fillColor(ORANGE).text('condodaily.com.br | contato@condodaily.com.br', { align: 'center' });

  doc.end();
  return stream;
}
