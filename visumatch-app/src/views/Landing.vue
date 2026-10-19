<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

// 1. Deklarasi State Reaktif
const bRollImage = ref('')
const videoTitle = ref('')
const videoTags = ref([])
const videoDescription = ref('') // State baru untuk naskah cerita dinamis
const isLoading = ref(true) 

// 2. Fungsi Asinkron API
const fetchTrendingVisual = async () => {
  isLoading.value = true
  
  try {
    // Simulasi delay jaringan 1.5 detik
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Simulasi respons API: Gambar, Judul, Tag, dan NASKAH CERITA
    const trendingAPIResponse = [
      {
        title: 'Pesisir Nusa Penida',
        image: 'https://images.unsplash.com/photo-1586500036706-41963de24d8b?auto=format&fit=crop&q=80&w=1200',
        tags: ['perjalanan', 'alam', 'eksplorasi'],
        description: '"Di balik setiap perjalanan, ada sudut baru yang menunggu untuk ditemukan."'
      },
      {
        title: 'Cyberpunk Tokyo Malam',
        image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&q=80&w=1200',
        tags: ['kota', 'malam', 'neon', 'futuristik'],
        description: '"Cahaya neon menyala, merekam denyut nadi kota yang tak pernah tertidur pulas."'
      },
      {
        title: 'Hutan Hujan Sinematik',
        image: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=1200',
        tags: ['hutan', 'hijau', 'misteri', 'kedamaian'],
        description: '"Menyelami keheningan alam hijau, tempat kehidupan bermula dan bernapas lega."'
      }
    ]

    // AI Memilih satu tren secara acak
    const selectedTrend = trendingAPIResponse[Math.floor(Math.random() * trendingAPIResponse.length)]

    // Memasukkan data ke UI
    bRollImage.value = selectedTrend.image
    videoTitle.value = selectedTrend.title
    videoTags.value = selectedTrend.tags
    videoDescription.value = selectedTrend.description // Menyuntikkan naskah

  } catch (error) {
    console.error("Gagal mengambil data dari API:", error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchTrendingVisual()
})
</script>

<template>
  <div class="relative flex flex-col min-h-[calc(100vh-76px)] overflow-hidden w-full font-sans">
    
    <section class="relative z-10 flex flex-col items-center justify-center pt-20 pb-16 px-6 text-center w-full max-w-7xl mx-auto flex-grow">
      
      <!-- Label Atas -->
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-gray-300 text-xs font-bold mb-8">
        <span class="text-purple-400">✨</span> DARI NASKAH, JADI VISUAL.
      </div>

      <!-- Judul Utama -->
      <h1 class="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
        Ceritamu punya kata. <br />
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
          Kami temukan visualnya.
        </span>
      </h1>

      <p class="text-gray-400 max-w-2xl mx-auto text-base md:text-lg mb-10 leading-relaxed">
        VisuMatch memahami naskahmu dengan AI, lalu mencocokkan B-roll yang relevan. Lebih sedikit mencari. Lebih banyak bercerita.
      </p>

      <!-- Tombol Aksi -->
      <div class="flex flex-col sm:flex-row gap-4 mb-20 justify-center w-full sm:w-auto">
        <RouterLink to="/login" class="bg-purple-600 border border-purple-400 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition flex items-center justify-center gap-2">
          Mulai berkarya <span>→</span>
        </RouterLink>
        <a href="#cara-kerja" class="bg-gray-900 border border-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-8 rounded-lg transition flex items-center justify-center gap-2">
          <span class="text-lg leading-none">▷</span> Lihat cara kerja
        </a>
      </div>

      <!-- SHOWCASE CARD DINAMIS -->
      <div class="w-full max-w-5xl bg-gray-900/80 border border-gray-800 rounded-2xl p-6 md:p-8 backdrop-blur-md text-left flex flex-col md:flex-row gap-8 items-center shadow-2xl relative overflow-hidden min-h-[300px]">
        
        <!-- STATE LOADING -->
        <div v-if="isLoading" class="absolute inset-0 z-50 bg-gray-900/80 backdrop-blur flex flex-col items-center justify-center">
          <div class="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p class="text-purple-400 text-sm font-bold animate-pulse">Menganalisis Naskah & Menghubungkan ke API...</p>
        </div>

        <!-- STATE SUKSES: Bagian Kiri (Konteks Cerita) -->
        <div class="w-full md:w-5/12 space-y-6 z-10 transition-opacity duration-500" :class="{'opacity-0': isLoading}">
          <div class="flex items-center gap-2 text-gray-300 font-bold text-sm">
            📄 Mulai dari sebuah cerita
          </div>
          
          <!-- Teks Cerita Dinamis dari API -->
          <p class="text-white text-lg font-medium leading-relaxed">
            {{ videoDescription }}
          </p>
          
          <div class="flex flex-wrap gap-2">
            <span v-for="tag in videoTags" :key="tag" class="bg-gray-800 border border-gray-700 text-gray-400 text-xs px-3 py-1 rounded-full uppercase tracking-wider">
              {{ tag }}
            </span>
          </div>
          
          <div class="flex items-center gap-2 text-emerald-400 text-sm font-bold mt-4">
            <span>✓</span> Konteks dipahami oleh AI
          </div>
        </div>

        <!-- STATE SUKSES: Bagian Kanan (Preview Video B-Roll) -->
        <div class="w-full md:w-7/12 relative rounded-xl overflow-hidden border border-gray-800 bg-black group z-10 transition-opacity duration-500" :class="{'opacity-0': isLoading}">
          
          <img :src="bRollImage" :alt="videoTitle" class="w-full h-64 object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition duration-700" />
          
          <div class="absolute top-4 left-4 bg-emerald-900/80 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md">
            <span>✨</span> 98% cocok dengan naskah
          </div>

          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="w-14 h-14 bg-black/40 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white/90 group-hover:bg-purple-600/80 group-hover:border-purple-400 transition duration-300 pointer-events-auto cursor-pointer">
              <span class="ml-1 text-xl">▷</span>
            </div>
          </div>

          <div class="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-gray-950 to-transparent flex justify-between items-end">
            <span class="text-white text-xs font-medium">{{ videoTitle }} · 00:12</span>
            <span class="text-gray-400 text-[11px]">4K · Bebas royalti</span>
          </div>
        </div>

      </div>

      <!-- Indikator Langkah -->
      <div class="w-full max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-500 font-medium border-t border-gray-800/50 pt-8">
        <div><span class="text-gray-300 mr-2">01</span> Tulis atau unggah naskah</div>
        <div><span class="text-gray-300 mr-2">02</span> AI mencocokkan B-roll</div>
        <div><span class="text-gray-300 mr-2">03</span> Sempurnakan & ekspor</div>
      </div>

    </section>
  </div>
</template>