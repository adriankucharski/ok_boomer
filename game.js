
const k = kaboom({
	global: true,
	fullscreen: true,
	debug: true,
	scale: 5,
	clearColor: [0, 0, 0, 1]
});
var socket = null;

/*
var ws = new WebSocket("ws://localhost:3000/");

ws.onopen = function () {

	// Web Socket is connected, send data using send()
	ws.send("Message to send");
	alert("Message is sent...");
};

ws.onmessage = function (evt) {
	var received_msg = evt.data;
	alert("Message is received...");
};

ws.onclose = function () {

	// websocket is closed.
	alert("Connection is closed...");
};

*/
loadSprite("player", "https://kaboomjs.com/pub/examples/img/guy.png")
loadSprite("border", "https://kaboomjs.com/pub/examples/img/steel.png")
loadSprite("bomb", "https://i.imgur.com/4GV5ZUa.png")
loadSprite("fire", "https://i.imgur.com/LhiUi9O.png")

var SERVER_ADDRESS = 'http://localhost:3000';

async function postData(url, data) {
	console.log(data);
	// Default options are marked with *
	const response = await fetch(url, {
		method: 'POST', // *GET, POST, PUT, DELETE, etc.
		mode: 'cors', // no-cors, *cors, same-origin
		cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
		credentials: 'same-origin', // include, *same-origin, omit
		headers: {
			'Content-Type': 'application/json'
			// 'Content-Type': 'application/x-www-form-urlencoded',
		},
		redirect: 'follow', // manual, *follow, error
		referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
		body: JSON.stringify(data)
	});
	return response.json(); // parses JSON response into native JavaScript objects
}




// define a scene
scene("login", () => {
	var username = "";

	const helloSing = add([
		text("Witaj, podaj swoj nick:", 6),
		pos(20, 20),
	]);

	const ErrorMessage = add([
		text("", 4),
		pos(20, 80),
		color(255 / 255, 0, 0)
	]);

	const userText = add([
		text(username, 6),
		color(239 / 255, 170 / 255, 196 / 255),
		pos(20, 30),

		charInput((ch) => {
			username += ch;
			userText.text = username;
		}),

		keyPress("backspace", () => {
			username = username.slice(0, -1);
			userText.text = username;
		}),

		keyPress("enter", () => {
			let response = postData(SERVER_ADDRESS + '/login', { UID: username });
			response.then(function (result) {
				if (result.status == 1) {
					ErrorMessage.text = "This username is already taken";
				}
				else if (result.status == 0) {
					go("menu", username, result.classes);
				}
			})


		})
	]);
});

scene("menu", (username, classes) => {
	const helloUser = add([
		text("Witaj " + username + ". Wybierz klase:", 6),
		pos(5, 5),
	]);

	function socketInit(button) {
		var connectionOptions = {
			"force new connection": true,
			"reconnectionAttempts": "Infinity",
			"timeout": 10000,
			"transports": ["websocket"]
		};
	
		socket = io.connect('http://localhost:3000', connectionOptions);
		socket.on('connect', () => {
			console.log("Connected as " + username + " (CLASS_ID: " + button.class.class_id + ")")
			socket.emit('login', { UID: username, class_id: button.class.class_id });
			socket.on('loggedIn', (resp) => {

				go("main", resp, username)
			});
		});
	}

	//degine button lifecycle
	function button() {

		return {
			update() {
				if (this.isHovered()) {
					this.color = rgb(210 / 255, 140 / 255, 170 / 255);
				} else {
					this.color = rgb(239 / 255, 170 / 255, 196 / 255);
				}
				
			},
			add() {
				//add onClick handle
				this.clicks(() => {
					socketInit(this)
				});
				//add class name
				k.add([
					text(this.class.class_name, 4),
					pos(this.pos.x + 3, this.pos.y + 2)
				]);
				//add class description
				k.add([
					text('Description: ' + this.class.description, 4),
					pos(this.pos.x + 3, this.pos.y + 7),
				]);
			}
		}
	}

	//foreach in classes, create button
	for(let i = 0; i < classes.length; i++){
		add([
			rect(200, 13),
			pos(25, 20 + (18 * i) ),
			color(239 / 255, 170 / 255, 196 / 255),
			"button",
			button(),
			{
				class: classes[i]
			},
	
		]);
	}
	
});

scene("main", (resp, username) => {
	console.log(resp)
	layers([
		"bg",
		"obj",
		"ui",
	], "obj");
	const level = resp.map.map(e => e.join(''))


	const map = addLevel(level, {
		width: 11,
		height: 11,
		pos: vec2(0, 0),
		"1": [
			sprite("border"),
			solid(),


		],

		"b": [
			sprite("bomb"),
			solid(),
			area(vec2(10), vec2(10)),
		]

	});

	const player = add([
		pos(resp.player_xy[0] * 11, resp.player_xy[1] * 11),
		sprite("player"),
		"player",

		{
			speed: 50,
			range: 5,
			health: 10,
			protection: false,
			username: username,
			playerText: add([
				text(username, 2),
			]),
			update(){
				stats.text = `Health: ${this.health}`;
				this.playerText.pos = vec2(this.pos.x - (this.playerText.width/2) + 5, this.pos.y-2)
				this.resolve();
			}
		},

	]);



	keyDown("left", () => {
		player.move(-player.speed, 0);
	});

	keyDown("right", () => {
		player.move(player.speed, 0);
	});

	keyDown("up", () => {
		player.move(0, -player.speed);
	});

	keyDown("down", () => {
		player.move(0, player.speed);
	});
	keyPress("space", () => {
		const newx = Math.round((player.pos.x) / 11) * 11;
		const newy = Math.round((player.pos.y) / 11) * 11;
		const bomb = add([
			sprite("bomb"),
			layer("bg"),

			pos(newx, newy),
			console.log(player.pos),


		]);

		wait(3, () => {
			destroy(bomb);
			//to right

			for (i = 1; i <= player.range; i++) {
				//if border
				if (level[newy / 11][(newx + i * 11) / 11] === '=') {
					break;
				}
				const p = add([
					sprite("fire"),
					"fire",

					pos(newx + i * 11, newy)
					//pos( player.gridPos.add(1,0))

				]);
				wait(1, () => {
					destroy(p);

				});

			}
			//to left
			for (i = 0; i <= player.range; i++) {
				//if border
				if (level[newy / 11][(newx - i * 11) / 11] === '=') {
					break;
				}
				const p = add([
					sprite("fire"),
					"fire",

					pos(newx - i * 11, newy)
					//pos( player.gridPos.add(1,0))

				]);
				wait(1, () => {
					destroy(p);

				});

			}
			//to top
			for (i = 0; i <= player.range; i++) {
				//if border
				if (level[(newy - i * 11) / 11][newx / 11] === '=') {
					break;
				}
				const p = add([
					sprite("fire"),
					"fire",

					pos(newx, newy - i * 11)
					//pos( player.gridPos.add(1,0))

				]);
				wait(1, () => {
					destroy(p); 

				});

			}
			//to down
			for (i = 0; i <= player.range; i++) {
				//if border
				if (level[(newy + i * 11) / 11][newx / 11] === '=') {
					break;
				}
				const p = add([
					sprite("fire"),
					"fire",

					pos(newx, newy + i * 11)
					//pos( player.gridPos.add(1,0))

				]);
				wait(1, () => {
					destroy(p);

				});

			}

		});

	});
	player.collides("fire", (a) => {
		if (!player.protection) {
			player.protection = true;
			player.health--;
			camShake(12);
			if (player.health < 1) {
				destroy(player);
				destroy(userText);
			}

			wait(1, () => {
				player.protection = false;
			});

		}

	});
	const stats = add([
		text(`Health: ${player.health}`, 3),
		pos(150, 4),
	]);

});




// start the game
start("login");

