const PORT = process.env.PORT || 33331;

const createError = require('http-errors');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const server = require('http').createServer();
const io = require('socket.io')(server);
const app = express();
const loginRouter = express.Router();



/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 *                   Game global variables and const
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
let connectionID = 0;
const USERS = {};
const MAP = [
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
const CLASESS = [
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




/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 *                   Game functions
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function containUser(username, users = USERS){
  return Object.keys(users).includes(username);
}

function findArray(arrSource, elToFind){
  let el = elToFind.join('');
  for (let i = 0; i < arrSource.length; ++i)
    if (arrSource[i].join('') == el)
      return i;
  return -1;
}

function getStatOfClass(class_id, stat, classes = CLASESS){
  for (let i = 0; i < classes.length; ++i)
    if(classes[i]['class_id'] === class_id)
      return classes[i][stat];
  return undefined;
}

function appendPlayer(username, class_id, users = USERS, map = MAP){
  users[username]['class'] = class_id;
  users[username]['player_xy'] = [0,0];

  let height = map.length;
  let width = map[0].length;

  let positions = [[1, 1], [1, width - 2], [height - 2, 1], [height - 2, width - 2]];

  for (let user of Object.keys(users)){
    let index = findArray(positions, users[user]['player_xy']);
    console.log(index, user, users[user]['player_xy']);
    if (index > -1)
      positions.splice(index, 1);
  }

  
  users[username]['dead'] = false;
  users[username]['live'] = getStatOfClass(class_id, 'live');
  users[username]['speed'] = getStatOfClass(class_id, 'speed');
  users[username]['immortal'] = false;
  users[username]['bomb_range'] = getStatOfClass(class_id, 'bomb_range');
  users[username]['bomb_amount'] = getStatOfClass(class_id, 'bomb_amount');
  users[username]['bomb_planted'] = 0;
  users[username]['player_xy'] = positions[0];
}

function movePlayer(username, direction, users = USERS, map = MAP){
  const dir = {'left': [-1, 0], 'right':[1, 0], 'up': [0, -1], 'back': [0, 1]};
  const vecxy = dir[direction];
  const userxy = users[username]['player_xy'];

  const finxy = [vecxy[0] + userxy[0], vecxy[1] + userxy[1]];

  let height = map.length;
  let width = map[0].length;
  
  if( finxy[0] > 0 && finxy[0] < width &&  // Check x
      finxy[1] > 0 && finxy[1] < height && // Check y
      map[finxy[1]][finxy[0]] === 0        // Check map
  ){
    users[username]['player_xy'] = finxy;
    return finxy;
  }

  return null;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 *                   Express init
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// Login router
loginRouter.post('/login', function(req, res, next) {
  const username = req.body.UID;
  if (username === undefined || Object.keys(USERS).includes(username))
    return res.json({'status': 1});
  
    if (Object.keys(USERS).length >= 4)
    return res.json({'status': 1});
  
  USERS[username] = {};
  res.json({'status': 0, 'classes': CLASESS});
});
app.use('/', loginRouter);

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


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 *                              SocketIO
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

io.on('connection', (socket) => {

  socket.on('login', (username, class_id) => {
    socket.username = username;
    appendPlayer(username, class_id);
    socket.emit('loggedIn', {
      'status': 0,
      'map': MAP,
      'player_xy': USERS[username]['player_xy']
    });
  });
  
  // Ad.: 1.c. poruszanie się gracza
  socket.on('request_move', (direction) =>{
    let xy = movePlayer(socket.username, direction);
    if(xy !== null)
      io.sockets.emit('move player', {'UID': socket.username, 'player_xy': {'x': xy[0], 'y': xy[1]}});
  });

  socket.on('request place bomb', ()=>{
    let xy = users[socket.username]['player_xy'];
    
  });
  
});

module.exports = app;
