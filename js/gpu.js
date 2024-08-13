import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';

const COMPUTE_TEX_WIDTH = 32;



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

        this.#uniforms = { dtUniform };
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
    
            void main() {
                vec2 uv = gl_FragCoord.xy / resolution.xy;
    
                vec4 tmpPos = texture2D( texturePosition, uv );
                vec3 position = tmpPos.xyz;
                vec3 velocity = texture2D( textureVelocity, uv ).xyz;
    
                gl_FragColor = vec4( position/*  + velocity * dtUniform * 15. */, 1.0 );
                gl_FragColor = vec4(position ,1.);
            }
            `,
            this.#positionTexture
        );
    
        const velocityVar = this.#computer.addVariable(
            'textureVelocity',
            `
            uniform float dtUniform;
    
            const float width = resolution.x;
            const float height = resolution.y;
    
            void main() {
                vec2 uv = gl_FragCoord.xy / resolution.xy;
    
                vec3 myPosition = texture2D( texturePosition, uv ).xyz;
                vec3 myVelocity = texture2D( textureVelocity, uv ).xyz;
    
                gl_FragColor = vec4( myVelocity, 1.0 );
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
        this.#uniforms.dtUniform.value = dt;

        this.#computer.compute();

        this.outputUniforms.texturePosition.value = this.#computer.getCurrentRenderTarget(
            this.#positionVar
        ).texture;

        this.outputUniforms.textureVelocity.value = this.#computer.getCurrentRenderTarget(
            this.#velocityVar
        ).texture;

        /* console.log(
            this.#positionTexture.image.data[0],
            this.#velocityTexture.image.data[0]
        ) */
    }


    #nextIdx = 0;

    addItem(position, velocity) {
        const posnArr = this.#positionTexture.image.data;

        posnArr[this.#nextIdx * 4 + 0] = position.x;
        posnArr[this.#nextIdx * 4 + 1] = position.y;
        posnArr[this.#nextIdx * 4 + 2] = position.z;
        posnArr[this.#nextIdx * 4 + 3] = 1;

        this.#positionVar.material.uniforms.texturePosition.value = this.#positionTexture;

        this.#computer.doRenderTarget(
            this.#positionVar.material,
            this.#positionVar.renderTargets[this.#computer.currentTextureIndex]
        );

        /* const veloArr = this.#velocityTexture.image.data;

        veloArr[this.#nextIdx * 4 + 0] = velocity.x;
        veloArr[this.#nextIdx * 4 + 1] = velocity.y;
        veloArr[this.#nextIdx * 4 + 2] = velocity.z;
        veloArr[this.#nextIdx * 4 + 3] = 1;

        this.#velocityVar.material.uniforms.texturePosition.value = this.#velocityTexture;

        this.#computer.doRenderTarget(
            this.#velocityVar.material,
            this.#velocityVar.renderTargets[0]
        ); */

        return this.#nextIdx++;
    }
}