<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'

const router = useRouter()
const nama = ref('')
const email = ref('')
const password = ref('')

const handleRegister = () => {
  // Untuk prototipe, abaikan insert ke database. 
  // Langsung arahkan ke dashboard setelah pura-pura mendaftar.
  if (nama.value && email.value && password.value) {
    router.push('/dashboard')
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-[80vh] px-4 py-8">
    <div class="bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700 w-full max-w-md">
      
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Buat Akun</h1>
        <p class="text-gray-400">Mulai otomatisasi B-Roll Anda hari ini</p>
      </div>

      <form @submit.prevent="handleRegister" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Nama Lengkap</label>
          <input 
            v-model="nama" 
            type="text" 
            required 
            placeholder="Nama Anda" 
            class="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-600 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition" 
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
          <input 
            v-model="email" 
            type="email" 
            required 
            placeholder="nama@email.com" 
            class="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-600 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition" 
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
          <input 
            v-model="password" 
            type="password" 
            required 
            placeholder="••••••••" 
            class="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-600 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition" 
          />
        </div>

        <button 
          type="submit" 
          class="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-lg transition shadow-lg shadow-purple-500/30 mt-4"
        >
          Daftar Sekarang
        </button>
      </form>
      
      <p class="text-center text-sm text-gray-400 mt-6">
        Sudah punya akun? 
        <!-- Navigasi kembali ke halaman Login -->
        <RouterLink to="/login" class="text-purple-400 hover:text-purple-300 transition">Masuk di sini</RouterLink>
      </p>

    </div>
  </div>
</template>