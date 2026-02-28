/**
 * useImagePreview - 图片大图预览的共享状态管理
 *
 * 使用模块级 ref（在 composable 函数外部定义）实现跨组件的全局单例状态，
 * 所有调用 useImagePreview() 的组件共享同一个预览状态。
 *
 * 工作流程：
 * 1. MessageBubble 或 ToolUseBlock 中点击图片 → 调用 open(src) 设置图片地址并显示
 * 2. ImagePreview 组件监听 isOpen 状态，渲染全屏预览遮罩
 * 3. 用户关闭预览 → 调用 close() 隐藏遮罩
 */

/** 当前预览图片的 src 地址（data URL 或 HTTP URL） */
const previewSrc = ref('')
/** 预览遮罩是否可见 */
const previewOpen = ref(false)

export function useImagePreview() {
  /** 打开大图预览：设置图片地址并显示遮罩 */
  function open(src: string) {
    previewSrc.value = src
    previewOpen.value = true
  }

  /** 关闭大图预览遮罩 */
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
