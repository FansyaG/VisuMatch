import { reactive } from 'vue'

export const toastState = reactive({
  items: []
})

let toastId = 0

export function showToast(message, type = 'error', duration = 4000) {
  const id = ++toastId
  toastState.items.push({ id, message, type })
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }
}

export function removeToast(id) {
  const index = toastState.items.findIndex((item) => item.id === id)
  if (index !== -1) {
    toastState.items.splice(index, 1)
  }
}
