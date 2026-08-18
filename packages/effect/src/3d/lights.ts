import * as THREE from 'three';

export class ConstraintLights {
    mesh!: THREE.Object3D;

    init() {
        this.mesh = new THREE.Object3D();

        var ambient = new THREE.AmbientLight(0x999999, Math.PI);
        this.mesh.add(ambient);

        var spot = new THREE.SpotLight(0xffffff, Math.PI, 0, Math.PI / 2, 1);
        spot.position.x = 200;
        spot.position.y = 500;
        spot.position.z = 200;
        spot.target.position.set(0, 0, 0);

        spot.decay = 0;
        spot.castShadow = true;

        spot.shadow.camera.near = 100;
        spot.shadow.camera.far = 2500;
        spot.shadow.camera.fov = 90;
        spot.shadow.camera.updateProjectionMatrix();
        // Preserve the r75 shadow camera across the r108 shadow matrix update.
        var updateShadowMatrices = spot.shadow.updateMatrices;
        spot.shadow.updateMatrices = function (light: THREE.Light) {
            var angle = spot.angle;
            var distance = spot.distance;
            spot.angle = Math.PI / 4;
            spot.distance = 2500;
            updateShadowMatrices.call(this, light);
            spot.angle = angle;
            spot.distance = distance;
        };

        spot.shadow.bias = 0;
        spot.shadow.mapSize.set(1024, 2048);

        this.mesh.add(spot);
    }

    dispose() {}

    update() {}
}
