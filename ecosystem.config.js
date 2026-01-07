module.exports = {
  apps: [
    {
      name: "chat-3000",
      script: "server.js",
      env: { PORT: 3000, NODE_ENV: "development" }
    },
    {
      name: "chat-3001",
      script: "server.js",
      env: { PORT: 3001, NODE_ENV: "development" }
    },
    {
      name: "chat-3002",
      script: "server.js",
      env: { PORT: 3002, NODE_ENV: "development" }
    }
  ]
}
