module.exports = {
  apps: [
    {
      name: 'suneung',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/home/ubuntu/suneung',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
