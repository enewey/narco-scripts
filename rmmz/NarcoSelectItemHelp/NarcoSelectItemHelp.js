/*:
 * @target MZ
 * @plugindesc Select Item show a Help window.
 * @author Erich Newey
 *
 * @help NarcoSelectItemHelp.js
 *       Shows a help window when using the Select Item event command.
 */


Scene_Message.prototype.eventItemHelpWindowRect = function() {
    const basisRect = this.eventItemWindowRect();

    const wx = 0;
    const wy = -100; //off screen til it needs to be displayed?
    const wh = this.calcWindowHeight(2, false);
    const ww = Graphics.boxWidth;
    return new Rectangle(wx, wy, ww, wh);
};

Window_EventItem.prototype.setHelpWindow = function(helpWindow) {
    this._helpWindow = helpWindow;
};


(function(alias) {
    Scene_Message.prototype.createEventItemWindow = function() {
        alias.apply(this, arguments);
        const rect = this.eventItemHelpWindowRect();
        this._eventItemHelpWindow = new Window_Help(rect);
        this._eventItemHelpWindow.openness = 0;
        this._eventItemHelpWindow.deactivate();
        this.addWindow(this._eventItemHelpWindow);
        this._eventItemWindow.setHelpWindow(this._eventItemHelpWindow);
    };
})(Scene_Message.prototype.createEventItemWindow);

(function(alias) {
    Window_EventItem.prototype.update = function() {
        alias.apply(this, arguments);
        this._helpWindow?.setItem(this.item());
    };
})(Window_EventItem.prototype.update);

(function(alias) {
    Window_EventItem.prototype.updatePlacement = function() {
        alias.apply(this, arguments);
        this.y === 0 ? 
            this._helpWindow.y = this._height : 
            this._helpWindow.y = this.y - this._helpWindow._height;
    }
})(Window_EventItem.prototype.updatePlacement);

(function(alias) {
    Window_EventItem.prototype.start = function() {
        alias.apply(this, arguments);
        this._helpWindow?.activate();
        this._helpWindow?.open();
    }
})(Window_EventItem.prototype.start);

(function(alias) {
    Window_EventItem.prototype.onCancel = function() {
        alias.apply(this, arguments);
        this._helpWindow?.close();
    }
})(Window_EventItem.prototype.onCancel);

(function(alias) {
    Window_EventItem.prototype.onOk = function() {
        alias.apply(this, arguments);
        this._helpWindow?.close();
    }
})(Window_EventItem.prototype.onOk);

