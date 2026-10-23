<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { api } from '../api'
import { useAuth } from '../stores/auth'
import { showToast } from '../toast'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const email = ref(route.query.email || '')
const digits = ref(['', '', '', '', '', ''])
const inputRefs = ref([])

const isVerifying = ref(false)
const isResending = ref(false)
const resendCountdown = ref(60)
let timer = null

const errorMessage = ref('')
const successMessage = ref('')

const isCodeComplete = computed(() => {
  return digits.value.every(d => d.trim().length === 1)
})

const startCountdown = (duration = 60) => {
  if (timer) clearInterval(timer)
  resendCountdown.value = duration
  timer = setInterval(() => {
    if (resendCountdown.value > 0) {
      resendCountdown.value -= 1
    } else {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

onMounted(() => {
  startCountdown(60)
  nextTick(() => {
    if (inputRefs.value[0]) {
      inputRefs.value[0].focus()
    }
  })
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const handleInput = (index, event) => {
  const value = event.target.value
  errorMessage.value = ''

  // Only take the last character if multiple chars were entered
  if (value.length > 0) {
    const lastChar = value.slice(-1)
    if (/^[0-9]$/.test(lastChar)) {
      digits.value[index] = lastChar
      if (index < 5 && inputRefs.value[index + 1]) {
        inputRefs.value[index + 1].focus()
      }
    } else {
      digits.value[index] = ''
    }
  } else {
    digits.value[index] = ''
  }

  // Auto verify if all filled
  if (isCodeComplete.value) {
    handleVerify()
  }
}

const handleKeyDown = (index, event) => {
  if (event.key === 'Backspace') {
    if (!digits.value[index] && index > 0 && inputRefs.value[index - 1]) {
      inputRefs.value[index - 1].focus()
      digits.value[index - 1] = ''
    } else {
      digits.value[index] = ''
    }
  } else if (event.key === 'ArrowLeft' && index > 0) {
    inputRefs.value[index - 1]?.focus()
  } else if (event.key === 'ArrowRight' && index < 5) {
    inputRefs.value[index + 1]?.focus()
  }
}

const handlePaste = (event) => {
  event.preventDefault()
  const pasted = (event.clipboardData || window.clipboardData).getData('text').trim()
  if (!pasted) return

  const numbers = pasted.replace(/\D/g, '').slice(0, 6).split('')
  numbers.forEach((num, i) => {
    if (i < 6) {
      digits.value[i] = num
    }
  })

  const nextFocusIndex = Math.min(numbers.length, 5)
  inputRefs.value[nextFocusIndex]?.focus()

  if (isCodeComplete.value) {
    handleVerify()
  }
}

const handleVerify = async () => {
  if (!email.value) {
    errorMessage.value = 'Alamat email tidak ditemukan. Silakan lakukan pendaftaran atau login kembali.'
    showToast(errorMessage.value, 'error')
    return
  }

  const code = digits.value.join('')
  if (code.length !== 6) {
    errorMessage.value = 'Silakan masukkan 6 digit kode verifikasi lengkap.'
    return
  }

  isVerifying.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const data = await api.verifyEmail(email.value, code)
    if (data.token && data.user) {
      auth.setAuth(data.token, data.user)
      showToast('Email berhasil diverifikasi! Selamat datang.', 'success')

      // Role check for direction: Admin -> /admin; Creator -> /dashboard
      if (data.user.role === 'Admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    }
  } catch (err) {
    const errCode = err?.data?.error?.code
    const errMsg = err?.data?.error?.message

    if (errCode === 'TOO_MANY_ATTEMPTS' || err?.status === 429) {
      errorMessage.value = errMsg || 'Terlalu banyak percobaan yang salah. Silakan minta kode baru.'
    } else if (errCode === 'CODE_EXPIRED') {
      errorMessage.value = errMsg || 'Kode verifikasi telah kedaluwarsa. Silakan kirim ulang kode baru.'
    } else if (errCode === 'INVALID_CODE') {
      errorMessage.value = errMsg || 'Kode verifikasi salah atau tidak valid.'
    } else {
      errorMessage.value = errMsg || 'Gagal memverifikasi kode. Silakan coba lagi.'
    }
  } finally {
    isVerifying.value = false
  }
}

const handleResend = async () => {
  if (resendCountdown.value > 0 || isResending.value) return
  if (!email.value) {
    errorMessage.value = 'Alamat email tidak ditemukan.'
    return
  }

  isResending.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const res = await api.resendCode(email.value)
    successMessage.value = res.message || 'Kode verifikasi baru telah dikirimkan ke email Anda.'
    showToast(successMessage.value, 'success')
    startCountdown(60)
  } catch (err) {
    const errCode = err?.data?.error?.code
    const errMsg = err?.data?.error?.message

    if (errCode === 'RESEND_TOO_SOON') {
      errorMessage.value = errMsg || 'Harap tunggu 60 detik sebelum meminta kode baru.'
    } else if (errCode === 'RATE_LIMIT_EXCEEDED') {
      errorMessage.value = errMsg || 'Batas pengiriman kode tercapai (maks 5 kali per jam).'
    } else {
      errorMessage.value = errMsg || 'Gagal mengirim ulang kode verifikasi.'
    }
  } finally {
    isResending.value = false
  }
}
</script>

<template>
  <div class="relative min-h-[calc(100vh-76px)] flex items-center justify-center p-6 font-sans overflow-hidden">
    <!-- Konten Utama Card -->
    <div class="relative z-10 w-full max-w-lg mx-auto">
      <div class="bg-gray-900/80 backdrop-blur-xl border border-gray-800 p-8 sm:p-10 rounded-3xl shadow-2xl">
        
        <!-- Header -->
        <div class="text-center mb-6">
          <div class="w-14 h-14 bg-purple-900/40 border border-purple-500/30 text-purple-300 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg shadow-purple-900/20">
            ✉️
          </div>
          <h2 class="text-2xl font-bold text-white mb-2">Verifikasi Email Anda</h2>
          <p class="text-gray-400 text-sm">
            Masukkan 6 digit kode OTP yang kami kirimkan ke:
          </p>
          <p class="text-purple-300 font-semibold text-sm mt-1 break-all">
            {{ email || '(email tidak ditentukan)' }}
          </p>
          <p class="text-xs text-amber-400/90 mt-2 font-medium">
            ⏱️ Kode berlaku 10 menit
          </p>
        </div>

        <!-- Input Email manual jika query kosong -->
        <div v-if="!email" class="mb-5">
          <label class="block text-xs font-medium text-gray-300 mb-1.5">Alamat Email</label>
          <input 
            v-model="email" 
            type="email" 
            placeholder="Masukkan email Anda" 
            class="w-full px-4 py-3 rounded-xl bg-gray-950/80 border border-gray-700/50 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition text-sm outline-none"
          />
        </div>

        <!-- 6 Digit Input -->
        <div class="mb-6">
          <label class="block text-xs font-medium text-gray-400 text-center mb-3">
            Kode Verifikasi 6 Digit
          </label>
          <div class="flex justify-center gap-2 sm:gap-3" @paste="handlePaste">
            <input
              v-for="(digit, idx) in digits"
              :key="idx"
              :ref="el => inputRefs[idx] = el"
              type="text"
              inputmode="numeric"
              maxlength="2"
              :value="digit"
              @input="handleInput(idx, $event)"
              @keydown="handleKeyDown(idx, $event)"
              class="w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl bg-gray-950 border border-gray-700/70 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40 outline-none transition selection:bg-purple-600"
            />
          </div>
        </div>

        <!-- Alert Error Message -->
        <div v-if="errorMessage" class="mb-5 bg-red-950/60 border border-red-500/40 text-red-200 text-xs sm:text-sm p-3.5 rounded-xl flex items-start gap-2.5">
          <span class="text-base mt-[-2px]">⚠️</span>
          <span class="flex-1 leading-relaxed">{{ errorMessage }}</span>
        </div>

        <!-- Alert Success Message -->
        <div v-if="successMessage" class="mb-5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm p-3.5 rounded-xl flex items-start gap-2.5">
          <span class="text-base mt-[-2px]">✅</span>
          <span class="flex-1 leading-relaxed">{{ successMessage }}</span>
        </div>

        <!-- Tombol Verifikasi -->
        <button
          type="button"
          @click="handleVerify"
          :disabled="isVerifying || !isCodeComplete"
          class="w-full bg-purple-600 border border-purple-400 hover:bg-purple-700 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-lg shadow-purple-500/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <span v-if="isVerifying" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>Verifikasi</span>
          <span v-if="!isVerifying">✓</span>
        </button>

        <!-- Tombol Kirim Ulang Kode -->
        <div class="mt-6 pt-5 border-t border-gray-800 text-center flex flex-col items-center gap-2">
          <p class="text-xs text-gray-400">
            Tidak menerima kode di kotak masuk atau spam?
          </p>
          <button
            type="button"
            @click="handleResend"
            :disabled="resendCountdown > 0 || isResending"
            class="text-xs font-semibold text-purple-400 hover:text-purple-300 disabled:text-gray-500 transition cursor-pointer flex items-center gap-1.5"
          >
            <span v-if="isResending" class="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></span>
            <span v-if="resendCountdown > 0">Kirim ulang kode dalam ({{ resendCountdown }}s)</span>
            <span v-else>Kirim ulang kode</span>
          </button>
        </div>

        <!-- Link Navigasi Kembali -->
        <div class="mt-6 text-center">
          <RouterLink to="/login" class="text-xs text-gray-400 hover:text-white transition">
            ← Kembali ke Halaman Login
          </RouterLink>
        </div>

      </div>
    </div>
  </div>
</template>
