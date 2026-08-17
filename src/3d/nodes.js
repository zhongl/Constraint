import settings from '../core/settings';
import THREE from 'three';
import shaderParse from '../helpers/shaderParse';
import nodeVert from '../glsl/node.vert';
import nodeFrag from '../glsl/node.frag';

import * as fbo from './fbo';
import * as math from '../utils/math';

export var mesh;

var _geometry;
var _material;

export function init() {

    var PARTICLE_AMOUNT = fbo.AMOUNT;
    var TEXTURE_SIZE = fbo.TEXTURE_SIZE;

    // use position x, y for the point
    var positions = new Float32Array(PARTICLE_AMOUNT  * 3);

    var i3;
    for(var i = 0; i < PARTICLE_AMOUNT; ++i ) {
        i3 = i * 3;
        positions[i3 + 0] = (i % TEXTURE_SIZE) / TEXTURE_SIZE;
        positions[i3 + 1] = ~~(i / TEXTURE_SIZE) / TEXTURE_SIZE;
        positions[i3 + 2] = Math.pow(math.hash(20 + i * 31.512), 5);
    }
    _geometry = new THREE.BufferGeometry();
    _geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ));
    _material = new THREE.ShaderMaterial( {
        uniforms: THREE.UniformsUtils.merge( [
            THREE.UniformsLib.fog, {
            texturePosition: { type: 't', value: null },
            alpha: { type: 'f', value: 1 }
        }]),
        vertexShader: shaderParse(nodeVert),
        fragmentShader: shaderParse(nodeFrag),
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        fog: true
    });

    mesh = new THREE.Points(_geometry, _material);

}

export function update(dt) {

    mesh.visible = settings.useWhiteNodes;

    var positionTexture = fbo.positionRenderTarget.texture;
    _material.uniforms.texturePosition.value = positionTexture;
    _material.uniforms.alpha.value = 1 - settings.whiteRatio * 0.9;

}
