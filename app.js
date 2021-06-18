const PORT = process.env.PORT || 3000;
const PORT_SOCKETIO = process.env.PORT || 3001;

const createError = require('http-errors');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const app = express();
const loginRouter = express.Router();
const cors = require('cors');


const server = app.listen(PORT, function () {
  console.log(`Listening on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});
const io = require('socket.io')(server, { transport: ['websocket'] });

/**
 * 1. Statystyki
 * 2. Odłączanie gracza od sterowania po śmierci
 * 3. Gracz odłączony -> gracz martwy 
 */

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 *                   Game global variables and const
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
var USERS = {};
const MAP = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 1],
  [1, 0, 1, 2, 1, 2, 1, 2, 1, 2, 1, 0, 1, 0, 1],
  [1, 2, 2, 2, 2, 2, 0, 2, 0, 2, 0, 2, 2, 2, 1],
  [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 0, 1, 2, 1],
  [1, 2, 2, 2, 2, 0, 2, 0, 0, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 0, 1, 2, 1, 2, 1, 2, 1, 0, 1, 2, 1],
  [1, 2, 0, 2, 2, 2, 2, 2, 0, 2, 0, 2, 0, 2, 1],
  [1, 2, 1, 2, 1, 2, 1, 0, 1, 2, 1, 2, 1, 2, 1],
  [1, 0, 2, 2, 0, 2, 2, 2, 0, 2, 2, 2, 2, 2, 1],
  [1, 0, 1, 0, 1, 2, 1, 0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];
const CLASESS = [
  {
    "class_id": "1",
    "class_name": "Zwinne nogi",
    "speed": 2,
    "bomb amount": 1,
    "bomb_range": 1,
    "live": 3,
    "description": "Zwiększa szybkosc postaci o 1",
  },
  {
    "class_id": "2",
    "class_name": "Bomber",
    "speed": 1,
    "bomb amount": 2,
    "bomb_range": 1,
    "live": 3,
    "description": "Zwieksza liczbe bomb o 1",
  },
  {
    "class_id": "3",
    "class_name": "Medyk",
    "speed": 1,
    "bomb amount": 1,
    "bomb_range": 1,
    "live": 4,
    "description": "Zwieksza liczbe zyc o 1",
  },
  {
    "class_id": "4",
    "class_name": "Rage Bomber",
    "speed": 1,
    "bomb amount": 1,
    "bomb_range": 2,
    "live": 3,
    "description": "Zwieksza zasieg bomb o 1",
  }
];
const WIDTH = MAP[0].length;
const HEIGHT = MAP.length;
const BOMBS = [];
const BOMB_TIMER = 2000;

const BASE_MOVE_TIME = 500;
const SPEED_MULTIPLER = 50;
const MAX_SPEED_STAT = 5;

const PLAYERS_NUMBER = 3;
const IMMORTAL_TIME = 3000;

const STATISTICS_TIME = 1000;

const BONUSES = [];
const BONUS_PROB = 1.0;
const BONUSES_T = ['speed', 'bomb_range', 'bomb amount'];
let PLAYERS = 0;
let MAP_TEMP = JSON.parse(JSON.stringify(MAP)); // clone trick


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 *                   Game functions
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function containUser(username, users = USERS) {
  return Object.keys(users).includes(username);
}

function findArray(arrSource, elToFind) {
  let el = elToFind.join('');
  for (let i = 0; i < arrSource.length; ++i)
    if (arrSource[i].join('') == el)
      return i;
  return -1;
}

function getStatOfClass(class_id, stat, classes = CLASESS) {
  for (let i = 0; i < classes.length; ++i)
    if (classes[i]['class_id'] === class_id)
      return classes[i][stat];
  return undefined;
}

function appendPlayer(username, class_id, users = USERS, map = MAP) {
  console.log(username);
  if(users[username] == undefined){
    return -1;
  }
  let height = map.length;
  let width = map[0].length - 2;

  let positions = [[1, 1], [1, width - 2], [height - 2, 1], [height - 2, width - 2]];

  for (let user of Object.keys(users)) {
    let index = findArray(positions, users[user]['player_xy']);
    console.log(index, user, users[user]['player_xy']);
    if (index > -1)
      positions.splice(index, 1);
  }
  users[username]['class'] = class_id;
  users[username]['player_xy'] = positions[0];
  users[username]['live'] = getStatOfClass(class_id, 'live');
  users[username]['speed'] = getStatOfClass(class_id, 'speed');
  users[username]['bomb_range'] = getStatOfClass(class_id, 'bomb_range');
  users[username]['bomb amount'] = getStatOfClass(class_id, 'bomb amount');
  return 0;
}

function movePlayer(username, direction, users = USERS, map = MAP_TEMP) {
  if(!users[username]['canMove'])
    return null;
  
  const dir = { 'left': [-1, 0], 'right': [1, 0], 'up': [0, -1], 'back': [0, 1] };
  const vecxy = dir[direction];
  const userxy = users[username]['player_xy'];

  const finxy = [vecxy[0] + userxy[0], vecxy[1] + userxy[1]];

  let height = map.length;
  let width = map[0].length;

  if (finxy[0] > 0 && finxy[0] < width &&  // Check x
    finxy[1] > 0 && finxy[1] < height && // Check y
    map[finxy[1]][finxy[0]] == 0        // Check map
  ) {
    users[username]['player_xy'] = finxy;

    // Zablokuj ruch gracza na kilkaset milisekund
    users[username]['canMove'] = false;
    setTimeout(() => {
      users[username]['canMove'] = true;
    }, BASE_MOVE_TIME - (SPEED_MULTIPLER * users[username]['speed']) );
    return finxy;
  }

  return null;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 *                   Express init
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// view engine setup
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors({ credentials: true, origin: true }));
app.use(express.urlencoded({ extended: false }));

// Login router
loginRouter.post('/login', function (req, res) {
  console.log('Request', req.body);
  const username = req.body.UID;
  if (username === undefined || Object.keys(USERS).includes(username))
    return res.json({ 'status': 1 });

  if (Object.keys(USERS).length >= PLAYERS_NUMBER)
    return res.json({ 'status': 1 });


  USERS[username] = {
    'class': 0,
    'player_xy': [0, 0],
    'dead': false,
    'canMove': true,
    'immortal': false,
    'bomb_planted': 0,
    'live': 0,
    'speed': 0,
    'bomb_range': 0,
    'bomb amount': 0,
    'points': 0
  };
  res.json({ 'status': 0, 'classes': CLASESS });
});
loginRouter.post('/reset', function (req, res) {
  restartGameStateOnServer();
  res.json({ 'status': 0 });
});

app.use('/', loginRouter);


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
  res.json({ error: err });
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 *                              SocketIO
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

io.on('connection', (socket) => {
  console.log('connected');

  // Wybór klasy postaci i logowanie przez socket
  socket.on('login', (data) => {
    // Liczba graczy zbyt duża, odrzuć połączenie
    if (PLAYERS >= PLAYERS_NUMBER)
      return socket.emit('loggedIn', {
        'status': 1
      });

    username = data['UID']
    class_id = data['class_id']
    socket.username = username;

    //crash fix
    if(appendPlayer(username, class_id) == -1){
      return;
    }
    
    // Gracz poprawnie zalogowany
    ++PLAYERS;
    socket.emit('loggedIn', {
      'status': 0,
      'map': MAP,
      'player_xy': USERS[username]['player_xy']
    });

    // Liczba graczy wystarczająca aby rozpocząć grę
    let connected_users = [];
    for (let user of Object.keys(USERS)) {
      let [x, y] = USERS[user]['player_xy']
      connected_users.push({
        'UID': user,
        'lives': USERS[user]['live'],
        'player_xy': {
          'x': x,
          'y': y,
        },
        'points': USERS[user]['points']
      });
    }
    
    // Gra się rozpoczęła, powiadom użytkowników
    if (PLAYERS == PLAYERS_NUMBER) {
      io.sockets.emit('start game', {
        'users': connected_users,
        'map': MAP
      });

      // Odświeżaj statystyki graczy
      // Dodatkowo monitoruj stan rozgrywki i powiadom o jej zakończeniu
      const statisticsInterval = setInterval(()=>{
        let [playerStat, playersDead] = updatePlayerStatistics(USERS);

        // Jeżeli został ostatni gracz, to gra się skończyła
        // Zresetuj stan gry na serwerze i roześlij komunikat game over
        if(PLAYERS - playersDead <= 1){
          let winner = 'No one!';

          // Wyszukaj zwycięzce i go uśmierć wszystkich, aby odłączyć sterowanie
          for (let user of Object.keys(USERS)){
            if(USERS[user]['dead'] === false){
              winner = user;
            }
            USERS[user]['dead'] = true;
          }

          // Rozgłoś komunikat game over
          io.sockets.emit('game over', {'winner': winner});

          // Zresetuj stan gry i czekaj na nowe połączenia
          restartGameStateOnServer();

          // Zatrzymaj rozsyłanie statystyk
          clearInterval(statisticsInterval);
        } else { // W przeciwnym razie wyślij zaktualizowane statystyki
          io.sockets.emit('update player statistics', {'users': playerStat});
        }
      }, STATISTICS_TIME);
    }
  });

  // Gracz się rozłączył, uśmierć go
  socket.on('disconnect', ()=>{
    // Gra może się zresetować, trzeba sprawdzić czy klucz istnieje
    if (socket.username in USERS){
      USERS[socket.username]['live'] = 0;
      USERS[socket.username]['dead'] = true;
    }
    // Wykorzystaj 'hit player' do rozesłania komunikatu innym użytkownikom
    io.sockets.emit('hit player', {'UID': socket.username, 'status': 'dead', "immortal_time": 0});
    console.log('Odłączono', socket.username);
  });

  // Ad.: 1.c. poruszanie się gracza
  socket.on('request_move', (direction) => {
    if(socket.player_move_lock || !(socket.username in USERS) || USERS[socket.username]['dead'])
      return;
    
    // Spróbuj ruszyć graczem w danym kierunku
    let xy = movePlayer(socket.username, direction['direction']);
    if (xy !== null){
      // Sprawdź czy nie było kolizji z bonusem
      let index = bonusColision(xy, BONUSES);
      if(index !== -1){
        // Gracz wszedł na bonus
        // Zwiększ statystykę 
        USERS[socket.username][BONUSES[index]['bonus_type']]++;
        if(USERS[socket.username]['speed'] > MAX_SPEED_STAT)
          USERS[socket.username]['speed']--;
        
        // Powiadom graczy, że bonus zniknął
        io.sockets.emit("remove bonus", {'bonus_xy': BONUSES[index]['bonus_xy']});

        // Usuń bonus z tablicy
        BONUSES.splice(index, 1);
      }

      // Wyślij informację o tym, że gracz się ruszył
      io.sockets.emit('move player', { 'UID': socket.username, 'player_xy': { 'x': xy[0], 'y': xy[1] } });
    }
  });

  // Ad.: 1.e. stawianie i wybuch bomb
  socket.on('request place bomb', () => {
    // Gracz martwy, albo po zakończeniu gry nie może stawiać bomb
    if (!(socket.username in USERS) || USERS[socket.username]['dead'])
      return;

    // Gracz nie może postawić zbyt wielu bomb
    if (USERS[socket.username]['bomb_planted'] >= USERS[socket.username]['bomb amount'])
      return;

    // Nie można postawić bomby na bombie
    let xy = USERS[socket.username]['player_xy'];
    let index = findArray(BOMBS, xy);
    if (index != -1)
      return;

    USERS[socket.username]['bomb_planted']++; 

    // Gracz może postawić bombę 
    BOMBS.push(xy);
    io.sockets.emit('place bomb', { 'bomb_xy': { 'x': xy[0], 'y': xy[1] } });

    // Ustaw czas do wybuchu bomby
    setTimeout(() => {
      // Usuń bombę z tablicy
      BOMBS.pop(xy);

      // Serwer skończył grę, nie ma już graczy, dezaktywuj bomby
      if(!(socket.username in USERS) || PLAYERS === 0)
        return;

      USERS[socket.username]['bomb_planted']--;
      let radius = USERS[socket.username]['bomb_range'];
      let [removed_blocks, player_killed] = bombExplode(xy, radius);

      // Powiadom graczy o wybuchu bomby
      io.sockets.emit('place explode', { 'bomb_xy': { 'x': xy[0], 'y': xy[1] }, 'radius': radius });

      // Jeżeli bomba usunęła jakieś bloki to powiadom graczy
      if (removed_blocks.length > 0){
        io.sockets.emit("remove block", { 'blocks': removed_blocks });

        // Dodatkowo rozstaw bonusy na tych blokach z pewnym prawdopodobieństwem
        const bonuses = generateBonuses(removed_blocks, BONUS_PROB);
        for(let i = 0; i < bonuses.length; ++i){
          BONUSES.push(bonuses[i]);
          io.sockets.emit("place bonus", bonuses[i]);
        }
      }

      // Jeżeli bomba kogoś zabiła to powiadom graczy, oraz zwiększ wynik gracza
      for(let i = 0; i < player_killed.length; ++i){
        // Gracz nie powinien dostawać punktów za zabicie siebie
        if(player_killed[i].UID != socket.username)
          USERS[socket.username]['points']++;
        io.sockets.emit("hit player", player_killed[i]);
      }

    }, BOMB_TIMER);
  });

});

function restartGameStateOnServer(){
  USERS = {};
  PLAYERS = 0;
  BONUSES.slice(0, BONUSES.length);
  BOMBS.slice(0, BONUSES.length);
  MAP_TEMP = JSON.parse(JSON.stringify(MAP));
}

function updatePlayerStatistics(users = USERS){
  let playersDead = 0;
  let playerStat = [];
  for (let user of Object.keys(users)) {
    playerStat.push({
      'UID': user,
      'lives': users[user]['live'],
      'points': users[user]['points']
    });
    playersDead += users[user]['dead']; // if true +1, else +0
  }
  return [playerStat, playersDead];
}

function bonusColision(xy, bonuses = BONUSES){
  const [x, y] = xy;
  for(let i = 0; i < bonuses.length; ++i){
    const bx = bonuses[i]['bonus_xy']['x'];
    const by = bonuses[i]['bonus_xy']['y'];

    if(x === bx && y === by)
      return i;
  }
  return -1;
}

function generateBonuses(removed_blocks, probability){
  const bonuses = [];

  for (let i = 0; i < removed_blocks.length; ++i) {
    if(Math.random() < probability){
      bonuses.push({
        'bonus_type': BONUSES_T[Math.floor(Math.random() * BONUSES_T.length)],
        'bonus_xy': removed_blocks[i]
      });
    }
  }
  return bonuses;
}

function bombExplode(xy, radius) {
  let [x, y] = xy;
  let removed_blocks = [];
  let player_killed = [];

  const checkColisionWithPlayer = (x, y, arr) => {
    for (let user of Object.keys(USERS)) {
      let [px, py] = USERS[user]['player_xy'];

      // Jeżeli gracz stoi na wybuchu bomby i jest śmiertelny
      if(px === x && py === y && USERS[user]['immortal'] === false){
        --USERS[user]['live'];
        if(USERS[user]['live'] <= 0){
          USERS[user]['dead'] = true;
          arr.push({'UID': user, 'status': 'dead', 'immortal_time': 0});
        }
        else{
          USERS[user]['immortal'] = true;
          setTimeout(()=>USERS[user]['immortal'] = false, IMMORTAL_TIME);
          arr.push({'UID': user, 'status': 'immortal', 'immortal_time': IMMORTAL_TIME});
        }
      }
    }
  };

  // Przypadek 1. kierunek północny
  for (let i = 0; i >= -radius; --i) {
    let nx = x + i;
    checkColisionWithPlayer(nx, y, player_killed);
    if (nx > 0 && nx < WIDTH) {
      if (MAP_TEMP[y][nx] === 2) {       
        removed_blocks.push({ "x": nx, "y": y });
        MAP_TEMP[y][nx] = 0;
        break;
      }
      if (MAP_TEMP[y][nx] === 1) {
        break;
      }
    }
  }

  // Przypadek 2. kierunek południowy
  for (let i = 0; i <= radius; ++i) {
    let nx = x + i;
    checkColisionWithPlayer(nx, y, player_killed);
    if (nx > 0 && nx < WIDTH) {
      if (MAP_TEMP[y][nx] === 2) {
        removed_blocks.push({ "x": nx, "y": y });
        MAP_TEMP[y][nx] = 0;
        break;
      }
      if (MAP_TEMP[y][nx] === 1) {
        break;
      }
    }
  }

  // Przypadek 3. kierunek zachodni
  for (let i = 0; i >= -radius; --i) {
    let ny = y + i;
    checkColisionWithPlayer(x, ny, player_killed);
    if (ny > 0 && ny < HEIGHT) {
      if (MAP_TEMP[ny][x] === 2) {
        removed_blocks.push({ "x": x, "y": ny });
        MAP_TEMP[ny][x] = 0;
        break;
      }
      if (MAP_TEMP[ny][x] === 1) {
        break;
      }
    }
  }

  // Przypadek 4. kierunek wschodni
  for (let i = 0; i <= radius; ++i) {
    let ny = y + i;
    checkColisionWithPlayer(x, ny, player_killed);
    if (ny > 0 && ny < HEIGHT) {
      if (MAP_TEMP[ny][x] === 2) {
        removed_blocks.push({ "x": x, "y": ny });
        MAP_TEMP[ny][x] = 0;
        break;
      }
      if (MAP_TEMP[ny][x] === 1) {
        break;
      }
    }
  }

  return [removed_blocks, player_killed];
}


module.exports = app;
