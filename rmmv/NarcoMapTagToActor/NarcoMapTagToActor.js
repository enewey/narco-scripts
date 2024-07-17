/*:
 * @target MZ
 * @plugindesc Allows an actor to inherit a specified notetag from a map.
 * @author Erich Newey
 *
 * @help NarcoMapTagToActor.js
 *       When entering a map, the specified notetag will be set to either TRUE or FALSE to the specified actor.
 * 
 * @param notetagLabel
 * @text Notetag Label
 * @desc The label you wish for the actor to inherit from the map.
 *  For example, when entering a map with the notetag "<light hudson>",
 *  you could put "light hudson" and the actor will inherit that tag.
 * @type string
 * @default light hudson
 * 
 * @param actorId
 * @text Actor ID
 * @desc ID of the actor who should inherit the notetag.
 * @type number
 * @default 1
 */

var Narcodis = Narcodis || {};
Narcodis.MapTagToActor = {};
Narcodis.MapTagToActor.Parameters = PluginManager.parameters('NarcoMapTagToActor')
Narcodis.MapTagToActor.NotetagLabel = String(Narcodis.MapTagToActor.Parameters["notetagLabel"]);
Narcodis.MapTagToActor.ActorID = Number(Narcodis.MapTagToActor.Parameters["actorId"]);

(function() {
    const _n = Narcodis.MapTagToActor;
    (function(alias) {
        Game_Map.prototype.setup = function(mapId) {
            alias.apply(this, arguments);
            $dataActors[_n.ActorID].meta[_n.NotetagLabel] = !!$dataMap.meta[_n.NotetagLabel];
        };
    })(Game_Map.prototype.setup);

})();
