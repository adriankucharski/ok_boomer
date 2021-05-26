
const k = kaboom({
	global: true,
	fullscreen: true,
	debug: true,
	scale: 7,
	clearColor: [0, 0, 0, 1],
	connect: "ws://localhost:8000/",

});
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

// define a scene
scene("main", () => {

	layers([
		"bg",
		"obj",
		"ui",
	], "obj");

	// add a text
	//add([
	//	text("Boomberman", 10),
	//	pos(10, 5)
	//	pos(10, 5)
	//]);


	const level =
		[
			"===========",
			"= = = = = =",
			"=         =",
			"= = = = = =",
			"=         =",
			"= = = = = =",
			"=         =",
			"= = = = = =",
			"=        p=",
			"= = = = = =",
			"===========",
		];
	console.log(level[1][1]);
	k.recv("ADD_PLAYER", (data) => {
		console.log("Player " + data.name + " joined! :)")
	});


	k.recv("REMOVE_PLAYER", (data) => {
		console.log("Player " + data.name + " left.")
	});


	const map = addLevel(level, {
		width: 11,
		height: 11,
		pos: vec2(0, 0),
		"=": [
			sprite("border"),
			solid(),


		],
		"p": [
			sprite("player"),
			"player",


			//body(),
			//layer("ui"),
			{
				speed: 50,
				range: 5,
				health: 10,
				protection: false,
			}

		],
		"b": [
			sprite("bomb"),
			solid(),
			area(vec2(10), vec2(10)),
		]

	});
	const userText = add([
		text("player1", 2),
		pos(4, 4),
	]);



	const player = get("player")[0];
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
	player.action(() => {
		stats.text = `Health: ${player.health}`;
		player.resolve();
		userText.pos = vec2(player.pos.x, player.pos.y - 2)

	});



});




// start the game
start("main");

