import './styles/normalize.css';
import './styles/index.css';
import GUI from 'lil-gui';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ConstraintEffect } from '@constraint/effect';

class App {
    private readonly _raf = window.requestAnimationFrame.bind(window);

    private _gui!: GUI;
    private _width = 0;
    private _height = 0;

    private _control!: OrbitControls;
    private _camera!: THREE.PerspectiveCamera;
    private _scene!: THREE.Scene;
    private _renderer!: THREE.WebGLRenderer;
    private _effect!: ConstraintEffect;

    private _time = 0;
    private readonly _mouse = new THREE.Vector2();
    private readonly _ray = new THREE.Ray();

    private _initAnimation = 0;
    private _lastMouseMove = 0;
    private _isOverControls = false;

    followTimeout = 500;

    init(): void {
        try {
            this._renderer = new THREE.WebGLRenderer({
                antialias: true
            });
        } catch {
            this._showCompatibilityMessage();
            return;
        }
        this._renderer.debug.checkShaderErrors = true;
        this._renderer.shadowMap.type = THREE.PCFShadowMap;
        this._renderer.shadowMap.enabled = true;
        document.body.appendChild(this._renderer.domElement);

        this._scene = new THREE.Scene();

        this._camera = new THREE.PerspectiveCamera(45, 1, 1, 3000);
        this._camera.position.set(0, 500, 1200).normalize().multiplyScalar(1500);

        this._control = new OrbitControls(this._camera, this._renderer.domElement);
        this._control.minDistance = 600;
        this._control.maxDistance = 1500;
        this._control.minPolarAngle = 0.3;
        this._control.maxPolarAngle = Math.PI / 2;
        this._control.target.y = -30;
        this._control.enablePan = false;
        this._control.update();

        this._effect = new ConstraintEffect(this._renderer, this._scene, {
            textureSize: 32,
            lineAmount: 1024 * 16
        });
        if (!this._effect.init()) {
            this._renderer.dispose();
            this._renderer.domElement.remove();
            this._showCompatibilityMessage();
            return;
        }

        this._gui = new GUI();
        const linesGui = this._gui.addFolder('Motion');
        linesGui.add(this._effect, 'constraintRatio', 0, 0.15).name('constraint ratio');
        linesGui.add(this._effect, 'simulationSpeed', 0, 3).name('simulation speed');
        linesGui.add(this, 'followTimeout', 100, 1000, 10).name('follow timeout (ms)');

        const envGui = this._gui.addFolder('Rendering');
        envGui.add(this._effect, 'useLightNodes').name('light nodes');
        envGui.add(this._effect, 'isLight').name('light mode').listen();
        envGui.addColor(this._effect, 'backgroundDark').name('background dark');
        envGui.addColor(this._effect, 'backgroundLight').name('background light');
        envGui.addColor(this._effect, 'groundDark').name('ground dark');
        envGui.addColor(this._effect, 'groundLight').name('ground light');
        envGui.add(this._effect, 'fogDensity', 0, 0.01).name('fog density');

        const preventDefault = (evt: KeyboardEvent) => {
            evt.preventDefault();
            (evt.currentTarget as HTMLElement).blur();
        };
        Array.prototype.forEach.call(this._gui.domElement.querySelectorAll('input[type="checkbox"],select'), function(elem: HTMLInputElement | HTMLSelectElement) {
            elem.onkeyup = elem.onkeydown = preventDefault;
            elem.style.color = '#000';
        });

        if (window.screen.width > 480) {
            linesGui.open();
            envGui.open();
        }

        window.addEventListener('resize', this._onResize.bind(this));
        window.addEventListener('mousemove', this._onMove.bind(this));
        window.addEventListener('touchmove', this._bindTouch(this._onMove.bind(this)));
        document.addEventListener('keyup', this._onKeyUp.bind(this));

        this._time = Date.now();
        this._onResize();
        this._loop();
    }

    private _showCompatibilityMessage(): void {
        document.body.innerHTML = '<main class="compatibility-message"><h1>无法运行此实验</h1><p>你的设备或浏览器不支持运行所需的 WebGL 浮点纹理能力。</p><p>请尝试使用最新版 Chrome、Safari 或 Firefox，并开启硬件加速。</p></main>';
    }

    private _onKeyUp(evt: KeyboardEvent): void {
        if (evt.keyCode === 32) {
            this._effect.isLight = !this._effect.isLight;
        }
    }

    private _bindTouch(func: (evt: MouseEvent | Touch) => void): (evt: TouchEvent) => void {
        return (evt: TouchEvent) => {
            func(evt.changedTouches[0]!);
        };
    }

    private _onMove(evt: MouseEvent | Touch): void {
        this._lastMouseMove = performance.now();
        this._isOverControls = evt.target instanceof Element && evt.target.closest('.lil-gui') !== null;
        this._effect.followPointer = !this._isOverControls;

        this._mouse.x = (evt.pageX / this._width) * 2 - 1;
        this._mouse.y = -(evt.pageY / this._height) * 2 + 1;
    }

    private _onResize(): void {
        this._width = window.innerWidth;
        this._height = window.innerHeight;

        this._camera.aspect = this._width / this._height;
        this._camera.updateProjectionMatrix();
        this._renderer.setSize(this._width, this._height);
    }

    private _loop(): void {
        const newTime = Date.now();
        this._raf(this._loop.bind(this));
        this._render(newTime - this._time);
        this._time = newTime;
    }

    private _render(dt: number): void {
        const isMoving = performance.now() - this._lastMouseMove < this.followTimeout;
        this._effect.followPointer = isMoving && !this._isOverControls;

        this._initAnimation = Math.min(this._initAnimation + dt * 0.0002, 1);
        const zoomAnimation = Math.pow(this._initAnimation, 2);

        this._control.maxDistance = zoomAnimation === 1 ? 1500 : 1500 + (900 - 1500) * zoomAnimation;
        this._control.update();

        this._camera.updateMatrixWorld();
        this._ray.origin.setFromMatrixPosition(this._camera.matrixWorld);
        this._ray.direction.set(this._mouse.x, this._mouse.y, 0.5).unproject(this._camera).sub(this._ray.origin).normalize();
        const distance = this._ray.origin.length() / Math.cos(Math.PI - this._ray.direction.angleTo(this._ray.origin));
        this._ray.origin.add(this._ray.direction.multiplyScalar(distance * 0.9));
        this._effect.update(dt, this._camera, this._ray.origin);

        this._renderer.render(this._scene, this._camera);

        document.documentElement.classList.toggle('is-light', this._effect.isLight);
    }
}

new App().init();
