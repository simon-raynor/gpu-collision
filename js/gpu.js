import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';

const COMPUTE_TEX_WIDTH = 250;

const BUFFER_SIZE = COMPUTE_TEX_WIDTH * COMPUTE_TEX_WIDTH * 4;



export default class GPUController {
    static COMPUTE_TEX_WIDTH = COMPUTE_TEX_WIDTH;

    #computer;

    constructor(renderer) {
        this.#computer = new GPUComputationRenderer(
            COMPUTE_TEX_WIDTH,
            COMPUTE_TEX_WIDTH,
            renderer
        );

        this.#createUniforms();

        this.#createTextures();

        this.#createVars();
    
    
        const error = this.#computer.init();
    
        if (error !== null) throw error;

        this.outputUniforms = {
            texturePosition: { value: null },
            textureVelocity: { value: null }
        };

        this.tick(0);

        console.log(this.#positionVar)
    }


    #uniforms

    #createUniforms() {
        const dtUniform = { value: 0.0 };

        const hasInput = {
            value: new THREE.DataTexture(
                new Float32Array(BUFFER_SIZE),
                COMPUTE_TEX_WIDTH,
                COMPUTE_TEX_WIDTH,
                THREE.RGBAFormat,
                THREE.FloatType
            )
        };

        const positionInput = {
            value: new THREE.DataTexture(
                new Float32Array(BUFFER_SIZE),
                COMPUTE_TEX_WIDTH,
                COMPUTE_TEX_WIDTH,
                THREE.RGBAFormat,
                THREE.FloatType
            ),
        };

        const velocityInput = {
            value: new THREE.DataTexture(
                new Float32Array(BUFFER_SIZE),
                COMPUTE_TEX_WIDTH,
                COMPUTE_TEX_WIDTH,
                THREE.RGBAFormat,
                THREE.FloatType
            ),
        };

        /* hasInput.value.onUpdate = () => {
            if (hasInput.value.image.data[0]) {
                hasInput.value.image.data.fill(0);
                hasInput.value.needsUpdate = true;
            }
        }; */

        this.#uniforms = {
            dtUniform,
            hasInput,
            positionInput,
            velocityInput
        };
    }


    #positionTexture
    #velocityTexture

    #createTextures() {
        this.#positionTexture = this.#computer.createTexture();
        this.#velocityTexture = this.#computer.createTexture();

        for (let i = 0, l = COMPUTE_TEX_WIDTH * COMPUTE_TEX_WIDTH; i < l; i++) {
            this.#positionTexture.image.data[i * 4 + 0] = 0;
            this.#positionTexture.image.data[i * 4 + 1] = 0;
            this.#positionTexture.image.data[i * 4 + 2] = 0;
            this.#positionTexture.image.data[i * 4 + 3] = 0;

            this.#velocityTexture.image.data[i * 4 + 0] = 0;
            this.#velocityTexture.image.data[i * 4 + 1] = 0;
            this.#velocityTexture.image.data[i * 4 + 2] = 0;
            this.#velocityTexture.image.data[i * 4 + 3] = 0;
        }
    }


    #positionVar
    #velocityVar

    #createVars() {
        const positionVar = this.#computer.addVariable(
            'texturePosition',
            `
            uniform float dtUniform;
            uniform sampler2D hasInput;
            uniform sampler2D positionInput;
    
            void main() {
                vec2 uv = gl_FragCoord.xy / resolution.xy;
    
                // check previous
                vec4 tmpPosn = texture2D( texturePosition, uv );
                // check input buffer
                vec4 inputPosn = texture2D( positionInput, uv );
                float doInput = texture2D( hasInput, uv ).x;
                // pick buffer vs previous
                vec3 position = doInput > 0.0 ? inputPosn.xyz : tmpPosn.xyz;

                vec3 velocity = texture2D( textureVelocity, uv ).xyz;
    
                gl_FragColor = vec4( position + velocity * dtUniform * 15., 1.0 );
            }
            `,
            this.#positionTexture
        );
    
        const velocityVar = this.#computer.addVariable(
            'textureVelocity',
            `
            uniform float dtUniform;
            uniform sampler2D hasInput;
            uniform sampler2D velocityInput;
    
            const float width = resolution.x;
            const float height = resolution.y;
    
            void main() {
                vec2 uv = gl_FragCoord.xy / resolution.xy;
    
                vec3 position = texture2D( texturePosition, uv ).xyz;

                // check previous
                vec3 tmpVelo = texture2D( textureVelocity, uv ).xyz;
                // check input buffer
                vec3 inputVelo = texture2D( velocityInput, uv ).xyz;
                float doInput = texture2D( hasInput, uv ).y;
                // pick buffer vs previous
                vec3 velocity = doInput > 0.0 ? inputVelo : tmpVelo;

                vec3 toOrigin = length(position) > 1.0
                            ? normalize(position)
                            * -dtUniform / (length(position))
                            : vec3(0.0, 0.0, 0.0);

                velocity += toOrigin;
    
                gl_FragColor = vec4( velocity, 1.0 );
            }
            `,
            this.#velocityTexture
        );
        
        this.#computer.setVariableDependencies(
            positionVar,
            [ positionVar, velocityVar ]
        );
        this.#computer.setVariableDependencies(
            velocityVar,
            [ positionVar, velocityVar ]
        );
    
        positionVar.material.uniforms = 
            velocityVar.material.uniforms = this.#uniforms;
        
        this.#positionVar = positionVar;
        this.#velocityVar = velocityVar;

        this.#positionVar.wrapS = THREE.RepeatWrapping;
        this.#positionVar.wrapT = THREE.RepeatWrapping;
        this.#velocityVar.wrapS = THREE.RepeatWrapping;
        this.#velocityVar.wrapT = THREE.RepeatWrapping;
    }


    tick(dt) {
        if (isNaN(dt)) {
            console.warn('dt was NaN');
            return;
        }

        console.log(this.#uniforms.hasInput.value.image.data[0])
        
        this.#uniforms.dtUniform.value = dt;

        this.#computer.compute();
        this.#resetHasInput();

        this.outputUniforms.texturePosition.value = this.#computer.getCurrentRenderTarget(
            this.#positionVar
        ).texture;

        this.outputUniforms.textureVelocity.value = this.#computer.getCurrentRenderTarget(
            this.#velocityVar
        ).texture;
    }


    #nextIdx = 0;

    addItem(position, velocity) {
        this.#uniforms.hasInput.value.image.data[this.#nextIdx * 4 + 0] = 1;
        this.#uniforms.hasInput.value.image.data[this.#nextIdx * 4 + 1] = 1;
        this.#uniforms.hasInput.value.image.data[this.#nextIdx * 4 + 2] = 1;
        this.#uniforms.hasInput.value.image.data[this.#nextIdx * 4 + 3] = 1;
        this.#uniforms.hasInput.value.needsUpdate = true;
        
        const posnArr = this.#uniforms.positionInput.value.image.data;

        posnArr[this.#nextIdx * 4 + 0] = position.x;
        posnArr[this.#nextIdx * 4 + 1] = position.y;
        posnArr[this.#nextIdx * 4 + 2] = position.z;
        posnArr[this.#nextIdx * 4 + 3] = 1;
        this.#uniforms.positionInput.value.needsUpdate = true;
        
        const veloArr = this.#uniforms.velocityInput.value.image.data;

        veloArr[this.#nextIdx * 4 + 0] = velocity.x;
        veloArr[this.#nextIdx * 4 + 1] = velocity.y;
        veloArr[this.#nextIdx * 4 + 2] = velocity.z;
        veloArr[this.#nextIdx * 4 + 3] = 1;
        this.#uniforms.velocityInput.value.needsUpdate = true;

        return this.#nextIdx++;
    }

    #resetHasInput() {
        this.#uniforms.hasInput.value.image.data.fill(
            0,
            0,
            BUFFER_SIZE
        );
        this.#uniforms.hasInput.value.needsUpdate = true;
    }
}