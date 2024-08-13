import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GPUController from './gpu.js';
import WorldObject from './worldobject.js';



const stats = new Stats();
document.body.appendChild( stats.dom )


const scene = new THREE.Scene();


const renderer = new THREE.WebGLRenderer();
//renderer.pixelRatio = window.devicePixelRatio;
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
//renderer.shadowMap.enabled = true;

document.getElementById('stage').appendChild(renderer.domElement);

const aspect = window.innerWidth / window.innerHeight;

const camera = new THREE.PerspectiveCamera(
    75,
    aspect,
    0.1,
    2500
);

camera.position.set(10, 20, 30);
camera.lookAt(scene.position);



const controls = new OrbitControls( camera, renderer.domElement );
controls.target = new THREE.Vector3(0, 0, 0);
controls.update();



const alight = new THREE.AmbientLight( 0x777777 ); // soft white light
scene.add( alight );

const dlight = new THREE.DirectionalLight( 0xffffff, 2 );
dlight.position.set(200, 400, 100);
scene.add( dlight );



//const tickComputeRenderer = initComputeRenderer(renderer);
const computeController = new GPUController(renderer);



const things = [];

for (let i = 0; i < GPUController.COMPUTE_TEX_WIDTH; i++) {
    things.push(
        new WorldObject(
            computeController,
            new THREE.Vector3(i * 10, 0, 0),
            new THREE.Vector3().random()
        )
    );
}

const ptGeom = new THREE.BufferGeometry();

ptGeom.setAttribute(
    'position',
    new THREE.BufferAttribute( new Float32Array(
        things.flatMap((t, idx) => [1, 0, 0])
    ), 3 )
);

ptGeom.setAttribute(
    'posn',
    new THREE.BufferAttribute( new Float32Array(
        things.flatMap(thing => [
            (thing.computeIdx % GPUController.COMPUTE_TEX_WIDTH)
                / GPUController.COMPUTE_TEX_WIDTH,
            Math.floor(thing.computeIdx / GPUController.COMPUTE_TEX_WIDTH)
                / GPUController.COMPUTE_TEX_WIDTH,
        ])
    ), 2 )
);

console.log(ptGeom, things, computeController);

const ptMaterial = new THREE.ShaderMaterial({
    uniforms: computeController.outputUniforms,
    vertexShader: `
uniform sampler2D texturePosition;
uniform sampler2D textureVelocity;

attribute vec2 posn;

varying vec3 vColor;

void main() {
    vec3 pos = texture2D( texturePosition, posn ).xyz;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = ( 50.0 / -mvPosition.z );

    vColor = position;
}
    `,
    fragmentShader: `
varying vec3 vColor;

void main() {
    gl_FragColor = vec4( vColor, 1.0 );
}
    `,

    transparent: true,
    depthTest: true,
    vertexColors: true
});

const points = new THREE.Points(ptGeom, ptMaterial);

scene.add(points);




let t = Performance.now;

function tick(_t) {
    const dt = (_t - t) / 1000;
    t = _t;

    requestAnimationFrame(tick);

    stats.update();
    controls.update();

    computeController.tick(dt);
    
    renderer.render( scene, camera );
}

tick(t);