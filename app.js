const createError = require('http-errors');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const { Server } = require('ws');
var http = require("http");

const PORT = process.env.PORT || 33331;

const app = express();

// view engine setup

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


const httpserver = http.createServer(app);
const wss = new Server({ server: httpserver });
httpserver.listen(PORT);

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 *                              WebSocket
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */


/* Game global variables and const */
let connectionID = 0;

const users = {};

const map = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const character_clasess = [
  {
    "class_id": "1",
    "class_name": "Zwinne nogi",
    "speed": 2,
    "bomb_amount": 1,
    "bomb_range": 1,
    "live": 3,
    "description": "Zwiększa szybkość postaci o 1",
  },
  {
    "class_id": "2",
    "class_name": "Bomber",
    "speed": 1,
    "bomb_amount": 2,
    "bomb_range": 1,
    "live": 3,
    "description": "Zwiększa liczbę bomb o 1",
  },
  {
    "class_id": "3",
    "class_name": "Medyk",
    "speed": 1,
    "bomb_amount": 1,
    "bomb_range": 1,
    "live": 4,
    "description": "Zwiększa liczbę żyć o 1",
  },
  {
    "class_id": "4",
    "class_name": "Rage Bomber",
    "speed": 1,
    "bomb_amount": 1,
    "bomb_range": 2,
    "live": 3,
    "description": "Zwiększa zasięg bomb o 1",
  }
];



function handleEndpoint_Login(parsedMessage, ws, userID) {
  const usernameTaken = (usersList, username) => {
    for (const [id, value] of Object.entries(usersList))
      if (value.UID === username)
        return true;
    return false;
  };

  let message = {};
  if (usernameTaken(users, parsedMessage.UID)) {
    message = {
      type: 'login',
      status: 1,
      error_msg: "Username already taken!"
    };
  }
  else {
    message = {
      type: 'login',
      status: 0,
      map: map,
      users: users,
      userID: userID,
      character_clasess: character_clasess
    };
  }

  users[userID].UID = parsedMessage.UID;
  ws.send(JSON.stringify(message));
}

wss.on('connection', function (ws, req) {
  const userID = connectionID++;
  users[userID] = {};

  ws.on('message', function (message) {
    const parsedMessage = JSON.parse(message);

    switch (parsedMessage.type) {
      case 'login':
        handleEndpoint_Login(parsedMessage, this, userID);
        break;

      default:
        break;
    }
  });

  ws.on('close', function (ws) {
    users[userID] = undefined;
  });
});

setInterval(() => {
  console.log(wss.clients.size);
  wss.clients.forEach(client => client.send(JSON.stringify({ type: 'users', users: users })));
}, 1000);

module.exports = app;
