/*:
 * @target MZ
 * @plugindesc Plugin that enables button to allow player to strafe (fix direction while walking)
 * @author Erich Newey
 *
 * @help This plugin does not provide plugin commands.
 *  Possible values for the "Strafe Button" parameter: 
 * 
 *      tab, ok, shift, control, escape, pageup, pagedown, 
 *      left, up, right, down, debug
 * 
 *  See `rmmz_core.js`, lines 5627-5670 to see how the keynames map to real keys
 * 
 * To disable strafe for a map, enter this in the Notes field for the map:
 * 
 *      <DisableStrafe>
 * 
 * You can also designate a switch that enables strafing when ON, and disables strafing when OFF.
 * See the "Strafe Switch" param for details.
 *
 * @param Strafe Button
 * @desc Button name to set for strafing.
 * @default pagedown
 *
 * @param Strafe Switch
 * @desc Switch ID for enabling/disabling strafing.
 *  0 to always enable strafing.
 * @default 0
 */

var Narcodis = Narcodis || {};
Narcodis.Strafe = {};
Narcodis.Strafe.Parameters = PluginManager.parameters('NarcoStrafe')
Narcodis.Strafe.ButtonConfig = String(Narcodis.Strafe.Parameters["Strafe Button"]);
Narcodis.Strafe.SwitchID = Number(Narcodis.Strafe.Parameters["Strafe Switch"]);

Narcodis.Strafe.DISABLED_LABEL = 'DisableStrafe';

(function() {

    var _Narco__Game_Player_update = Game_Player.prototype.update
    Game_Player.prototype.update = function(sceneActive) {
        this.updateStrafing();
        _Narco__Game_Player_update.call(this, sceneActive);
    };

    Game_Player.prototype.updateStrafing = function() {
        if (this.isMoving()) {
            return;
        }
        this.setDirectionFix(this.isStrafeAllowed() && this.isStrafeButtonPressed());
    };

    Game_Player.prototype.isStrafeButtonPressed = function() {
        return Input.isPressed(Narcodis.Strafe.ButtonConfig);
    };

    Game_Player.prototype.isStrafeAllowed = function() {
        var switchEnabled = Narcodis.Strafe.SwitchID > 0 ? $gameSwitches.value(Narcodis.Strafe.SwitchID) : true
        var mapStrafeDisabled = !!$dataMap.meta[Narcodis.Strafe.DISABLED_LABEL]

        return switchEnabled && !mapStrafeDisabled && this.canMove() && !this.isInVehicle()
    };
})();