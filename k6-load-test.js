import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10000 },   // Subir a 10k usuarios
    { duration: '5m', target: 100000 },  // Subir a 100k
    { duration: '10m', target: 500000 }, // Subir a 500k
    { duration: '30m', target: 1000000 }, // Pico 1M usuarios
    { duration: '10m', target: 500000 },  // Bajar
    { duration: '5m', target: 0 },        // Enfriar
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% requests < 2s
    http_req_failed: ['rate<0.01'],      // Error rate < 1%
  },
};

export default function () {
  // Simular búsqueda de candidato
  const searchRes = http.get('https://candidato.pe/api/buscar?q=perez');
  check(searchRes, { 'search status 200': (r) => r.status === 200 });
  
  // Simular perfil de candidato
  const profileRes = http.get('https://candidato.pe/api/candidatos/12345678');
  check(profileRes, { 'profile status 200': (r) => r.status === 200 });
  
  // Simular comparación
  const compareRes = http.get('https://candidato.pe/api/comparar?dni1=12345678&dni2=87654321');
  check(compareRes, { 'compare status 200': (r) => r.status === 200 });
  
  sleep(1);
}
