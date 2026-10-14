/** Opens the native file picker. */
export function pickFiles(accept: string, onPick: (files: File[]) => void, multiple = true) {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept, multiple });
  input.onchange = () => input.files?.length && onPick([...input.files]);
  input.click();
}
