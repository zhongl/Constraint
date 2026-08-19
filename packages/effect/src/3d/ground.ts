import * as THREE from 'three';
import type { ConstraintSettings } from '../core/settings';

export class ConstraintGround {
    mesh!: THREE.Mesh;

    private readonly _settings: ConstraintSettings;
    private readonly _groundDark = new THREE.Color();
    private readonly _groundLight = new THREE.Color();
    private _material!: THREE.MeshPhongMaterial;

    constructor(settings: ConstraintSettings) {
        this._settings = settings;
    }

    init(): void {
        const geometry = new THREE.PlaneGeometry(4000, 4000, 10, 10);
        this._material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(),
            transparent: true,
            shininess: 5
        });

        this.mesh = new THREE.Mesh(geometry, this._material);
        this.mesh.position.y = -200;
        this.mesh.rotation.x = -1.57;
        this.mesh.castShadow = false;
        this.mesh.receiveShadow = true;
    }

    dispose(): void {
        this.mesh.geometry.dispose();
        this._material.dispose();
    }

    update(): void {
        this._groundDark.set(this._settings.groundDark);
        this._groundLight.set(this._settings.groundLight);

        this.mesh.visible = true;
        this._material.color.copy(this._groundDark).lerp(this._groundLight, this._settings.lightRatio);
    }
}
