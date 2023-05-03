const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
app.use(cors());

const server = http.createServer(app);

const io = require("socket.io")(server, {
	cors: {
		origin: "http://localhost:3000",
		methods: [ "GET", "POST" ]
	}
})

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);
  
  
  socket.on("join_room", (data) => {
    socket.emit('me', socket.id)
    socket.join(data);
    console.log(`User with ID: ${socket.id} joined room: ${data}`);
  });

  socket.on("callUser", (data) => {
    socket.to(data.room)
      .emit("callUser", {
        signal: data.signalData, from: data.from, name: data.name
      })
  })

  socket.on("answerCall", (data) => {
		socket.to(data.to).emit("callAccepted", data.signal)
	})

  socket.on("send_message", (data) => {
    socket.to(data.room).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

server.listen(3001, () => {
  console.log("SERVER RUNNING");
});
