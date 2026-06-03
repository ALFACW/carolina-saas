// Formatea pesos colombianos: $1.234.567 (sin centavos, punto como miles)
export const COP = (n) => {
  const num = Math.round(Number(n) || 0)
  return '$' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
