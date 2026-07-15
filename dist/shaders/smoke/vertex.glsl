
uniform float uTime;
uniform sampler2D uPerlinTexture;
varying vec2 vUv;


vec2 rotate2D(vec2 v, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    mat2 m = mat2(c, -s, s, c);
    return m * v;
}

void main()
{
    vec3 newPosition = position;

    // twist
    float twistPerlin = texture(
        uPerlinTexture,
        vec2(0.5, uv.y * 0.2 - uTime * 0.005)
        ).r;
    float angle = twistPerlin * 10.0;
    newPosition.xz = rotate2D(newPosition.xz, angle);



    // final position
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0); 

    vUv = uv;
}

