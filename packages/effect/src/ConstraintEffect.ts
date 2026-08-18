import * as THREE from 'three';
import { Fbo } from './3d/fbo';
import { ConstraintGround } from './3d/ground';
import { ConstraintLights } from './3d/lights';
import { ConstraintLines } from './3d/lines';
import { ConstraintNodes } from './3d/nodes';
import { createSettings } from './core/settings';

const BLACK = new THREE.Color(0x222222);
const WHITE = new THREE.Color(0xeeeeee);

export class ConstraintEffect {
    private readonly _renderer: THREE.WebGLRenderer;
    private readonly _scene: THREE.Scene;
    private readonly _fog = new THREE.FogExp2(0x222222, 0.001);
    private readonly _settings = createSettings();
    private readonly _fbo = new Fbo(this._settings);
    private readonly _lines: ConstraintLines;
    private readonly _nodes: ConstraintNodes;
    private readonly _ground: ConstraintGround;
    private readonly _lights: ConstraintLights;
    private readonly _skybox: THREE.Mesh;
    private _originalRenderBufferDirect!: THREE.WebGLRenderer['renderBufferDirect'];

    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
        this._renderer = renderer;
        this._scene = scene;
        this._skybox = new THREE.Mesh(new THREE.IcosahedronGeometry(128, 2));
        this._lights = new ConstraintLights();
        this._lines = new ConstraintLines(this._settings, this._fbo);
        this._nodes = new ConstraintNodes(this._settings, this._fbo);
        this._ground = new ConstraintGround(this._settings);
    }

    get constraintRatio(): number {
        return this._settings.constraintRatio;
    }

    set constraintRatio(value: number) {
        this._settings.constraintRatio = value;
    }

    get followPointer(): boolean {
        return this._settings.followMouse;
    }

    set followPointer(value: boolean) {
        this._settings.followMouse = value;
    }

    get useWhiteNodes(): boolean {
        return this._settings.useWhiteNodes;
    }

    set useWhiteNodes(value: boolean) {
        this._settings.useWhiteNodes = value;
    }

    get isWhite(): boolean {
        return this._settings.isWhite;
    }

    set isWhite(value: boolean) {
        this._settings.isWhite = value;
    }

    init(): boolean {
        this._settings.mouse3d = new THREE.Vector3();
        this._settings.ignoredMaterial = new THREE.Material();

        const settings = this._settings;
        const fn = this._renderer.renderBufferDirect;
        this._originalRenderBufferDirect = fn;
        this._renderer.renderBufferDirect = function(camera, scene, geometry, material, object, group) {
            if (material !== settings.ignoredMaterial) {
                fn.call(this, camera, scene, geometry, material, object, group);
            }
        };

        this._scene.fog = this._fog;

        if (!this._fbo.init(this._renderer)) return false;

        this._lights.init();
        this._scene.add(this._lights.mesh);

        this._lines.init();
        this._scene.add(this._lines.mesh);

        this._nodes.init();
        this._scene.add(this._nodes.mesh);

        this._ground.init();
        this._scene.add(this._ground.mesh);

        this._skybox.material = this._settings.ignoredMaterial;
        this._skybox.renderOrder = -1024;
        this._skybox.frustumCulled = false;
        this._scene.add(this._skybox);

        return true;
    }

    setPointer(position: THREE.Vector3): void {
        this._settings.mouse3d.copy(position);
    }

    dispose(): void {
        this._scene.remove(this._lights.mesh, this._lines.mesh, this._nodes.mesh, this._ground.mesh, this._skybox);
        this._lights.dispose();
        this._lines.dispose();
        this._nodes.dispose();
        this._ground.dispose();
        this._fbo.dispose();
        this._skybox.geometry.dispose();
        (this._skybox.material as THREE.Material).dispose();
        this._settings.ignoredMaterial.dispose();
        this._renderer.renderBufferDirect = this._originalRenderBufferDirect;
    }

    update(dt: number, camera: THREE.PerspectiveCamera): void {
        this._settings.whiteRatio += ((this._settings.isWhite ? 1 : 0) - this._settings.whiteRatio) * 0.2;
        this._settings.whiteNodesRatio += ((this._settings.useWhiteNodes ? 1 : 0) - this._settings.whiteNodesRatio) * 0.1;

        this._fog.color.copy(BLACK).lerp(WHITE, this._settings.whiteRatio);
        this._renderer.setClearColor(this._fog.color.getHex());
        this._skybox.position.copy(camera.position);

        this._lights.update();
        this._fbo.update(dt);
        this._lines.update();
        this._nodes.update();
        this._ground.update();
    }
}
