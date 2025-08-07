const express = require("express");
import("open").then((mod) => (global.open = mod.default));

let PORT = 5173;
const path = require("path");
const supabase = require("./Supabase");
const EventEmitter = require("events");

const publicPath = path.join(__dirname, "/public");

const app = express();
app.use(express.static(publicPath));
app.use(express.json());

let server;
const authEvent = new EventEmitter();

const loginPromise = new Promise((resolve, reject) => {
  authEvent.on("authed", (code) => resolve(code));
  authEvent.on("error", () => reject("Sign ups have been closed"));
});

app.post("/token", async (req, res) => {
  const { code } = req.body;
  const {
    data: { user },
    error,
  } = await supabase.supabase.auth.getUser(code);

  supabase.updateSession(code, user);

  authEvent.emit("authed", user);
  res.sendStatus(200);
});

app.get("/auth", async (req, res) => {
  res.setHeader("Content-Type", "text/html");
  if (req?.query && req.query.error === "access_denied") {
    res.sendFile(path.join(publicPath, "/error.html"));
    authEvent.emit("error");
  } else {
    res.sendFile(path.join(publicPath, "/index.html"));
  }
});

module.exports = {
  startServer() {
    server = app.listen(PORT, async () => {
      await open(await supabase.getAuthUrl());
    });
  },
  stopServer() {
    if (server) {
      server.close();
      server = null;
    }
  },
  loginPromise,
};
