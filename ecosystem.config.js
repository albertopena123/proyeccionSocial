module.exports = {
  apps: [{
    name: 'proyeccion-social',
    script: './node_modules/next/dist/bin/next',
    args: 'start',
    cwd: './',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '400',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};