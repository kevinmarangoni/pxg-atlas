export function copyText(text, onSuccess) {
  const fallbackCopy = () => {
    const input = document.createElement('textarea')
    input.value = text
    input.style.position = 'fixed'
    input.style.opacity = '0'
    document.body.appendChild(input)
    input.select()
    try {
      if (document.execCommand('copy')) onSuccess()
    } catch { /* copying isn't supported */ }
    document.body.removeChild(input)
  }

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(fallbackCopy)
  } else {
    fallbackCopy()
  }
}
