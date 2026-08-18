import settings from '../core/settings';
import * as THREE from 'three';
import shaderParse from '../helpers/shaderParse';
import linesVert from '../glsl/lines.vert';
import linesFrag from '../glsl/lines.frag';
import lineDepthVert from '../glsl/lineDepth.vert';
import lineDepthFrag from '../glsl/lineDepth.frag';

import * as fbo from './fbo';
import * as math from '../utils/math';

export var mesh;

var _geometry;
var _material;
var _depthMaterial;

export function init() {

    var PARTICLE_AMOUNT = fbo.AMOUNT;
    var TEXTURE_SIZE = fbo.TEXTURE_SIZE;
    var LINE_AMOUNT = settings.lineAmount;

    // use position x, y for the pointA fboUv and z for line side
    var positions = new Float32Array(LINE_AMOUNT * 2 * 3);
    var oppositeUv = new Float32Array(LINE_AMOUNT * 2 * 2);

    var i4, i6, indexA, indexB;
    for(var i = 0; i < LINE_AMOUNT; ++i ) {
        i4 = i * 4;
        i6 = i * 6;
        indexA = i %  PARTICLE_AMOUNT;
        positions[i6 + 0] = oppositeUv[ i4 + 2] = (indexA % TEXTURE_SIZE) / TEXTURE_SIZE;
        positions[i6 + 1] = oppositeUv[ i4 + 3] = ~~(indexA / TEXTURE_SIZE) / TEXTURE_SIZE;
        positions[i6 + 2] = -1;

        indexB = ~~(math.hash(i * 100.0) * PARTICLE_AMOUNT);
        if(indexB === indexA) indexB = ( indexB + 1 ) % PARTICLE_AMOUNT;
        positions[i6 + 3] = oppositeUv[ i4 + 0] = (indexB % TEXTURE_SIZE) / TEXTURE_SIZE;
        positions[i6 + 4] = oppositeUv[ i4 + 1] = ~~(indexB / TEXTURE_SIZE) / TEXTURE_SIZE;
        positions[i6 + 5] = 1;
    }
    _geometry = new THREE.BufferGeometry();
    _geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ));
    _geometry.setAttribute( 'oppositeUv', new THREE.BufferAttribute( oppositeUv, 2 ));
    _material = new THREE.ShaderMaterial( {
        uniforms: THREE.UniformsUtils.merge( [
            THREE.UniformsLib.fog,
            THREE.UniformsLib.lights, {
            texturePosition: { type: 't', value: null },
            whiteNodesRatio: { type: 'f', value: 1 },
            whiteRatio: { type: 'f', value: 1 }
        }]),
        vertexShader: shaderParse(linesVert),
        fragmentShader: shaderParse(linesFrag),
        linewidth: 1,
        blending: THREE.NoBlending,
        lights: true,
        fog: true
    });

    _depthMaterial = new THREE.ShaderMaterial( {
        uniforms: {
            texturePosition: { type: 't', value: null },
        },
        vertexShader: shaderParse(lineDepthVert),
        fragmentShader: shaderParse(lineDepthFrag),
        depthTest: true,
        depthWrite: true
    });

    mesh = new THREE.LineSegments(_geometry, _material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.customDepthMaterial = _depthMaterial;

}

export function update() {

    var positionTexture = fbo.positionRenderTarget.texture;
    _material.uniforms.texturePosition.value = positionTexture;
    _depthMaterial.uniforms.texturePosition.value = positionTexture;
    _material.uniforms.whiteNodesRatio.value = settings.whiteNodesRatio;
    _material.uniforms.whiteRatio.value = settings.whiteRatio;

}
