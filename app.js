// Set up Express server
let express = require('express');
let favicon = require('serve-favicon');
let app = express();
let path = require('path');
let server = require('http').createServer(app);
let sio = require('socket.io')(server);
let port = 4242;
let fs = require('fs');
let hasher = require('md5');

let usersCount = 0;

server.listen(port, () => {
    console.log('Server listening at port ' + port);
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', 'favicon.png')));


// events including something to broadcast
sio.on('connection', (socket) => {
    let newcomer = false;
    socket.on('newMsg', (data) => {
        // we tell the client to execute 'newMsg'
        socket.broadcast.emit('newMsg', {
            username: socket.username,
            message: data
        });
    });

    // new user
    socket.on('newUser', (username) => {
        if (newcomer) return;

        socket.username = username;
        ++usersCount;
        newcomer = true;

        socket.emit('login', {
            numUsers: usersCount
        });

        socket.broadcast.emit('userJoin', {
            username: socket.username,
            numUsers: usersCount
        });
    });

    // user started typing
    socket.on('typing', () => {
        socket.broadcast.emit('typing', {
            username: socket.username
        });
    });

    // user stopped typing
    socket.on('stopTyping', () => {
        socket.broadcast.emit('stopTyping', {
            username: socket.username
        });
    });

    // user disconnected
    socket.on('disconnect', () => {
        if (newcomer) {
            --usersCount;
            socket.broadcast.emit('userDc', {
                username: socket.username,
                numUsers: usersCount
            });
        }
    });

    socket.on('nameCheck', (name, claiming) => {
        if (!fs.existsSync('./users/' + name + '.json')) {
            socket.emit('nameUnclaimed', name, claiming);
        } else {
            socket.emit('nameClaimed', name, claiming);
        }
    });

    socket.on('pwCheck', (name, password) => {
        let pw = JSON.parse(fs.readFileSync('./users/' + name + '.json')).pw;
        socket.emit('checkResult', pw === hasher(password));
    });

    socket.on('newClaim', (username, password) => {
        let obj = {
            "pw": hasher(password)
        };
        fs.writeFile('./users/' + username +'.json', JSON.stringify(obj));
    });
});