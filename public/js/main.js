$(function() {
    let FADE_TIME = 200; // ms
    let TYPING_TIMER_LENGTH = 500; // ms
    let COLORS = [
        '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
        '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ];

    // Initialize variables
    let $window = $(window);
    let $usernameInput = $('.usernameInput'); // Input for username
    let $messages = $('.messages'); // Messages area
    let $inputMessage = $('.inputMessage'); // Input message input box
    let $claimButton = $('.claimBtn');
    let claiming = false;
    let $pwInput = $('#passwordInput');
    let $pw1 = $('#newPw1');
    let $pw2 = $('#newPw2');
    let $claimLink = $('#claimLink');

    // Color picker
    let colorInput = $('.color-input');
    let elem = colorInput[0];
    let hueb = new Huebee( elem, {
        "className": "dark-picker",
        "saturations": 2,
        "hues": 6,
        "notation": "hex",
        "hue0": 150
    });

    let basebg;
    let basetext;

    let $loginPage = $('.login.page'); // The login page
    let $chatPage = $('.chat.page'); // The chatroom page


    // Prompt for setting a username
    let username;
    let connected = false;
    let typing = false;
    let lastTypingTime;
    let $currentInput = $usernameInput.focus();

    let socket = io();

    $usernameInput.on('input',function () {
        if($usernameInput.val().trim() !== "") {
            $claimButton.fadeIn();
        } else {
            $claimButton.fadeOut();
        }
    });

    $claimButton.click(function () {
        let claimedNick = cleanInput($usernameInput.val().trim());
        claiming = true;
        socket.emit('nameCheck', claimedNick, claiming);
    });

    $pwInput.keypress(function (e) {
        if(e.which == 13) {
            socket.emit('pwCheck', username, cleanInput($pwInput.val().trim()));
        }
    });

    $claimLink.click(function () {
        let pw1 = $('#newPw1').val();
        let pw2 = $('#newPw2').val();

        if(pw1 !== pw2) {
            $('.claimError').html('wrong password');
        } else {
            username = cleanInput($usernameInput.val().trim());
            socket.emit('newClaim', username, pw1);
            $.modal.close();
            setUsername(username);
        }
    });

    colorInput.mouseover(function() {
        basebg = colorInput.css('background-color');
        basetext = colorInput.css('color');
        colorInput.css('background-color', '#24292e');
        if (hueb.isLight) {
            colorInput.css('color', '#b2ada5');
        }
    });

    colorInput.mouseout(function() {
        colorInput.css('background-color', basebg);
        colorInput.css('color', basetext);
    });

    const addParticipantsMessage = (data) => {
        let message = '';
        if (data.numUsers === 1) {
            message += "there's 1 participant";
        } else {
            message += "there are " + data.numUsers + " participants";
        }
        log(message);
    };

    // Sets the client's username
    const setUsername = (username) => {
        $loginPage.fadeOut();
        $chatPage.show();
        $loginPage.off('click');
        $currentInput = $inputMessage.focus();

        // Tell the server your username
        socket.emit('newUser', username);
    };

    // Sends a chat message
    const sendMessage = () => {
        let message = $inputMessage.val();
        // Prevent markup from being injected into the message
        message = cleanInput(message);
        // if there is a non-empty message and a socket connection
        if (message && connected) {
            $inputMessage.val('');
            addChatMessage({
                username: username,
                message: message
            });
            // tell server to execute 'newMsg' and send along one parameter
            socket.emit('newMsg', message);
        }
    };

    // Log a message
    const log = (message, options) => {
        let $el = $('<li>').addClass('log').text(message);
        addMessageElement($el, options);
    };

    // Adds the visual chat message to the message list
    const addChatMessage = (data, options) => {
        // Don't fade the message in if there is an 'X was typing'
        let $typingMessages = getTypingMessages(data);
        options = options || {};
        if ($typingMessages.length !== 0) {
            options.fade = false;
            $typingMessages.remove();
        }

        let now = new Date();
        let h =  now.getHours(), m = now.getMinutes();
        let $messageDate = (h > 12) ? (h-12 + ':' + m +'pm ') : (h + ':' + m +'am ');

        let $usernameDiv = $('<span class="username"/>')
            .text(data.username)
            .css('color', getUsernameColor(data.username));
        let $messageBodyDiv = $('<span class="messageBody">')
            .text(data.message);

        let typingClass = data.typing ? 'typing' : '';
        let $messageDiv = $('<li class="message"/>')
            .data('username', data.username)
            .addClass(typingClass)
            .append($messageDate, $usernameDiv, $messageBodyDiv);

        addMessageElement($messageDiv, options);
    };

    // Adds the visual chat typing message
    const addChatTyping = (data) => {
        data.typing = true;
        data.message = 'is typing';
        addChatMessage(data);
    };

    // Removes the visual chat typing message
    const removeChatTyping = (data) => {
        getTypingMessages(data).fadeOut(function () {
            $(this).remove();
        });
    };

    // Adds a message element to the messages and scrolls to the bottom
    // el - The element to add as a message
    // options.fade - If the element should fade-in (default = true)
    // options.prepend - If the element should prepend
    //   all other messages (default = false)
    const addMessageElement = (el, options) => {
        let $el = $(el);

        // Setup default options
        if (!options) {
            options = {};
        }
        if (typeof options.fade === 'undefined') {
            options.fade = true;
        }
        if (typeof options.prepend === 'undefined') {
            options.prepend = false;
        }

        // Apply options
        if (options.fade) {
            $el.hide().fadeIn(FADE_TIME);
        }
        if (options.prepend) {
            $messages.prepend($el);
        } else {
            $messages.append($el);
        }
        $messages[0].scrollTop = $messages[0].scrollHeight;
    };

    // Prevents input from having injected markup
    const cleanInput = (input) => {
        return $('<div/>').text(input).html();
    };

    const inputPw = () => {

    };

    // Updates the typing event
    const updateTyping = () => {
        if (connected) {
            if (!typing) {
                typing = true;
                socket.emit('typing');
            }
            lastTypingTime = (new Date()).getTime();

            setTimeout(() => {
                let typingTimer = (new Date()).getTime();
                let timeDiff = typingTimer - lastTypingTime;
                if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                    socket.emit('stopTyping');
                    typing = false;
                }
            }, TYPING_TIMER_LENGTH);
        }
    };

    // Gets the 'X is typing' messages of a user
    const getTypingMessages = (data) => {
        return $('.typing.message').filter(function (i) {
            return $(this).data('username') === data.username;
        });
    };

    // Gets the color of a username through our hash function
    const getUsernameColor = (username) => {

        let $chosenColor = $('.color-input').val();
        if($chosenColor != 'random') return $chosenColor;
        // No color specified -> choose a random one
        let hash = 7;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + (hash << 5) - hash;
        }
        // Calculate color
        let index = Math.abs(hash % COLORS.length);
        return COLORS[index];
    };

    // Keyboard events

    $window.keydown(event => {
        // Auto-focus the current input when a key is typed
        // When the client hits ENTER on their keyboard
        if (event.which === 13) {
            if (username) {
                sendMessage();
                socket.emit('stopTyping');
                typing = false;
            } else {
                if(!claiming) {
                    username = cleanInput($usernameInput.val().trim());
                    socket.emit('nameCheck', username);
                }
            }
        }
    });

    $inputMessage.on('input', () => {
        updateTyping();
    });

    // Click events

    // Focus input when clicking on the message input's border
    $inputMessage.click(() => {
        $inputMessage.focus();
    });

    // Socket events

    // Whenever the server emits 'login', log the login message
    socket.on('login', (data) => {
        connected = true;
        // Display the welcome message
        let message = "connected to shinrai";
        log(message, {
            prepend: true
        });
        addParticipantsMessage(data);
    });

    // Whenever the server emits 'newMsg', update the chat body
    socket.on('newMsg', (data) => {
        addChatMessage(data);
    });

    // Whenever the server emits 'userJoin', log it in the chat body
    socket.on('userJoin', (data) => {
        log(data.username + ' joined');
        addParticipantsMessage(data);
    });

    // Whenever the server emits 'userDc', log it in the chat body
    socket.on('userDc', (data) => {
        log(data.username + ' left');
        addParticipantsMessage(data);
        removeChatTyping(data);
    });

    // Whenever the server emits 'typing', show the typing message
    socket.on('typing', (data) => {
        addChatTyping(data);
    });

    // Whenever the server emits 'stopTyping', kill the typing message
    socket.on('stopTyping', (data) => {
        removeChatTyping(data);
    });

    socket.on('disconnect', () => {
        log('you have been disconnected');
    });

    socket.on('reconnect', () => {
        log('you have been reconnected');
        if (username) {
            socket.emit('newUser', username);
        }
    });

    socket.on('reconnect_error', () => {
        log('attempt to reconnect has failed');
    });

    socket.on('nameUnclaimed', (username, claiming) => {
        if(claiming) {
            $loginPage.fadeOut();
            $("#claimModal").modal({
                escapeClose: false,
                clickClose: false,
                showClose: false,
                fadeDuration: 100,
                fadeDelay: 0.50
            });
        } else {
            setUsername(username);
        }
    });

    // Modal
    socket.on('nameClaimed', (username, claiming) => {
        if(!claiming) { // someone is claiming a new nickname
            $loginPage.fadeOut();
            $("#pwModal").modal({
                escapeClose: false,
                clickClose: false,
                showClose: false,
                fadeDuration: 100,
                fadeDelay: 0.50
            });
        } else {
            $loginPage.fadeOut();
            $("#alreadyClaimedModal").modal({
                escapeClose: false,
                clickClose: false,
                showClose: false,
                fadeDuration: 100,
                fadeDelay: 0.50
            });
        }
    });

    socket.on('checkResult', (result) => {
        if(result) {
            $.modal.close();
            setUsername(username);
        } else {
            $('.error').html('wrong password');
            $pwInput.val('');
        }
    });
});
