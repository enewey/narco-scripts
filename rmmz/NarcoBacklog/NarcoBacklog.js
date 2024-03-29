/*:
 * @target MZ
 * @plugindesc Plugin that enables backlog of in-game messages, with name display.
 * @author Erich Newey
 *
 * @help NarcoBacklog.js
 * 
 * This plugin adds a Backlog feature.
 * It will record all messages displayed with the Show Message command, and add a 
 *  command to open a backlog window, which displays all text in the backlog that 
 *  can be scrolled through.
 * The backlog will also keep track of who is talking. There are commands to set
 *  and unset the current speaker, and there is a feature that will automatically
 *  parse the speaker's name from a displayed picture.
 * 
 * 
 * Recording can be turned off and on.
 *
 * Plugin Commands:
 *   NarcoBacklog open      
 *   NarcoBacklog on            
 *   NarcoBacklog off
 *   NarcoBacklog setName Bob   
 *   NarcoBacklog clearName    
 *   NarcoBacklog clear         
 * 
 * @command open
 * @text Open Backlog
 * @desc Opens the backlog window.
 *
 * @command on
 * @text Recording On
 * @desc Begin recordng messages (backlog recording is on by default).
 * 
 * @command off
 * @text Recording Off
 * @desc Stop recording messages.
 * 
 * @command setName
 * @text Set Name
 * @desc Overrides the name for the next batch of recorded messages, 
 *       until a portrait is displayed or name is cleared.
 * 
 * @arg name
 * @type string
 * @text Name
 * @desc Name to display in backlog for upcoming messages.
 * 
 * @command clearName
 * @text Clear Name
 * @desc Manually clears the backlog name, reverting to the system label.
 * 
 * @command clear
 * @text Clear Backlog
 * @desc Wipes the entire backlog. This cannot be undone!
 * 
 * ======== 
 * 
 * @param portraitSuffixes
 * @text Portrait File Suffixes
 * @desc Suffixes of filenames use for portraits. 
 *  For example, with file names "Doug_Portrait" and "Doug_OldPortrait" 
 *  and suffixes "_Portrait" and "_OldPortrait", 
 *  the character's name would be recognized as "Doug".
 * @type string[]
 * 
 * @param reverseChronologically
 * @text Reverse Chronologically
 * @desc Determines order that backlog is displayed.
 *  If true, will display most recent messages first.
 * @type boolean
 * @default true
 * 
 * @param systemLabel
 * @text System Message Label
 * @desc Customize how "system" (i.e. messages with no associated name) appear.
 * @type string
 * @default System
 * 
 * @param nameColors
 * @text Name Colors
 * @desc List of names to color codes.
 *  If the name matches the "System Message Label", it will color that.
 * @type struct<nameColor>[]
 * @default []
 * 
 * @param defaultNameColor
 * @text Default Name Color
 * @desc Color code for names that do not appear in the "Name Colors" param.
 * @type number
 * @default 6
 * @parent nameColors
 * 
 * @param nameOverrides
 * @text Name Overrides
 * @desc List of filenames whose display name should be forcibly overridden.
 * @type struct<nameOverride>[]
 * @default []
*/

/*~struct~nameColor:
*
* @param name
* @text Name 
* @desc The displayed name that should be colorized.
* @type string
*
* @param color
* @text Color
* @desc The numeric system color to use.
* @type number
* @default 0
* ......
*/

/*~struct~nameOverride:
*
* @param portraitName
* @text Image Filename
* @desc The image filename whose prefix should be ignored
    Do not include file extension. 
    For example, if the image is "JohnTextbox.png", just put "JohnTextbox"
* @type string
*
* @param displayName
* @text Display Name
* @desc The name to display when the given filename is displayed
* @type string
* ......
*/

var Narcodis = Narcodis || {};
Narcodis.BACKLOG = {};
Narcodis.BACKLOG.Parameters = PluginManager.parameters('NarcoBacklog');
Narcodis.BACKLOG.Reversed = Boolean(Number(Narcodis.BACKLOG.Parameters.reverseChronologically));
Narcodis.BACKLOG.SystemLabel = String(Narcodis.BACKLOG.Parameters.systemLabel);
Narcodis.BACKLOG.DefaultColorCode = Number(Narcodis.BACKLOG.Parameters.defaultNameColor);

Narcodis.BACKLOG.ColorCodes = JSON.parse(Narcodis.BACKLOG.Parameters.nameColors)
    .map(JSON.parse)
    .reduce((acc, next) => {
        acc[next['name']] = Number(next['color']);
        return acc;
    }, {});
Narcodis.BACKLOG.NameOverrides = JSON.parse(Narcodis.BACKLOG.Parameters.nameOverrides)
    .map(JSON.parse)
    .reduce((acc, next) => {
        acc[next['portraitName']] = next['displayName'];
        return acc;
    }, {});
Narcodis.BACKLOG.PortraitSuffixes = JSON.parse(Narcodis.BACKLOG.Parameters.portraitSuffixes)
    .sort((a,b) => b.length - a.length);

Narcodis.BACKLOG.ParseNameFromSuffixes = function(name) {
    console.log("parsing filename", name)
    if (Narcodis.BACKLOG.NameOverrides[name]) {
        return Narcodis.BACKLOG.NameOverrides[name];
    }

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
    const pluginName = "NarcoBacklog";

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
    PluginManager.registerCommand(pluginName, "open", _args => SceneManager.push(Scene_Narco_Backlog));
    PluginManager.registerCommand(pluginName, "on", _args => Narcodis.BACKLOG.$gameBacklog.set_active(true));
    PluginManager.registerCommand(pluginName, "off", _args => Narcodis.BACKLOG.$gameBacklog.set_active(false));
    PluginManager.registerCommand(pluginName, "setName", args => Narcodis.BACKLOG.$gameBacklog.set_name(String(args.name)));
    PluginManager.registerCommand(pluginName, "clearName", _args => Narcodis.BACKLOG.$gameBacklog.reset_current());
    PluginManager.registerCommand(pluginName, "on", _args => Narcodis.BACKLOG.$gameBacklog.clear());
    
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

    this._dataWindow = new Window_Narco_Backlog(new Rectangle(0, 0, Graphics.boxWidth, Graphics.height), messages);
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

Window_Narco_Backlog.prototype.initialize = function(_rect, messages) {
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