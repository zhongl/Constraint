import './styles/normalize.css';
import './styles/index.css';
import GUI from 'lil-gui';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ConstraintEffect } from '@constraint/effect';

var raf = window.requestAnimationFrame.bind(window);


var _gui: GUI;
var _width = 0;
var _height = 0;

var _control: OrbitControls;
var _camera: THREE.PerspectiveCamera;
var _scene: THREE.Scene;
var _renderer: THREE.WebGLRenderer;
var _effect: ConstraintEffect;

var _time = 0;
var _mouse = new THREE.Vector2();
var _ray = new THREE.Ray();

var _initAnimation = 0;

function init() {

    try {
        _renderer = new THREE.WebGLRenderer({
            antialias : true
        });
    } catch {
        _showCompatibilityMessage();
        return;
    }
    _renderer.debug.checkShaderErrors = true;
    _renderer.shadowMap.type = THREE.PCFShadowMap;
    _renderer.shadowMap.enabled = true;
    document.body.appendChild(_renderer.domElement);

    _scene = new THREE.Scene();

    _camera = new THREE.PerspectiveCamera( 45, 1, 1, 3000);
    _camera.position.set(0, 500, 1200).normalize().multiplyScalar(1500);

    _control = new OrbitControls( _camera, _renderer.domElement );
    _control.minDistance = 600;
    _control.maxDistance = 1500;
    _control.minPolarAngle = 0.3;
    _control.maxPolarAngle = Math.PI / 2;
    _control.target.y = -30;
    _control.enablePan = false;
    _control.update();

    _effect = new ConstraintEffect(_renderer, _scene);
    if (!_effect.init()) {
        _renderer.dispose();
        _renderer.domElement.remove();
        _showCompatibilityMessage();
        return;
    }


    _gui = new GUI();
    var linesGui = _gui.addFolder('Motion');
    linesGui.add(_effect, 'constraintRatio', 0, 0.15).name('constraint ratio');
    linesGui.add(_effect, 'followPointer').name('follow mouse');

    var envGui = _gui.addFolder('Rendering');
    linesGui.add(_effect, 'useWhiteNodes').name('white nodes');
    envGui.add(_effect, 'isWhite').name('white theme').listen();

    var preventDefault = (evt: KeyboardEvent) => {
        evt.preventDefault();
        (evt.currentTarget as HTMLElement).blur();
    };
    Array.prototype.forEach.call(_gui.domElement.querySelectorAll('input[type="checkbox"],select'), function(elem: HTMLInputElement | HTMLSelectElement){
        elem.onkeyup = elem.onkeydown = preventDefault;
        elem.style.color = '#000';
    });



    if(window.screen.width > 480) {
        linesGui.open();
        envGui.open();
    }

    window.addEventListener('resize', _onResize);
    window.addEventListener('mousemove', _onMove);
    window.addEventListener('touchmove', _bindTouch(_onMove));
    document.addEventListener('keyup', _onKeyUp);

    _time = Date.now();
    _onResize();
    _loop();

}

function _showCompatibilityMessage() {
    document.body.innerHTML = '<main class="compatibility-message"><h1>无法运行此实验</h1><p>你的设备或浏览器不支持运行所需的 WebGL 浮点纹理能力。</p><p>请尝试使用最新版 Chrome、Safari 或 Firefox，并开启硬件加速。</p></main>';
}

function _onKeyUp(evt: KeyboardEvent) {
    if(evt.keyCode === 32) {
        _effect.isWhite = !_effect.isWhite;
    }
}

function _bindTouch(func: (evt: MouseEvent | Touch) => void) {
    return function (evt: TouchEvent) {
        func(evt.changedTouches[0]);
    };
}

function _onMove(evt: MouseEvent | Touch) {
    // if(_isDown) {
        _mouse.x = (evt.pageX / _width) * 2 - 1;
        _mouse.y = -(evt.pageY / _height) * 2 + 1;
    // }
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
    _render(newTime - _time);
    _time = newTime;
}

function _render(dt: number) {

    _initAnimation = Math.min(_initAnimation + dt * 0.0002, 1);
    var zoomAnimation = Math.pow(_initAnimation, 2);

    _control.maxDistance = zoomAnimation === 1 ? 1500 : 1500 + (900 - 1500) * zoomAnimation;
    _control.update();

    _camera.updateMatrixWorld();
    _ray.origin.setFromMatrixPosition( _camera.matrixWorld );
    _ray.direction.set( _mouse.x, _mouse.y, 0.5 ).unproject( _camera ).sub( _ray.origin ).normalize();
    var distance = _ray.origin.length() / Math.cos(Math.PI - _ray.direction.angleTo(_ray.origin));
    _ray.origin.add( _ray.direction.multiplyScalar(distance * 0.9)); // make it a bit closer to the camerato see more white edges
    _effect.setPointer(_ray.origin);
    _effect.update(dt, _camera);

    _renderer.render(_scene, _camera);

    document.documentElement.classList.toggle('is-white', _effect.isWhite);
}

init();
