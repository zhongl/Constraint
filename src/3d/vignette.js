import settings from '../core/settings';
import * as THREE from 'three';
import shaderParse from '../helpers/shaderParse';
import vignetteVert from '../glsl/vignette.vert';
import vignetteFrag from '../glsl/vignette.frag';

export var mesh;
export var alphaUniform;

var _resolution;
var _uTime;

export function init() {
    var geometry = new THREE.PlaneGeometry( 2, 2);
    var material = new THREE.ShaderMaterial( {
        uniforms: {
            uAlpha : alphaUniform = {type : 'f', value: 1 },
            uTime : _uTime = {type : 'f', value: 0 },
            uResolution : {type : 'v2', value: _resolution = new THREE.Vector2() }
        },
        vertexShader: shaderParse(vignetteVert),
        fragmentShader: shaderParse(vignetteFrag),
        blending: THREE.NormalBlending,
        transparent: true,
        depthWrite: false,
        depthTest: false
    });

    mesh = new THREE.Mesh( geometry, material );
    mesh.frustumCulled = false;
    mesh.renderOrder = 1024;

}

export function resize(width, height) {
    _resolution.set(width, height);
}

export function update(dt) {
    _uTime.value = (_uTime.value + dt) % 15171;
}
