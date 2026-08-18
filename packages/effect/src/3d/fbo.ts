import * as THREE from 'three';
import type { ConstraintSettings } from '../core/settings';
import shaderParse from '../helpers/shaderParse';
import fboVert from '../glsl/fbo.vert';
import fboThroughFrag from '../glsl/fboThrough.frag';
import velocityFrag from '../glsl/velocity.frag';
import positionFrag from '../glsl/position.frag';

export class Fbo {
    readonly textureSize: number;
    readonly amount: number;

    positionRenderTarget!: THREE.WebGLRenderTarget;
    prevPositionRenderTarget!: THREE.WebGLRenderTarget;

    private readonly _settings: ConstraintSettings;
    private _copyShader!: THREE.ShaderMaterial;
    private _velocityShader!: THREE.ShaderMaterial;
    private _positionShader!: THREE.ShaderMaterial;
    private _velocityRenderTarget!: THREE.WebGLRenderTarget;
    private _velocityRenderTarget2!: THREE.WebGLRenderTarget;
    private _positionRenderTarget!: THREE.WebGLRenderTarget;
    private _positionRenderTarget2!: THREE.WebGLRenderTarget;
    private _renderer!: THREE.WebGLRenderer;
    private _fboMesh!: THREE.Mesh;
    private _fboScene!: THREE.Scene;
    private _fboCamera!: THREE.Camera;
    private _time = 0;
    private _velocityTexture!: THREE.DataTexture;
    private _positionTexture!: THREE.DataTexture;

    constructor(settings: ConstraintSettings) {
        this._settings = settings;
        this.textureSize = settings.textureSize;
        this.amount = this.textureSize * this.textureSize;
    }

    init(renderer: THREE.WebGLRenderer) {
        this._renderer = renderer;

        var gl = this._renderer.getContext();
        if ( !gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) ) return false;

        var isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' &&
            gl instanceof WebGL2RenderingContext;
        if ( !isWebGL2 && !gl.getExtension( 'OES_texture_float' )) return false;
        if ( !gl.getExtension(isWebGL2 ? 'EXT_color_buffer_float' : 'WEBGL_color_buffer_float') ) return false;

        this._fboScene = new THREE.Scene();
        this._fboCamera = new THREE.Camera();
        this._fboCamera.position.z = 1;

        this._copyShader = new THREE.ShaderMaterial({
            uniforms: {
                resolution: { value: new THREE.Vector2(this.textureSize, this.textureSize) },
                inputTexture: { value: null }
            },
            vertexShader: shaderParse(fboVert),
            fragmentShader: shaderParse(fboThroughFrag)
        });

        this._velocityShader = new THREE.ShaderMaterial({
            uniforms: {
                resolution: { value: new THREE.Vector2(this.textureSize, this.textureSize) },
                mouse3d: { value: new THREE.Vector3() },
                texturePosition: { value: null },
                textureVelocity: { value: null },
                constraintRatio: { value: this._settings.constraintRatio },
                time: { value: 0 },
            },
            vertexShader: shaderParse(fboVert),
            fragmentShader: shaderParse(velocityFrag),
            blending: THREE.NoBlending,
            transparent: false,
            depthWrite: false,
            depthTest: false
        });

        this._positionShader = new THREE.ShaderMaterial({
            uniforms: {
                resolution: { value: new THREE.Vector2(this.textureSize, this.textureSize) },
                texturePosition: { value: null },
                textureVelocity: { value: null },
                time: { value: 0 },
            },
            vertexShader: shaderParse(fboVert),
            fragmentShader: shaderParse(positionFrag),
            blending: THREE.NoBlending,
            transparent: false,
            depthWrite: false,
            depthTest: false
        });

        this._fboMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._copyShader);
        this._fboScene.add(this._fboMesh);

        this._velocityRenderTarget = this._createRenderTarget();
        this._velocityRenderTarget2 = this._velocityRenderTarget.clone();
        this._velocityTexture = this._createVelocityTexture();
        this._copyTexture(this._velocityTexture, this._velocityRenderTarget);
        this._copyTexture(this._velocityRenderTarget.texture, this._velocityRenderTarget2);

        this._positionRenderTarget = this._createRenderTarget();
        this._positionRenderTarget2 = this._positionRenderTarget.clone();
        this._positionTexture = this._createPositionTexture();
        this._copyTexture(this._positionTexture, this._positionRenderTarget);
        this._copyTexture(this._positionRenderTarget.texture, this._positionRenderTarget2);

        return true;
    }

    update(dt: number) {
        this._time += dt;

        var mouse3dUniformValue = this._velocityShader.uniforms.mouse3d.value;
        if (this._settings.followMouse) {
            mouse3dUniformValue.copy(this._settings.mouse3d);
        } else {
            mouse3dUniformValue.set(0.0, 0.0, -9999);
        }

        this._velocityShader.uniforms.constraintRatio.value = this._settings.constraintRatio;
        this._updateVelocity();
        this._updatePosition();

        this.positionRenderTarget = this._positionRenderTarget;
        this.prevPositionRenderTarget = this._positionRenderTarget2;
    }

    dispose() {
        this._velocityTexture.dispose();
        this._positionTexture.dispose();
        this._velocityRenderTarget.dispose();
        this._velocityRenderTarget2.dispose();
        this._positionRenderTarget.dispose();
        this._positionRenderTarget2.dispose();
        this._copyShader.dispose();
        this._velocityShader.dispose();
        this._positionShader.dispose();
        this._fboMesh.geometry.dispose();
    }

    private _createRenderTarget() {
        return new THREE.WebGLRenderTarget(this.textureSize, this.textureSize, {
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            depthBuffer: false,
            stencilBuffer: false
        });
    }

    private _updateVelocity() {
        var tmp = this._velocityRenderTarget;
        this._velocityRenderTarget = this._velocityRenderTarget2;
        this._velocityRenderTarget2 = tmp;

        this._fboMesh.material = this._velocityShader;
        this._velocityShader.uniforms.time.value = this._time;
        this._velocityShader.uniforms.textureVelocity.value = this._velocityRenderTarget2.texture;
        this._velocityShader.uniforms.texturePosition.value = this._positionRenderTarget.texture;
        this._renderer.setRenderTarget(this._velocityRenderTarget);
        this._renderer.render(this._fboScene, this._fboCamera);
        this._renderer.setRenderTarget(null);
    }

    private _updatePosition() {
        var tmp = this._positionRenderTarget;
        this._positionRenderTarget = this._positionRenderTarget2;
        this._positionRenderTarget2 = tmp;

        this._fboMesh.material = this._positionShader;
        this._positionShader.uniforms.time.value = this._time;
        this._positionShader.uniforms.textureVelocity.value = this._velocityRenderTarget.texture;
        this._positionShader.uniforms.texturePosition.value = this._positionRenderTarget2.texture;
        this._renderer.setRenderTarget(this._positionRenderTarget);
        this._renderer.render(this._fboScene, this._fboCamera);
        this._renderer.setRenderTarget(null);
    }

    private _copyTexture(input: THREE.Texture, output: THREE.WebGLRenderTarget) {
        this._fboMesh.material = this._copyShader;
        this._copyShader.uniforms.inputTexture.value = input;
        this._renderer.setRenderTarget(output);
        this._renderer.render(this._fboScene, this._fboCamera);
        this._renderer.setRenderTarget(null);
    }

    private _createVelocityTexture() {
        var a = new Float32Array(this.amount * 4);
        for (var i = 0, len = a.length; i < len; i += 4) {
            a[i] = 0;
            a[i + 1] = 0;
            a[i + 2] = 0;
            a[i + 3] = ((~~(i / 4) % this.textureSize) + 1) % this.textureSize;
        }
        var texture = new THREE.DataTexture(a, this.textureSize, this.textureSize, THREE.RGBAFormat, THREE.FloatType);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        texture.generateMipmaps = false;
        texture.flipY = false;
        return texture;
    }

    private _createPositionTexture() {
        var a = new Float32Array(this.amount * 4);
        for (var i = 0, len = a.length; i < len; i += 4) {
            a[i] = (Math.random() - 0.5) * 1;
            a[i + 1] = (Math.random() - 0.5) * 1;
            a[i + 2] = (Math.random() - 0.5) * 1;
        }
        var texture = new THREE.DataTexture(a, this.textureSize, this.textureSize, THREE.RGBAFormat, THREE.FloatType);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        texture.generateMipmaps = false;
        texture.flipY = false;
        return texture;
    }
}
