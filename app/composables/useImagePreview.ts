// 图片大图预览共享状态
const previewSrc = ref('')
const previewOpen = ref(false)

export function useImagePreview() {
  function open(src: string) {
    previewSrc.value = src
    previewOpen.value = true
  }

  function close() {
    previewOpen.value = false
  }

  return {
    src: previewSrc,
    isOpen: previewOpen,
    open,
    close
  }
}
