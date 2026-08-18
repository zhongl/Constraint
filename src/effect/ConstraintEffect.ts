import * as THREE from 'three';
import { Fbo } from '../3d/fbo';
import * as ground from '../3d/ground';
import * as lights from '../3d/lights';
import { ConstraintLines } from '../3d/lines';
import * as nodes from '../3d/nodes';
import { createSettings } from '../core/settings';

var BLACK = new THREE.Color(0x222222);
var WHITE = new THREE.Color(0xeeeeee);

export class ConstraintEffect {
    private readonly _renderer: THREE.WebGLRenderer;
    private readonly _scene: THREE.Scene;
    private readonly _fog = new THREE.FogExp2(0x222222, 0.001);
    private readonly _settings = createSettings();
    private readonly _fbo = new Fbo(this._settings);
    private _lines!: ConstraintLines;
    private readonly _skybox: THREE.Mesh;

    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
        this._renderer = renderer;
        this._scene = scene;
        this._skybox = new THREE.Mesh(new THREE.IcosahedronGeometry(128, 2));
    }

    get constraintRatio() {
        return this._settings.constraintRatio;
    }

    set constraintRatio(value: number) {
        this._settings.constraintRatio = value;
    }

    get followPointer() {
        return this._settings.followMouse;
    }

    set followPointer(value: boolean) {
        this._settings.followMouse = value;
    }

    get useWhiteNodes() {
        return this._settings.useWhiteNodes;
    }

    set useWhiteNodes(value: boolean) {
        this._settings.useWhiteNodes = value;
    }

    get isWhite() {
        return this._settings.isWhite;
    }

    set isWhite(value: boolean) {
        this._settings.isWhite = value;
    }

    init() {
        this._settings.mouse3d = new THREE.Vector3();
        this._settings.ignoredMaterial = new THREE.Material();

        var settings = this._settings;
        var fn = this._renderer.renderBufferDirect;
        this._renderer.renderBufferDirect = function(camera, scene, geometry, material, object, group) {
            if (material !== settings.ignoredMaterial) {
                fn.call(this, camera, scene, geometry, material, object, group);
            }
        };

        this._scene.fog = this._fog;

        if (!this._fbo.init(this._renderer)) return false;

        lights.init();
        this._scene.add(lights.mesh);

        this._lines = new ConstraintLines(this._settings, this._fbo);
        this._lines.init();
        this._scene.add(this._lines.mesh);

        nodes.init(this._settings, this._fbo);
        this._scene.add(nodes.mesh);

        ground.init(this._renderer, this._settings);
        this._scene.add(ground.mesh);

        this._skybox.material = this._settings.ignoredMaterial;
        this._skybox.renderOrder = -1024;
        this._skybox.frustumCulled = false;
        this._scene.add(this._skybox);

        return true;
    }

    setPointer(position: THREE.Vector3) {
        this._settings.mouse3d.copy(position);
    }

    update(dt: number, camera: THREE.PerspectiveCamera) {
        this._settings.whiteRatio += ((this._settings.isWhite ? 1 : 0) - this._settings.whiteRatio) * 0.2;
        this._settings.whiteNodesRatio += ((this._settings.useWhiteNodes ? 1 : 0) - this._settings.whiteNodesRatio) * 0.1;

        this._fog.color.copy(BLACK).lerp(WHITE, this._settings.whiteRatio);
        this._renderer.setClearColor(this._fog.color.getHex());
        this._skybox.position.copy(camera.position);

        lights.update(dt, camera);
        this._fbo.update(dt);
        this._lines.update();
        nodes.update(dt);
        ground.update();
    }
}
