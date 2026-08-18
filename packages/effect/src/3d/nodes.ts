import * as THREE from 'three';
import type { ConstraintSettings } from '../core/settings';
import shaderParse from '../helpers/shaderParse';
import nodeVert from '../glsl/node.vert';
import nodeFrag from '../glsl/node.frag';
import type { Fbo } from './fbo';
import * as math from '../utils/math';

export class ConstraintNodes {
    mesh!: THREE.Points;

    private readonly _settings: ConstraintSettings;
    private readonly _fbo: Fbo;
    private _material!: THREE.ShaderMaterial;

    constructor(settings: ConstraintSettings, fbo: Fbo) {
        this._settings = settings;
        this._fbo = fbo;
    }

    init() {
        var particleAmount = this._fbo.amount;
        var textureSize = this._fbo.textureSize;
        var positions = new Float32Array(particleAmount * 3);

        var i3;
        for(var i = 0; i < particleAmount; ++i ) {
            i3 = i * 3;
            positions[i3] = (i % textureSize) / textureSize;
            positions[i3 + 1] = ~~(i / textureSize) / textureSize;
            positions[i3 + 2] = Math.pow(math.hash(20 + i * 31.512), 5);
        }

        var geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this._material = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.merge([
                THREE.UniformsLib.fog, {
                texturePosition: { value: null },
                alpha: { value: 1 }
            }]),
            vertexShader: shaderParse(nodeVert),
            fragmentShader: shaderParse(nodeFrag),
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
            fog: true
        });

        this.mesh = new THREE.Points(geometry, this._material);
    }

    dispose() {
        this.mesh.geometry.dispose();
        this._material.dispose();
    }

    update() {
        this.mesh.visible = this._settings.useWhiteNodes;
        this._material.uniforms.texturePosition.value = this._fbo.positionRenderTarget.texture;
        this._material.uniforms.alpha.value = 1 - this._settings.whiteRatio * 0.9;
    }
}
