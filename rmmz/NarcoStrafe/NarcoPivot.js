/*:
 * @target MZ
 * @plugindesc Plugin that enables button to allow player to pivot (turn without moving)
 * @author Erich Newey
 *
 * @help This plugin does not provide plugin commands.
 *  Possible values for the "Pivot Button" parameter: 
 * 
 *      tab, ok, shift, control, escape, pageup, pagedown, 
 *      left, up, right, down, debug
 * 
 *  See `rmmz_core.js`, lines 5627-5670 to see how the keynames map to real keys
 * 
 * To disable pivot for a map, enter this in the Notes field for the map:
 * 
 *      <DisablePivot>
 * 
 * You can also designate a switch that enables pivoting when ON, and disables pivoting when OFF.
 * See the "Pivot Switch" param for details.
 *
 * @param Pivot Button
 * @desc Button name to set for pivoting.
 * @default pageup
 *
 * @param Pivot Switch
 * @desc Switch ID for enabling/disabling pivoting.
 *  0 to always enable pivoting.
 * @default 0
 */

var Narcodis = Narcodis || {};
Narcodis.Pivot = {};
Narcodis.Pivot.Parameters = PluginManager.parameters('NarcoPivot')
Narcodis.Pivot.ButtonConfig = String(Narcodis.Pivot.Parameters["Pivot Button"]);
Narcodis.Pivot.SwitchID = Number(Narcodis.Pivot.Parameters["Pivot Switch"]);

Narcodis.Pivot.DISABLED_LABEL = 'DisablePivot';

(function() {
    var _Narco__Game_Player_moveByInput = Game_Player.prototype.moveByInput
    Game_Player.prototype.moveByInput = function() {
        if (this.isPivotButtonPressed() && this.isPivotAllowed()) {
            if (!this.isMoving() && this.canMove()) {
                var direction = this.getInputDirection();
                if (direction > 0) {
                    $gameTemp.clearDestination();
                } else if ($gameTemp.isDestinationValid()){
                    var x = $gameTemp.destinationX();
                    var y = $gameTemp.destinationY();
                    direction = this.findDirectionTo(x, y);
                }
                if (direction > 0) {
                    this.setDirection(direction);
                }
            }
        } else {
            _Narco__Game_Player_moveByInput.call(this, arguments)
        }
    };

    Game_Player.prototype.isPivotButtonPressed = function() {
        return Input.isPressed(Narcodis.Pivot.ButtonConfig);
    };

    Game_Player.prototype.isPivotAllowed = function() {
        var switchEnabled = Narcodis.Pivot.SwitchID > 0 ? $gameSwitches.value(Narcodis.Pivot.SwitchID) : true
        var mapPivotDisabled = !!$dataMap.meta[Narcodis.Pivot.DISABLED_LABEL]

        return switchEnabled && !mapPivotDisabled && this.canMove()
    };
})();