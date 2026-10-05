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
    penarikan_investor: 'Penarikan Uang oleh Investor (Prive)',
  };
  return map[subCategory] || subCategory;
}
