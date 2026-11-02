// Direção da rolagem para esconder o botão flutuante ao descer e mostrá-lo
// ao subir. Lógica pura (testável no runner do Node).

// Pequenos tremores de rolagem (inércia, barra de endereço) não alternam.
export const SCROLL_THRESHOLD = 12

export function fabVisibleAfterScroll(previousY: number, currentY: number, wasVisible: boolean): boolean {
  if (currentY <= 40) return true
  const delta = currentY - previousY
  if (Math.abs(delta) < SCROLL_THRESHOLD) return wasVisible
  return delta < 0
}
