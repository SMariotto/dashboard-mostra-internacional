// Anúncio UDP para os ESP32 acharem o servidor sem IP fixo.
// A cada 2 s manda "SMARTCANADA <ip> <porta>" para o endereço de broadcast de cada rede.
import { createSocket } from 'node:dgram';
import { networkInterfaces } from 'node:os';

/** Redes IPv4 com o endereço de broadcast de cada uma. */
export function redesComBroadcast() {
  const redes = [];
  for (const lista of Object.values(networkInterfaces())) {
    for (const i of lista ?? []) {
      if (i.family !== 'IPv4' || i.internal || i.address.startsWith('169.254.')) continue;
      const ip = i.address.split('.').map(Number);
      const mascara = i.netmask.split('.').map(Number);
      const broadcast = ip.map((parte, k) => (parte | (~mascara[k] & 255))).join('.');
      redes.push({ ip: i.address, broadcast });
    }
  }
  return redes;
}

/**
 * @param {object} op
 * @param {number} op.portaHttp
 * @param {number} op.portaUdp   5051
 * @param {number} op.intervaloMs
 */
export function iniciarDescoberta({ portaHttp, portaUdp, intervaloMs }) {
  const socket = createSocket({ type: 'udp4', reuseAddr: true });
  let avisouErro = false;
  socket.on('error', (e) => {
    if (!avisouErro) console.warn(`[descoberta] erro no UDP (${e.message}). Os ESP32 vão usar o IP de reserva.`);
    avisouErro = true;
  });

  function anunciar() {
    for (const { ip, broadcast } of redesComBroadcast()) {
      const msg = Buffer.from(`SMARTCANADA ${ip} ${portaHttp}`);
      socket.send(msg, portaUdp, broadcast, (e) => {
        if (e && !avisouErro) { console.warn(`[descoberta] não consegui anunciar em ${broadcast}: ${e.message}`); avisouErro = true; }
      });
    }
  }

  let timer = null;
  socket.bind(0, () => {
    try { socket.setBroadcast(true); } catch (e) { console.warn('[descoberta] broadcast negado:', e.message); }
    anunciar();
    timer = setInterval(anunciar, intervaloMs);
  });

  return {
    parar() {
      if (timer) clearInterval(timer);
      try { socket.close(); } catch { /* já fechado */ }
    },
  };
}
