import GUI from 'lil-gui';
// import Stats from 'stats.js';
import css from 'dom-css';
import THREE from 'three';

import OrbitControls from './controls/OrbitControls';
import settings from './core/settings';

import * as fbo from './3d/fbo';
import * as lights from './3d/lights';
import * as lines from './3d/lines';
import * as nodes from './3d/nodes';
import * as ground from './3d/ground';
// import * as vignette from './3d/vignette';
import * as math from './utils/math';

var raf = window.requestAnimationFrame.bind(window);


var undef;
var _gui;
var _stats;

var _width = 0;
var _height = 0;

var _control;
var _camera;
var _scene;
var _renderer;
var _skybox;

var _isDown = false;
var _time = 0;
var _ray = new THREE.Ray();

var _initAnimation = 0;

var BLACK = new THREE.Color(0x222222);
var WHITE = new THREE.Color(0xeeeeee);

function init() {

    if(settings.useStats) {
        _stats = new Stats();
        css(_stats.domElement, {
            position : 'absolute',
            left : '0px',
            top : '0px',
            zIndex : 2048
        });

        document.body.appendChild( _stats.domElement );
    }

    settings.mouse = new THREE.Vector2();
    settings.mouse3d = _ray.origin;

    _renderer = new THREE.WebGLRenderer({
        antialias : true
    });
    _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    _renderer.shadowMap.enabled = true;
    document.body.appendChild(_renderer.domElement);

    // hyjack the render call and ignore the dummy rendering
    settings.ignoredMaterial = new THREE.Material();
    var fn = _renderer.renderBufferDirect;
    _renderer.renderBufferDirect = function(camera, fog, geometry, material) {
        if(material !== settings.ignoredMaterial) {
            fn.apply(this, arguments);
        }
    };

    _scene = new THREE.Scene();
    _scene.fog = new THREE.FogExp2( 0x222222, 0.001 );

    _camera = new THREE.PerspectiveCamera( 45, 1, 1, 3000);
    _camera.position.set(0, 500, 1200).normalize().multiplyScalar(1500);

    _control = new OrbitControls( _camera, _renderer.domElement );
    _control.minDistance = 600;
    _control.maxDistance = 1500;
    _control.minPolarAngle = 0.3;
    _control.maxPolarAngle = Math.PI / 2;
    _control.target.y = -30;
    _control.noPan = true;
    _control.update();

    fbo.init(_renderer);

    lights.init();
    _scene.add(lights.mesh);

    lines.init();
    _scene.add(lines.mesh);

    nodes.init();
    _scene.add(nodes.mesh);

    ground.init(_renderer);
    _scene.add(ground.mesh);


    _skybox = new THREE.Mesh(new THREE.IcosahedronGeometry(128, 2), settings.ignoredMaterial);
    _skybox.renderOrder = -1024;
    _skybox.frustumCulled = false;
    _scene.add(_skybox);

    // vignette.init(_renderer);
    // _scene.add(vignette.mesh);

    _gui = new GUI();
    var linesGui = _gui.addFolder('Motion');
    linesGui.add(settings, 'constraintRatio', 0, 0.15).name('constraint ratio');
    linesGui.add(settings, 'followMouse').name('follow mouse');

    var envGui = _gui.addFolder('Rendering');
    linesGui.add(settings, 'useWhiteNodes').name('white nodes');
    envGui.add(settings, 'isWhite').name('white theme').listen();

    var preventDefault = function(evt){evt.preventDefault();this.blur();};
    Array.prototype.forEach.call(_gui.domElement.querySelectorAll('input[type="checkbox"],select'), function(elem){
        elem.onkeyup = elem.onkeydown = preventDefault;
        elem.style.color = '#000';
    });



    if(window.screen.width > 480) {
        linesGui.open();
        envGui.open();
    }

    window.addEventListener('resize', _onResize);
    window.addEventListener('mousedown', _onDown);
    window.addEventListener('mousemove', _onMove);
    window.addEventListener('mouseup', _onUp);
    window.addEventListener('touchstart', _bindTouch(_onDown));
    window.addEventListener('touchmove', _bindTouch(_onMove));
    window.addEventListener('touchend', _onUp);
    document.addEventListener('keyup', _onKeyUp);

    _time = Date.now();
    _onResize();
    _loop();

}

function _onKeyUp(evt) {
    if(evt.keyCode === 32) {
        settings.isWhite = !settings.isWhite;
    }
}

function _bindTouch(func) {
    return function (evt) {
        func(evt.changedTouches[0]);
    };
}

function _onDown(evt) {
    _isDown = true;
    _onMove(evt);
}

function _onMove(evt) {
    // if(_isDown) {
        settings.mouse.x = (evt.pageX / _width) * 2 - 1;
        settings.mouse.y = -(evt.pageY / _height) * 2 + 1;
    // }
}

function _onUp() {
    _isDown = false;
}

function _onResize() {
    _width = window.innerWidth;
    _height = window.innerHeight;

    _camera.aspect = _width / _height;
    _camera.updateProjectionMatrix();
    _renderer.setSize(_width, _height);

}

function _loop() {
    var newTime = Date.now();
    raf(_loop);
    if(settings.useStats) _stats.begin();
    _render(newTime - _time, newTime);
    if(settings.useStats) _stats.end();
    _time = newTime;
}

function _render(dt, newTime) {

    settings.whiteRatio += ((settings.isWhite ? 1 : 0) - settings.whiteRatio) * 0.2;
    settings.whiteNodesRatio += ((settings.useWhiteNodes ? 1 : 0) - settings.whiteNodesRatio) * 0.1;

    _scene.fog.color.copy(BLACK).lerp(WHITE, settings.whiteRatio);
    _renderer.setClearColor(_scene.fog.color.getHex());
    // vignette.alphaUniform.value = math.lerp(0.5, 0.2, settings.whiteRatio);

    _initAnimation = Math.min(_initAnimation + dt * 0.0002, 1);
    var zoomAnimation = Math.pow(_initAnimation, 2);

    _control.maxDistance = zoomAnimation === 1 ? 1500 : math.lerp(1500, 900, zoomAnimation);
    _control.update();
    _skybox.position.copy(_camera.position);

    // update mouse3d
    _camera.updateMatrixWorld();
    _ray.origin.setFromMatrixPosition( _camera.matrixWorld );
    _ray.direction.set( settings.mouse.x, settings.mouse.y, 0.5 ).unproject( _camera ).sub( _ray.origin ).normalize();
    var distance = _ray.origin.length() / Math.cos(Math.PI - _ray.direction.angleTo(_ray.origin));
    _ray.origin.add( _ray.direction.multiplyScalar(distance * 0.9)); // make it a bit closer to the camerato see more white edges

    lights.update(dt, _camera);
    fbo.update(dt);
    lines.update(dt);
    nodes.update(dt);
    // vignette.update(dt);

    ground.update();

    _renderer.render(_scene, _camera);

    document.documentElement.classList.toggle('is-white', settings.isWhite);
}

init();
