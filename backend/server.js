const express = require("express");
const next = require("next");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);
  const io = new Server(httpServer);

  // uploads folder ko static serve karna
  server.use("/uploads", express.static(path.join(__dirname, "uploads")));

  // socket.io
  io.on("connection", (socket) => {
    console.log("User connected");

    socket.on("sendImage", (imageData) => {
      // yaha image ko uploads folder me save karna hoga
      // fir uska URL send kar dena client ko
      socket.broadcast.emit("receiveImage", {
        url: `/uploads/${imageData.filename}`,
      });
    });
  });

  server.all("*", (req, res) => {
    return handle(req, res);
  });

  httpServer.listen(3000, () => {
    console.log("> Ready on http://localhost:3000");
  });
});



