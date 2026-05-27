const express = require('express');
const path = require('path');
const app = express();

// Servir de forma estática los archivos de la carpeta views (index.html, manifest, sw.js)
app.use(express.static(path.join(__dirname, 'views')));

// Endpoint para el monitoreo en tiempo real de la Segunda Vuelta (Balotaje + Tercer Candidato)
app.get('/api/votos-monitoreo', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'FP', candidato: 'Keiko Fujimori', partido: 'Fuerza Popular', porcentaje_1ra: 17, semaforo: 'Rojo' },
      { id: 'JP', candidato: 'Roberto Sánchez', partido: 'Juntos por el Perú', porcentaje_1ra: 12, semaforo: 'Ámbar' },
      { id: 'BVN', candidato: 'Voto Blanco / Viciado / Nulo', partido: 'Descontento Ciudadano', porcentaje_1ra: 71, semaforo: 'Verde' }
    ]
  });
});

// Ruta principal para servir la PWA
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Configuración del puerto de laboratorio aislado
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 [Antigravity Core] Servidor de Segunda Vuelta corriendo en http://localhost:${PORT}`);
});
