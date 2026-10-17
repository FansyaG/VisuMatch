<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="flex flex-col min-h-[calc(100vh-76px)]">
    
    <!-- Hero Section -->
    <section class="flex-grow flex items-center justify-center text-center px-4 py-20">
      <div class="max-w-4xl mx-auto">
        <div class="inline-block px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm font-semibold mb-6">
          ✨ Prototipe VisuMatch v1.0
        </div>
        
        <h1 class="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight leading-tight">
          Otomatisasi B-Roll dengan <br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
            Kecerdasan Buatan
          </span>
        </h1>
        
        <p class="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Tinggalkan cara manual mencari video stok. VisuMatch menganalisis konteks suara dan teks Anda untuk menyisipkan klip B-Roll yang sempurna ke dalam timeline secara otomatis.
        </p>
        
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <RouterLink to="/register" class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 px-8 rounded-lg transition shadow-lg shadow-purple-500/30 text-lg">
            Mulai Gratis Sekarang
          </RouterLink>
          <a href="#fitur" class="bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 px-8 rounded-lg transition border border-gray-700 text-lg">
            Pelajari Fitur
          </a>
        </div>
      </div>
    </section>

    <!-- Fitur Section -->
    <section id="fitur" class="bg-gray-900 border-t border-gray-800 py-20 px-4">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-bold text-white mb-4">Cara Kerja VisuMatch</h2>
          <p class="text-gray-400">Tiga langkah mudah menghemat berjam-jam waktu editing Anda.</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Kartu Fitur 1 -->
          <div class="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:border-purple-500 transition group">
            <div class="w-14 h-14 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
              🎙️
            </div>
            <h3 class="text-xl font-bold text-white mb-3">1. Analisis Konteks</h3>
            <p class="text-gray-400 leading-relaxed">
              Unggah A-Roll Anda. Mesin NLP kami akan mentranskripsi audio dan mengekstrak kata kunci pencarian secara otomatis.
            </p>
          </div>

          <!-- Kartu Fitur 2 -->
          <div class="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:blue-purple-500 transition group">
            <div class="w-14 h-14 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
              🔍
            </div>
            <h3 class="text-xl font-bold text-white mb-3">2. Pencarian Instan</h3>
            <p class="text-gray-400 leading-relaxed">
              Sistem menarik aset B-Roll beresolusi tinggi langsung dari API pihak ketiga (Pexels/Storyblocks) berdasarkan konteks kalimat.
            </p>
          </div>

          <!-- Kartu Fitur 3 -->
          <div class="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:border-emerald-500 transition group">
            <div class="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
              ⏱️
            </div>
            <h3 class="text-xl font-bold text-white mb-3">3. Sinkronisasi Timeline</h3>
            <p class="text-gray-400 leading-relaxed">
              Klip B-Roll dipotong dan diletakkan tepat di atas timeline (V2), tersinkronisasi dengan penanda waktu (timestamp) ucapan Anda.
            </p>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>