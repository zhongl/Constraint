import * as THREE from 'three';
import shaderParse from '../helpers/shaderParse';
import linesVert from '../glsl/lines.vert';
import linesFrag from '../glsl/lines.frag';
import lineDepthVert from '../glsl/lineDepth.vert';
import lineDepthFrag from '../glsl/lineDepth.frag';
import type { Fbo } from './fbo';
import * as math from '../utils/math';

export class ConstraintLines {
    mesh!: THREE.LineSegments;

    private readonly _fbo: Fbo;
    private _material!: THREE.ShaderMaterial;
    private _depthMaterial!: THREE.ShaderMaterial;

    constructor(
        private readonly _lineAmount: number,
        fbo: Fbo
    ) {
        this._fbo = fbo;
    }

    init(): void {
        const particleAmount = this._fbo.amount;
        const textureSize = this._fbo.textureSize;
        const lineAmount = this._lineAmount;

        const positions = new Float32Array(lineAmount * 2 * 3);
        const oppositeUv = new Float32Array(lineAmount * 2 * 2);

        let i4, i6, indexA, indexB;
        for(let i = 0; i < lineAmount; ++i ) {
            i4 = i * 4;
            i6 = i * 6;
            indexA = i % particleAmount;
            positions[i6] = oppositeUv[i4 + 2] = (indexA % textureSize) / textureSize;
            positions[i6 + 1] = oppositeUv[i4 + 3] = ~~(indexA / textureSize) / textureSize;
            positions[i6 + 2] = -1;

            indexB = ~~(math.hash(i * 100.0) * particleAmount);
            if(indexB === indexA) indexB = (indexB + 1) % particleAmount;
            positions[i6 + 3] = oppositeUv[i4] = (indexB % textureSize) / textureSize;
            positions[i6 + 4] = oppositeUv[i4 + 1] = ~~(indexB / textureSize) / textureSize;
            positions[i6 + 5] = 1;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('oppositeUv', new THREE.BufferAttribute(oppositeUv, 2));
        this._material = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.merge([
                THREE.UniformsLib.fog,
                THREE.UniformsLib.lights, {
                texturePosition: { value: null },
                lightNodesRatio: { value: 1 },
                lightRatio: { value: 1 }
            }]),
            vertexShader: shaderParse(linesVert),
            fragmentShader: shaderParse(linesFrag),
            linewidth: 1,
            blending: THREE.NoBlending,
            lights: true,
            fog: true
        });

        this._depthMaterial = new THREE.ShaderMaterial({
            uniforms: {
                texturePosition: { value: null },
            },
            vertexShader: shaderParse(lineDepthVert),
            fragmentShader: shaderParse(lineDepthFrag),
            depthTest: true,
            depthWrite: true
        });

        this.mesh = new THREE.LineSegments(geometry, this._material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.frustumCulled = false;
        this.mesh.customDepthMaterial = this._depthMaterial;
    }

    dispose(): void {
        this.mesh.geometry.dispose();
        this._material.dispose();
        this._depthMaterial.dispose();
    }

    update(
        positionTexture: THREE.Texture,
        lightNodesRatio: number,
        lightRatio: number
    ): void {
        this._material.uniforms.texturePosition!.value = positionTexture;
        this._depthMaterial.uniforms.texturePosition!.value = positionTexture;
        this._material.uniforms.lightNodesRatio!.value = lightNodesRatio;
        this._material.uniforms.lightRatio!.value = lightRatio;
    }
}
