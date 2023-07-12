/*:
 * @plugindesc Plugin that enables backlog of in-game messages, with name display.
 * @author Erich Newey
 *
 * @help
 *
 * Plugin Command:
 *   NarcoBacklog open          # Open the backlog screen.
 *   NarcoBacklog on            # Record incoming messages to the backlog 
 *                                (On is the default state).
 *   NarcoBacklog off           # Stop recording incoming messages to the backlog.
 *   NarcoBacklog setName Bob   # Overrides the name recorded to be `Bob` until 
 *                                next portrait is drawn or cleared.
 *   NarcoBacklog clearName     # Clear the currently set name, recording the next 
 *                                messages as 'System'.
 *   NarcoBacklog clear         # Erase all messages in the message backlog.
 * 
 * @param Portrait File Suffixes
 * @desc Suffixes of filenames use for portraits. 
 *  For example, with file names "Doug_Portrait" and "Doug_OldPortrait" and suffixes "_Portrait,_OldPortrait", 
 *  the character's name would be recognized as "Doug".
 * @default Textbox,FutureTextbox
 * 
 * @param Reverse Chronologically
 * @desc Determines order that backlog is displayed.
 *  1 will display backlog in reverse chronological order (most recent message first)
 *  0 will display backlog in chronological order (oldest message first)
 * @default 1
 * 
 * @param System Message Label
 * @desc Customize how "system" (i.e. messages with no associated name) appear.
 * @default System
 * 
 * @param Name Colors
 * @desc Comma-separated list of names to color codes.
 * Example: 
 *    Alice:1,Bob:3,System:8
 * Here, Alice's name will display in the backlog with the color `1`, i.e. as \c[1]Alice\c[0]:
 * Bob will be color 3
 * System will be color 8
 * @default System:8
 * 
 * @param Default Name Color
 * @desc Color code for names that do not appear in the "Name Colors" param.
 * @default 6
*/

var Narcodis = Narcodis || {};
Narcodis.BACKLOG = {};
Narcodis.BACKLOG.Parameters = PluginManager.parameters('NarcoBacklog');
Narcodis.BACKLOG.Reversed = Boolean(Number(Narcodis.BACKLOG.Parameters["Reverse Chronologically"]));
Narcodis.BACKLOG.SystemLabel = String(Narcodis.BACKLOG.Parameters["System Message Label"]);
Narcodis.BACKLOG.DefaultColorCode = Number(Narcodis.BACKLOG.Parameters["Default Name Color"]);

Narcodis.BACKLOG.ColorCodes = {}
try {
    Narcodis.BACKLOG.__name_split = String(Narcodis.BACKLOG.Parameters["Name Colors"]).split(',');
    for (var n of Narcodis.BACKLOG.__name_split) {
        let s = n.split(':');
        if (s.length != 2) {
            throw "encountered bad name color code: " + s;
        }
        Narcodis.BACKLOG.ColorCodes[s[0]] = s[1];
    }
} catch (e) {
    console.error("Error parsing Name Colors parameter", { error: e });
}

Narcodis.BACKLOG.PortraitSuffixes = []
try {
    Narcodis.BACKLOG.PortraitSuffixes = 
        String(Narcodis.BACKLOG.Parameters["Portrait File Suffixes"])
        .split(',')
        .map(s => s.trim())
        .sort((a,b) => b.length-a.length);
} catch (e) {
    console.error("Error parsing Portrait Suffixes parameter", { error: e });
}

Narcodis.BACKLOG.ParseNameFromSuffixes = function(name) {
    for (let i=0; i<Narcodis.BACKLOG.PortraitSuffixes.length; i++) {
        let suffix = Narcodis.BACKLOG.PortraitSuffixes[i];
        if (name.endsWith(suffix)) {
            return name.substring(0, name.length - suffix.length);
        }
    }
    return null;
};


Narcodis.BACKLOG.$gameBacklog = null;

(function() {
     // Functional hooks
     (function(alias) {
        Game_Message.prototype.add = function(text) {
            Narcodis.BACKLOG.$gameBacklog.push_message(text);
            alias.apply(this, arguments);
        };
    })(Game_Message.prototype.add);
    
    (function(alias) {
        Game_Screen.prototype.showPicture = function(pictureId, name, _origin, _x, _y, _scaleX, _scaleY, _opacity, _blendMode) {
            let n = Narcodis.BACKLOG.ParseNameFromSuffixes(name)
            if (n) { 
                Narcodis.BACKLOG.$gameBacklog.set_current(pictureId, n); 
            }
            alias.apply(this, arguments);
        };
    })(Game_Screen.prototype.showPicture);
    
    (function(alias) {
        Game_Screen.prototype.erasePicture = function(pictureId) {
            if (Narcodis.BACKLOG.$gameBacklog._current.id === pictureId) {
                Narcodis.BACKLOG.$gameBacklog.reset_current();
            }
            alias.apply(this, arguments);
        };
    })(Game_Screen.prototype.erasePicture);


    // plugin commands
    (function(alias) {
        Game_Interpreter.prototype.pluginCommand = function(command, args) {
            alias.call(this, command, args);
            if (command === 'NarcoBacklog') {
                switch (args[0]) {
                case 'open':
                    SceneManager.push(Scene_Narco_Backlog);
                    break;
                case 'on':
                    Narcodis.BACKLOG.$gameBacklog.set_active(true);
                    break;
                case 'off':
                    Narcodis.BACKLOG.$gameBacklog.set_active(false);
                    break;
                case 'setName':
                    Narcodis.BACKLOG.$gameBacklog.set_name(String(args[1]));
                    break;
                case 'clearName':
                    Narcodis.BACKLOG.$gameBacklog.reset_current();
                    break;
                case 'clear':
                    Narcodis.BACKLOG.$gameBacklog.clear();
                    break;
                }
            }
        };
    })(Game_Interpreter.prototype.pluginCommand);
    
    // static data aliases
    (function(alias) {
        DataManager.createGameObjects = function() {
            alias.apply(this, arguments);
            Narcodis.BACKLOG.$gameBacklog = new Game_Narco_Backlog();
        };
    })(DataManager.createGameObjects);

    (function(alias) {
        DataManager.makeSaveContents = function() {
            var contents = alias.apply(this, arguments);
            contents.narcoBacklog = Narcodis.BACKLOG.$gameBacklog;
            return contents;
        }
    })(DataManager.makeSaveContents);

    (function(alias) {
        DataManager.extractSaveContents = function(contents) {
            alias.apply(this, arguments);
            Narcodis.BACKLOG.$gameBacklog = contents.narcoBacklog
        }
    })(DataManager.extractSaveContents);
})();


// OBJECTS

// Backlog object

function Game_Narco_Backlog() {
    this.initialize.apply(this, arguments);
}

Game_Narco_Backlog.prototype.initialize = function() {
    this._active = true;
    this.clear();
};

Game_Narco_Backlog.prototype.clear = function() {
    this._data = [];
    this.reset_current();
};

Game_Narco_Backlog.prototype.data = function() { return this._data; };

Game_Narco_Backlog.prototype.reset_current = function() {
    this._current = {id: 0, name: 'System'};
};

Game_Narco_Backlog.prototype.set_current = function(id, name) {
    this._current = { id, name };
};

Game_Narco_Backlog.prototype.push_message = function(message) {
    if (this._active) {
        this._data.push({name: this._current.name, message: message});
    }
};

Game_Narco_Backlog.prototype.set_active = function(b) {
    this._active = !!b;
};

Game_Narco_Backlog.prototype.set_name = function(name) {
    this._current = {id: 0, name: name};
};

// Scene

function Scene_Narco_Backlog() {
    this.initialize.apply(this, arguments);
}

Scene_Narco_Backlog.prototype = Object.create(Scene_MenuBase.prototype);
Scene_Narco_Backlog.prototype.constructor = Scene_Narco_Backlog;

Scene_Narco_Backlog.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_Narco_Backlog.prototype.create = function () {
    Scene_MenuBase.prototype.create.call(this);

    let messages = [];

    if (Narcodis.BACKLOG.$gameBacklog.data().length > 0) {
        let curr = [];
        let name = Narcodis.BACKLOG.$gameBacklog.data()[0].name;
        for (var msg of Narcodis.BACKLOG.$gameBacklog.data()) {
            if (msg.name !== name) {
                messages.push({ name: name, texts: [ ...curr ] })
                name = msg.name
                curr = [];
            }
            curr.push(msg.message);
        }

        // get the last one
        messages.push({ name: name, texts: [ ...curr ] })

        if (Narcodis.BACKLOG.Reversed) {
            messages.reverse();
        }
    }

    this._dataWindow = new Window_Narco_Backlog(0, 0, Graphics.boxWidth, Graphics.height, messages);
    this.addWindow(this._dataWindow);
};

Scene_Narco_Backlog.prototype.start = function() {
    Scene_MenuBase.prototype.start.call(this);
    this._dataWindow.drawAllItems();
};

Scene_Narco_Backlog.prototype.update = function () {
    Scene_MenuBase.prototype.update.call(this);
    if (Input.isTriggered("cancel")) this.popScene();
    if (Input.isTriggered("ok")) this.popScene();
    if (Input.isTriggered("up") || Input.isLongPressed("up")) { 
        this._dataWindow.addScroll(-24);
        this._dataWindow.drawAllItems();
    }
    if (Input.isTriggered("down") || Input.isLongPressed("down")) { 
        this._dataWindow.addScroll(24);
        this._dataWindow.drawAllItems();
    }
    if (Input.isTriggered("pageup") || Input.isLongPressed("pageup")) {
        this._dataWindow.addScroll(-(Graphics.height));
        this._dataWindow.drawAllItems();
    }
    if (Input.isTriggered("pagedown") || Input.isLongPressed("pagedown")) {
        this._dataWindow.addScroll(Graphics.height);
        this._dataWindow.drawAllItems();
    }
}

// Window

function Window_Narco_Backlog() {
    this.initialize.apply(this, arguments);
}

Window_Narco_Backlog.prototype = Object.create(Window_Base.prototype);
Window_Narco_Backlog.prototype.constructor = Window_Narco_Backlog;

Window_Narco_Backlog.prototype.initialize = function(_x,_y,_width,_height, messages) {
    Window_Base.prototype.initialize.apply(this, arguments);
    this._scroll = 0;
    this._messages = messages;
    this._messageGap = Math.trunc(this.lineHeight() / 2);

    // total lines = each texts.length + 1 each name
    let numLines = messages.reduce((acc, next) => acc += next.texts.length + 1, 0);
    this._maxScroll = 
        ((numLines + 1) * this.lineHeight()) + 
        (this._messages.length * this._messageGap) -
        (this._height);
};

Window_Narco_Backlog.prototype.addScroll = function(n) {
    this._scroll += n
    this._scroll = Math.max(0, this._scroll);
    this._scroll = Math.min(this._maxScroll, this._scroll);
}

Window_Narco_Backlog.prototype.drawAllItems = function () {
    this.contents.clear();

    let y = -this._messageGap - this._scroll;
    let name = "";
    if (this._messages.length === 0) {
        this.drawText("No messages to display.", 0, (this.height / 2) - this.lineHeight(), this.width - this.padding * 2, "center");
        return;
    }

    for (var msg of this._messages) {
        if (msg.name !== name) {
            name = msg.name
            y += this._messageGap;
            let color = (name in Narcodis.BACKLOG.ColorCodes) ? Narcodis.BACKLOG.ColorCodes[name] : Narcodis.BACKLOG.DefaultColorCode;
            this.drawTextEx(`\\c[${color}]${msg.name}\\c[0]:`, 0, y);
            y += this.lineHeight();
        } 
        let joined = msg.texts.join("\n");
        this.drawTextEx(joined, 24, y);
        y += this.lineHeight() * msg.texts.length;     
    }
};