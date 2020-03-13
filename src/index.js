const path = require("path"); //step 5
const http = require("http"); //step 8
const express = require("express"); //step 1
const socketio = require("socket.io");
const Filter = require("bad-words");
const {
  generateMessage,
  generateLocationMessage
} = require("./utils/messages");
const {
  addUser,
  removeUser,
  getUser,
  getUserInRoom
} = require("./utils/users");

const app = express(); //step 2
const server = http.createServer(app); //step 9
const io = socketio(server);

const port = process.env.PORT || 3000; // step 3
const publicDirectoryPath = path.join(__dirname, "../public"); // step 6

app.use(express.static(publicDirectoryPath)); // step 7

io.on("connection", socket => {
  console.log("New Websocket connection");

  socket.on("join", (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);
    socket.emit(
      "message",
      generateMessage("Zacchaeus Napuo", "Welcomes you to his chat room!")
    );
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage("Admin", `${user.username} has joined!`)
      );
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUserInRoom(user.room)
    });
    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    const filter = new Filter();

    if (filter.isProfane(message)) {
      return callback("Profanity is not allowed!");
    }

    io.to(user.room).emit("message", generateMessage(user.username, message));
    callback();
  });

  socket.on("sendLocation", (coords, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        user.username,
        `https://google.com/maps?q=${coords.latitude},${coords.longitude}`
      )
    );

    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", `${user.username} has left!`)
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUserInRoom(user.room)
      });
    }
  });
});
//step 4
server.listen(port, () => {
  console.log(`Server is up and running on port ${port}!`);
});
