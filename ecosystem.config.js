module.exports = {
  apps: [{
    name: 'proyeccion-social',
    script: './node_modules/next/dist/bin/next',
    // -H 127.0.0.1 es imprescindible, no redundante con el HOSTNAME de env: se
    // comprobo el 29/07/2026 que Next 15 IGNORA esa variable y abre el socket en
    // "::" (todas las interfaces). Sin este flag la app quedaba accesible en
    // claro por http://192.168.254.17:3001, saltandose el TLS de Apache.
    // Se entra solo por proyeccionsocial.unamad.edu.pe (proxy inverso).
    args: 'start -p 3001 -H 127.0.0.1',
    cwd: './',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    kill_timeout: 10000,
    listen_timeout: 10000,
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      HOSTNAME: '127.0.0.1'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
    time: true
  }]
};