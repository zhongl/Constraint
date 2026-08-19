import * as THREE from 'three';
import shaderParse from '../helpers/shaderParse';
import nodeVert from '../glsl/node.vert';
import nodeFrag from '../glsl/node.frag';
import type { Fbo } from './fbo';
import * as math from '../utils/math';

export class ConstraintNodes {
    mesh!: THREE.Points;

    private readonly _fbo: Fbo;
    private _material!: THREE.ShaderMaterial;

    constructor(fbo: Fbo) {
        this._fbo = fbo;
    }

    init(): void {
        const particleAmount = this._fbo.amount;
        const textureSize = this._fbo.textureSize;
        const positions = new Float32Array(particleAmount * 3);

        let i3;
        for(let i = 0; i < particleAmount; ++i ) {
            i3 = i * 3;
            positions[i3] = (i % textureSize) / textureSize;
            positions[i3 + 1] = ~~(i / textureSize) / textureSize;
            positions[i3 + 2] = Math.pow(math.hash(20 + i * 31.512), 5);
        }

        const geometry = new THREE.BufferGeometry();
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

    dispose(): void {
        this.mesh.geometry.dispose();
        this._material.dispose();
    }

    update(
        positionTexture: THREE.Texture,
        visible: boolean,
        lightRatio: number
    ): void {
        this.mesh.visible = visible;
        this._material.uniforms.texturePosition!.value = positionTexture;
        this._material.uniforms.alpha!.value = 1 - lightRatio * 0.9;
    }
}
