export default class WorldObject {
    constructor(
        computeController,
        position,
        velocity
    ) {
        this.computeIdx = computeController.addItem(
            position,
            velocity
        );
    }
}