import { PersonalCategory } from './types';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function getCategoryLabel(subCategory?: string | null): string {
  if (!subCategory) return '-';
  const map: Record<string, string> = {
    laundry: 'Laundry',
    reparasi: 'Reparasi',
    lainnya: 'Penerimaan Lainnya',
    operasional: 'Operasional Toko',
    gas: 'Pembelian Gas',
    detergen: 'Pembelian Detergen/Sabun',
    sewa_toko: 'Pembayaran Sewa Toko',
    disetor_investor: 'Dana Disetor ke Investor',
    penarikan_investor: 'Ambil Dana Usaha (Debit Pribadi)',
    pengeluaran_pribadi: 'Pengeluaran Pribadi (Kredit)',
  };
  return map[subCategory] || subCategory;
}

export function parsePersonalCategory(notes?: string | null, subCategory?: string | null): PersonalCategory {
  const text = `${notes || ''} ${subCategory || ''}`.toLowerCase();
  if (text.includes('bahan makanan') || text.includes('bahan_makanan') || text.includes('sayur') || text.includes('beras') || text.includes('pasar') || text.includes('dapur')) return 'bahan_makanan';
  if (text.includes('makanan') || text.includes('makan') || text.includes('jajan') || text.includes('resto') || text.includes('gofood') || text.includes('kopi')) return 'makanan';
  if (text.includes('listrik') || text.includes('kuota') || text.includes('pulsa') || text.includes('pln') || text.includes('internet')) return 'listrik_kuota';
  if (text.includes('donasi') || text.includes('sedekah') || text.includes('infaq') || text.includes('zakat') || text.includes('sumbangan')) return 'donasi';
  if (text.includes('bensin') || text.includes('bbm') || text.includes('pertalite') || text.includes('pertamax') || text.includes('spbu') || text.includes('solar')) return 'bensin';
  return 'belanja';
}

export function getPersonalCategoryLabel(category: PersonalCategory): string {
  const map: Record<PersonalCategory, string> = {
    bahan_makanan: 'Bahan Makanan',
    makanan: 'Makanan',
    listrik_kuota: 'Listrik / Kuota',
    donasi: 'Donasi',
    belanja: 'Belanja',
    bensin: 'Bensin',
  };
  return map[category] || 'Belanja';
}

export function getPersonalCategoryIcon(category: PersonalCategory): string {
  const map: Record<PersonalCategory, string> = {
    bahan_makanan: '🥬',
    makanan: '🍲',
    listrik_kuota: '⚡',
    donasi: '🤲',
    belanja: '🛍️',
    bensin: '⛽',
  };
  return map[category] || '🛍️';
}
