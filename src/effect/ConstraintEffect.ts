import * as THREE from 'three';
import * as fbo from '../3d/fbo';
import * as ground from '../3d/ground';
import * as lights from '../3d/lights';
import * as lines from '../3d/lines';
import * as nodes from '../3d/nodes';
import settings from '../core/settings';

var BLACK = new THREE.Color(0x222222);
var WHITE = new THREE.Color(0xeeeeee);

export class ConstraintEffect {
    private readonly _renderer: THREE.WebGLRenderer;
    private readonly _scene: THREE.Scene;
    private readonly _fog = new THREE.FogExp2(0x222222, 0.001);
    private readonly _skybox: THREE.Mesh;

    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
        this._renderer = renderer;
        this._scene = scene;
        this._skybox = new THREE.Mesh(new THREE.IcosahedronGeometry(128, 2));
    }

    get constraintRatio() {
        return settings.constraintRatio;
    }

    set constraintRatio(value: number) {
        settings.constraintRatio = value;
    }

    get followPointer() {
        return settings.followMouse;
    }

    set followPointer(value: boolean) {
        settings.followMouse = value;
    }

    get useWhiteNodes() {
        return settings.useWhiteNodes;
    }

    set useWhiteNodes(value: boolean) {
        settings.useWhiteNodes = value;
    }

    get isWhite() {
        return settings.isWhite;
    }

    set isWhite(value: boolean) {
        settings.isWhite = value;
    }

    init() {
        settings.mouse3d = new THREE.Vector3();
        settings.ignoredMaterial = new THREE.Material();

        var fn = this._renderer.renderBufferDirect;
        this._renderer.renderBufferDirect = function(camera, scene, geometry, material, object, group) {
            if (material !== settings.ignoredMaterial) {
                fn.call(this, camera, scene, geometry, material, object, group);
            }
        };

        this._scene.fog = this._fog;

        if (!fbo.init(this._renderer)) return false;

        lights.init();
        this._scene.add(lights.mesh);

        lines.init();
        this._scene.add(lines.mesh);

        nodes.init();
        this._scene.add(nodes.mesh);

        ground.init(this._renderer);
        this._scene.add(ground.mesh);

        this._skybox.material = settings.ignoredMaterial;
        this._skybox.renderOrder = -1024;
        this._skybox.frustumCulled = false;
        this._scene.add(this._skybox);

        return true;
    }

    setPointer(position: THREE.Vector3) {
        settings.mouse3d.copy(position);
    }

    update(dt: number, camera: THREE.PerspectiveCamera) {
        settings.whiteRatio += ((settings.isWhite ? 1 : 0) - settings.whiteRatio) * 0.2;
        settings.whiteNodesRatio += ((settings.useWhiteNodes ? 1 : 0) - settings.whiteNodesRatio) * 0.1;

        this._fog.color.copy(BLACK).lerp(WHITE, settings.whiteRatio);
        this._renderer.setClearColor(this._fog.color.getHex());
        this._skybox.position.copy(camera.position);

        lights.update(dt, camera);
        fbo.update(dt);
        lines.update(dt);
        nodes.update(dt);
        ground.update();
    }
}
