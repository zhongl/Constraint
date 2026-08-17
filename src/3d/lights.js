import settings from '../core/settings';
import THREE from 'three';

export var mesh;
export var spot;

var _moveTime = 0;

export function init() {

    mesh = new THREE.Object3D();

    var ambient = new THREE.AmbientLight( 0x999999 );
    mesh.add( ambient );

    spot = new THREE.SpotLight( 0xffffff, 1, 0, Math.PI / 2, 1 );
    spot.position.x = 200;
    spot.position.y = 500;
    spot.position.z = 200;
    spot.target.position.set( 0, 0, 0 );

    spot.castShadow = true;

    spot.shadow.camera.near = 100;
    spot.shadow.camera.far = 2500;
    spot.shadow.camera.fov = 90;
    spot.shadow.camera.updateProjectionMatrix();
    // Preserve the r75 shadow camera across the r108 shadow matrix update.
    spot.shadow.updateMatrices = function (light, viewCamera, viewportIndex) {
        this.camera.fov = 90;
        this.camera.aspect = this.mapSize.width / this.mapSize.height;
        this.camera.far = 2500;
        this.camera.updateProjectionMatrix();
        THREE.LightShadow.prototype.updateMatrices.call(this, light, viewCamera, viewportIndex);
    };

    spot.shadow.bias = -0.003;
    spot.shadow.mapSize.set( 1024, 2048 );

    mesh.add( spot );

}

export function update(dt, camera) {
    _moveTime += 0;//dt * settings.lightSpeed;
    var angle = _moveTime * 0.0005 - 0.2;
    // mesh.position.x = Math.cos(angle) * 400;
    // mesh.position.z = Math.sin(angle) * 400;

}
