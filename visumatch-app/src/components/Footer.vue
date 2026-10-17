<template>
  <footer class="bg-gray-950 border-t border-gray-800 text-gray-400 pt-16 pb-8 mt-auto font-sans">
    <div class="w-full px-6">
      
      <!-- Layout Flexbox: Memisahkan Kiri (Branding) dan Kanan (3 Kolom Menu) -->
      <div class="flex flex-col md:flex-row justify-between gap-10 mb-16 border-b border-gray-800 pb-12">
        
        <!-- BAGIAN KIRI: Branding -->
        <div class="md:w-1/3">
          <h2 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500 mb-4">
            VisuMatch
          </h2>
          <p class="text-sm text-gray-500 leading-relaxed pr-4">
            Platform AI Context Matcher terdepan untuk otomatisasi B-Roll. Menghemat berjam-jam waktu editing video Anda dengan keakuratan NLP.
          </p>
        </div>

        <!-- BAGIAN KANAN: 3 Kolom Menu (didorong ke ujung kanan dengan md:justify-end) -->
        <div class="flex flex-col sm:flex-row gap-10 md:gap-16 md:w-2/3 md:justify-end">
          
          <!-- Kolom: Produk -->
          <div class="w-full sm:w-auto">
            <h3 class="text-white font-bold mb-4 uppercase text-xs tracking-wider">Produk</h3>
            <ul class="space-y-3 text-sm">
              <li><a href="#" class="hover:text-purple-400 transition">Harga & Paket</a></li>
              <li><a href="#" class="hover:text-purple-400 transition">Katalog API Eksternal</a></li>
              <li><a href="#" class="hover:text-purple-400 transition">Integrasi Premiere Pro</a></li>
              <li><a href="#" class="hover:text-purple-400 transition">Dokumentasi XML/EDL</a></li>
            </ul>
          </div>

          <!-- Kolom: Sumber Daya -->
          <div class="w-full sm:w-auto">
            <h3 class="text-white font-bold mb-4 uppercase text-xs tracking-wider">Sumber Daya</h3>
            <ul class="space-y-3 text-sm">
              <li><a href="#" class="hover:text-purple-400 transition">Pusat Bantuan</a></li>
              <li><a href="#" class="hover:text-purple-400 transition">Blog & Tutorial</a></li>
              <li><a href="#" class="hover:text-purple-400 transition">Komunitas Kreator</a></li>
              <li><a href="#" class="hover:text-purple-400 transition">Status Server</a></li>
            </ul>
          </div>

          <!-- Kolom: Perusahaan -->
          <div class="w-full sm:w-auto">
            <h3 class="text-white font-bold mb-4 uppercase text-xs tracking-wider">Perusahaan</h3>
            <ul class="space-y-3 text-sm">
              <li><a href="#" class="hover:text-purple-400 transition">Tentang Kami</a></li>
              <li><a href="#" class="hover:text-purple-400 transition">Karir</a></li>
              <li><a href="#" class="hover:text-purple-400 transition">Kebijakan Privasi</a></li>
              <li><a href="#" class="hover:text-purple-400 transition">Syarat & Ketentuan</a></li>
            </ul>
          </div>

        </div>
      </div>

      <!-- Bagian Bawah (Copyright & Socials) -->
      <div class="flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
        <p>
          &copy; 2026 <span class="text-white font-medium">VisuMatch Inc.</span> Hak Cipta Dilindungi.
        </p>
        
        <div class="flex gap-4">
          <a href="#" class="hover:text-white transition">X (Twitter)</a>
          <a href="#" class="hover:text-white transition">YouTube</a>
          <a href="#" class="hover:text-white transition">Instagram</a>
        </div>
      </div>

    </div>
  </footer>
</template>