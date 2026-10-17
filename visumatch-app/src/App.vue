<script setup>
import { RouterView } from 'vue-router'
import Navbar from './components/Navbar.vue'
import Footer from './components/Footer.vue'
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-white font-sans flex flex-col">
    
    <!-- Navbar Dinamis (Menempel di atas) -->
    <Navbar />
    
    <!-- Area konten utama -->
    <main class="flex-grow flex flex-col">
      <RouterView />
    </main>

    <!-- Footer Konsisten (Selalu di bawah) -->
    <Footer />
    
  </div>
</template>