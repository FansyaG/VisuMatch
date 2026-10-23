<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuth } from '../stores/auth'
import { showToast } from '../toast'
import { api } from '../api'

const router = useRouter()
const auth = useAuth()

const identifier = ref('') // username or email
const password = ref('')
const showPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

// Unverified state modal / banner
const unverifiedEmail = ref('')
const isResending = ref(false)

const handleLogin = async () => {
  if (!identifier.value.trim() || !password.value) return
  isSubmitting.value = true
  errorMessage.value = ''
  unverifiedEmail.value = ''

  try {
    const data = await auth.login(identifier.value.trim(), password.value)
    showToast('Berhasil masuk ke VisuMatch', 'success')
    
    // Direct role separation: Admin -> /admin, Creator -> /dashboard
    if (auth.isAdmin.value || data?.user?.role === 'Admin') {
      router.push('/admin')
    } else {
      router.push('/dashboard')
    }
  } catch (err) {
    const errCode = err?.data?.error?.code
    const errMsg = err?.data?.error?.message

    if (err?.status === 403 || errCode === 'EMAIL_NOT_VERIFIED') {
      // If backend returns EMAIL_NOT_VERIFIED, redirect to /verify-email and offer resend
      const targetEmail = identifier.value.includes('@') ? identifier.value.trim() : ''
      unverifiedEmail.value = targetEmail
      errorMessage.value = 'Akun belum diverifikasi. Silakan masukkan kode OTP yang dikirim ke email Anda.'
      
      // Auto redirect to verify-email with email parameter if available
      router.push({
        path: '/verify-email',
        query: targetEmail ? { email: targetEmail } : {},
      })
      return
    }

    if (errCode === 'INVALID_CREDENTIALS' || err?.status === 401) {
      errorMessage.value = 'Username/email atau kata sandi tidak cocok.'
    } else {
      errorMessage.value = errMsg || 'Gagal masuk. Periksa kembali informasi Anda.'
    }
  } finally {
    isSubmitting.value = false
  }
}

const handleResendForUnverified = async () => {
  if (!unverifiedEmail.value || isResending.value) return
  isResending.value = true
  try {
    await api.resendCode(unverifiedEmail.value)
    showToast('Kode verifikasi baru berhasil dikirim ke email Anda', 'success')
  } catch (e) {
    // Handled
  } finally {
    isResending.value = false
  }
}
</script>

<template>
  <div class="relative min-h-[calc(100vh-76px)] flex items-center justify-center p-6 font-sans overflow-hidden">
    
    <!-- KONTEN UTAMA (Teks di Kiri, Form di Kanan) -->
    <div class="relative z-10 w-full max-w-6xl flex flex-col md:flex-row items-center gap-12 lg:gap-20">
      
      <!-- BAGIAN KIRI: Teks & Deskripsi Visual -->
      <div class="w-full md:w-1/2 transition-opacity duration-700 mt-10 md:mt-0">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-800/60 border border-gray-700/50 text-purple-300 text-xs font-bold tracking-wider backdrop-blur-md mb-8 shadow-lg">
          <span>✨</span> RUANG UNTUK IDE BESARMU
        </div>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-2xl">
          Cerita berikutnya, dimulai dari sini.
        </h1>
        <p class="text-gray-300 text-lg leading-relaxed max-w-lg drop-shadow-md">
          Kembali ke alur kreatifmu. Naskah, media, dan semua ide hebatmu sudah menunggu.
        </p>

        <div class="flex flex-col sm:flex-row gap-4 mt-8 text-purple-400 text-xs font-bold">
          <div class="flex items-center gap-2 bg-gray-900/60 px-3.5 py-2 rounded-lg border border-gray-800">
            <span>⚡</span> Cepat, Terintegrasi, dan Otomatis
          </div>
        </div>
      </div>

      <!-- BAGIAN KANAN: Form Glassmorphism -->
      <div class="w-full md:w-1/2 max-w-md mx-auto">
        <!-- Kartu Kaca (Backdrop Blur) -->
        <div class="bg-gray-900/80 backdrop-blur-xl border border-gray-800 p-8 sm:p-10 rounded-3xl shadow-2xl">
          <h2 class="text-2xl font-bold text-white mb-2">Selamat datang kembali</h2>
          <p class="text-gray-400 text-sm mb-6">Masuk dan lanjutkan cerita yang kamu mulai.</p>

          <!-- Error Alert Banner -->
          <div v-if="errorMessage" class="mb-5 bg-red-950/60 border border-red-500/40 text-red-200 text-xs p-3.5 rounded-xl flex flex-col gap-2">
            <div class="flex items-start gap-2">
              <span class="text-sm mt-[-2px]">⚠️</span>
              <span class="flex-1 leading-relaxed">{{ errorMessage }}</span>
            </div>
            <div v-if="unverifiedEmail" class="mt-1 flex items-center justify-between border-t border-red-800/60 pt-2 text-[11px]">
              <RouterLink :to="{ path: '/verify-email', query: { email: unverifiedEmail } }" class="underline font-bold text-purple-300 hover:text-white">
                Verifikasi sekarang
              </RouterLink>
              <button 
                type="button" 
                @click="handleResendForUnverified" 
                :disabled="isResending" 
                class="text-amber-300 hover:underline cursor-pointer disabled:opacity-50"
              >
                {{ isResending ? 'Mengirim...' : 'Kirim ulang kode OTP' }}
              </button>
            </div>
          </div>

          <form @submit.prevent="handleLogin" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1.5">Username atau Email</label>
              <input 
                v-model="identifier" 
                type="text" 
                required 
                placeholder="Masukkan username atau alamat email" 
                class="w-full px-4 py-3 rounded-xl bg-gray-950/80 border border-gray-700/50 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition text-sm placeholder-gray-600 outline-none" 
              />
            </div>
            
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1.5">Kata Sandi</label>
              <div class="relative">
                <input 
                  v-model="password" 
                  :type="showPassword ? 'text' : 'password'" 
                  required 
                  placeholder="Masukkan kata sandi" 
                  class="w-full px-4 py-3 pr-11 rounded-xl bg-gray-950/80 border border-gray-700/50 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition text-sm placeholder-gray-600 outline-none" 
                />
                <button 
                  type="button" 
                  @click="showPassword = !showPassword" 
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition p-1 text-sm cursor-pointer select-none"
                  :title="showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'"
                >
                  <span v-if="showPassword">👁️</span>
                  <span v-else>👁️‍🗨️</span>
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              :disabled="isSubmitting" 
              class="w-full bg-purple-600 border border-purple-400 hover:bg-purple-700 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-lg shadow-purple-500/20 text-sm mt-4 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span v-if="isSubmitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Masuk ke VisuMatch</span> <span>→</span>
            </button>
          </form>

          <!-- Link Daftar Akun Baru -->
          <div class="text-center text-xs text-gray-400 mt-6 pt-5 border-t border-gray-800/80">
            Belum punya akun? 
            <RouterLink to="/register" class="text-purple-400 font-bold hover:text-purple-300 transition ml-1">
              Daftar sekarang
            </RouterLink>
          </div>
        </div>
      </div>
      
    </div>
  </div>
</template>
