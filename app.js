const fs = require("fs");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const morganBody = require("morgan-body");
const compression = require("compression");
// const moment = require("moment-timezone");

const { resourcesNotFoundError } = require("./middlewares/errors/404");
const { serverSideError } = require("./middlewares/errors/500");
const { rateLimiterAndSlowDown } = require("./middlewares/rateLimiter");
const sqlSanitizer = require("./middlewares/sqlSanatizer");
const routes = require("./routes/v1/index");
// const socketio = require("socket.io");
const InquiryChatSocket = require("./services/inquirySocket");

require("dotenv").config();

const app = express();

const http = require("http").Server(app);
global._socketio = require("socket.io")(http, {
  cors: {
    origin: ["*"],
    // origin: [
    //   "http://localhost:3000",
    //   "http://localhost:8081",
    //   "https://hc-staging-api.reddotapps.com.sg",
    //   "https://hc-ops-react.reddotapps.com.sg",
    //   "https://hc-ops.reddotapps.com.sg",
    // ],
  },
});

const PORT = process.env.PORT || 8000;

const logStream = fs.createWriteStream("morgan.log", { flags: "a" });

// app.enable("trust proxy");
app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  })
);

app.use(cors());
app.options("*", cors());

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

morgan.token("local-time", (/* req, res, format */) => new Date());

app.use(morgan(":remote-addr - :local-time [:method :url] :status :response-time ms"));
morganBody(app, { logResponseBody: false, theme: "dracula" });// for logs on console

if (process.env.NODE_ENV !== "dev") {
  //for logs save in morgan.logs file
  morganBody(app, {
    logResponseBody: false,
    theme: "dracula",
    stream: logStream,
    logReqDateTime: true,
    noColors: true,
    logRequestId: true,
    logResHeaderList: true
  });
}

rateLimiterAndSlowDown(app)

app.use(compression())

sqlSanitizer(app)

//for inquiry with customer chat
const inquiryChatSocket = new InquiryChatSocket(_socketio);
// const socket = inquiryChatSocket.io
// inquiryChatSocket.handleConnect(socket)

app.use("/ops/v1", routes);

app.use(resourcesNotFoundError) // 404 error
app.use(serverSideError) // 500 error

http.listen(PORT, () => {
  console.log(`Server ${PORT} is up and running`);
});
