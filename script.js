// javascript
import p5 from 'p5';

const sketch = (p) => {
	const moonOrbitRadius = 300;
	const moonSize = 80;
	
	// DOM handles (initialized in setup)
	let phaseSlider = null;
	let phaseValueSpan = null;
	
	// Sun direction (static)
	const sunDir = p.createVector(-1, 0.0, 0.5).normalize();
	
	// Shader handle
	let moonShader = null;
	
	const vert = `
	  precision mediump float;
	  attribute vec3 aPosition;
	  attribute vec3 aNormal;
	  uniform mat4 uModelViewMatrix;
	  uniform mat4 uProjectionMatrix;
	  uniform mat3 uNormalMatrix;
	  uniform float uTime;
	  uniform float uNoiseScale;
	  uniform float uDisplacement;
	  varying vec3 vNormal;
	  varying float vNoise;
	
	  // Simplex noise (Ashima 3D)
	  vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
	  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
	  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
	  
	  // --- Added: vec3 overloads to avoid dimension mismatch ---
vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }
vec3 taylorInvSqrt(vec3 r){ return 1.79284291400159 - 0.85373472095314 * r; }
	  
	  float snoise(vec3 v){
		const vec2  C = vec2(1.0/6.0, 1.0/3.0);
		const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
		vec3 i  = floor(v + dot(v, C.yyy));
		vec3 x0 = v - i + dot(i, C.xxx);
		vec3 g = step(x0.yzx, x0.xyz);
		vec3 l = 1.0 - g;
		vec3 i1 = min( g.xyz, l.zxy );
		vec3 i2 = max( g.xyz, l.zxy );
		vec3 x1 = x0 - i1 + C.xxx;
		vec3 x2 = x0 - i2 + C.yyy;
		vec3 x3 = x0 - D.yyy;
		i = mod289(i);
		vec4 p = permute( permute( permute(
				   i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
				 + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
				 + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
		float n_ = 1.0/7.0;
		vec3 ns = n_ * D.wyz - D.xzx;
		vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
		vec4 x_ = floor(j * ns.z);
		vec4 y_ = floor(j - 7.0 * x_ );
		vec4 x = x_ *ns.x + ns.y;
		vec4 y = y_ *ns.x + ns.y;
		vec4 h = 1.0 - abs(x) - abs(y);
		vec4 b0 = vec4( x.xy, y.xy );
		vec4 b1 = vec4( x.zw, y.zw );
		vec4 s0 = floor(b0)*2.0 + 1.0;
		vec4 s1 = floor(b1)*2.0 + 1.0;
		vec4 sh = -step(h, vec4(0.0));
		vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
		vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
		vec3 p0 = vec3(a0.xy,h.x);
		vec3 p1 = vec3(a0.zw,h.y);
		vec3 p2 = vec3(a1.xy,h.z);
		vec3 p3 = vec3(a1.zw,h.w);
		vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
		p0 *= norm.x;
		p1 *= norm.y;
		p2 *= norm.z;
		p3 *= norm.w;
		vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
		m = m * m;
		return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
									  dot(p2,x2), dot(p3,x3) ) );
	  }
	
	  void main() {
		// sample noise in object space on the normalized surface so features stick
		vec3 basePos = aPosition;
		float n = snoise(basePos * uNoiseScale + vec3(uTime * 0.2));
		// push outward along normal
		vec3 displaced = basePos + aNormal * (n * uDisplacement);
		vNoise = n * 0.5 + 0.5; // map to 0..1
		vNormal = normalize(uNormalMatrix * aNormal);
		vec4 mvPosition = uModelViewMatrix * vec4(displaced, 1.0);
		gl_Position = uProjectionMatrix * mvPosition;
	  }
	  `;
	
	// // Fragment shader: color by noise + simple directional lighting
	// const frag = `
	//   precision mediump float;
	//   varying vec3 vNormal;
	//   varying float vNoise;
	//   uniform vec3 uSunDir;
	//   void main() {
	// 	vec3 n = normalize(vNormal);
	// 	float occ = 0.3; // ambient
	// 	float light = max(dot(n, normalize(uSunDir)), 0.0);
	// 	// color ramp: dark bluish -> warm highlight based on noise
	// 	vec3 dark = vec3(0.08, 0.10, 0.18);
	// 	vec3 mid  = vec3(0.35, 0.4, 0.5);
	// 	vec3 high = vec3(1.0, 0.95, 0.9);
	// 	vec3 col = mix(mix(dark, mid, vNoise), high, pow(light, 1.5));
	// 	float brightness = occ + 0.7 * light;
	// 	gl_FragColor = vec4(col * brightness, 1.0);
	//   }
	//   `;
	
	const frag = `
	precision mediump float;
	varying vec3 vNormal;
	varying float vNoise;
	uniform vec3 uSunDir;
	uniform vec3 uRampLow;       // color at noise = 0
	uniform vec3 uRampHigh;      // color at noise = 1
	uniform vec3 uMaterialColor; // diffuse/base color (0..1)
	uniform vec3 uSpecColor;     // specular color
	uniform float uShininess;    // spec exponent
	uniform float uAmbientStrength;
	
	void main() {
	  vec3 N = normalize(vNormal);
	  vec3 L = normalize(uSunDir);
	  // view vector approximated as +Z in view space (camera at origin)
	  vec3 V = vec3(0.0, 0.0, 1.0);
	  vec3 H = normalize(L + V);
	
	  float NdotL = max(dot(N, L), 0.0);
	  
	    // ramp color from noise
		float t = clamp(vNoise, 0.0, 1.0);
  		vec3 rampColor = mix(uRampLow, uRampHigh, t);
	
	  // ambient + diffuse (modulated by per-vertex noise)
	  vec3 ambient = uAmbientStrength * rampColor;
	  vec3 diffuse = rampColor * NdotL * (0.6 + 0.4 * vNoise);
	
	  // Blinn-Phong specular
	  float spec = 0.0;
	  if (NdotL > 0.0) {
		spec = pow(max(dot(N, H), 0.0), uShininess);
	  }
	  vec3 specular = uSpecColor * spec;
	
	  vec3 color = ambient + diffuse + specular;
	  gl_FragColor = vec4(color, 1.0);
	}
	`;

	p.setup = () => {
		p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
		p.noStroke();
		p.textureMode(p.NORMAL);
		
		// create shader
		moonShader = p.createShader(vert, frag);
		
		// Grab slider and display; safe to query here because DOM is ready
		phaseSlider = document.getElementById('phaseSlider');
		phaseValueSpan = document.getElementById('phaseValue');
		
		if (phaseSlider && phaseValueSpan) {
			// update numeric display when slider moves
			phaseSlider.addEventListener('input', () => {
				phaseValueSpan.textContent = phaseSlider.value;
			});
			// initialize display
			phaseValueSpan.textContent = phaseSlider.value;
		}
	};
	
	function drawMoon(size, color, phase) {
		// clamp input to [0,30]
		const phaseClamped = Math.max(0, Math.min(30, phase));
		
		// map 0..30 -> 0..TAU (0 and 30 both map to new moon)
		const alphA = (phaseClamped / 30) * p.TWO_PI; // offset by PI so 0 = new moon
		
		// compute sun angle projected onto XZ plane
		const sunAngle = Math.atan2(sunDir.z, sunDir.x);
		// moon orbital angle = sunAngle + alpha
		const phi = sunAngle + alphA;
		// Compute moon position around the origin (Earth/camera)
		const moonX = moonOrbitRadius * Math.cos(phi);
		const moonZ = moonOrbitRadius * Math.sin(phi);
		
		// Camera is the Earth: position at origin (with small height) and look at the moon
		p.camera(0, 0, 0, moonX, 0, moonZ, 0, 1, 0);
		
		// Draw only the moon (Earth is not drawn)
		p.push();
		p.translate(moonX, 0, moonZ);
		
		// Tidal lock: rotate so the moon's front faces the origin (Earth/camera)
		// angleToEarth = atan2(-moonZ, -moonX) which equals phase + PI
		p.rotateY(phi + Math.PI);
		
		// use custom shader
		p.shader(moonShader);
		// set uniforms
		// moonShader.setUniform('uTime', p.millis() / 1000.0);
		// moonShader.setUniform('uNoiseScale', 1.0);      // tweak for feature size
		// moonShader.setUniform('uDisplacement', 0.2);   // tweak for bump height
		// moonShader.setUniform('uSunDir', [sunDir.x, sunDir.y, sunDir.z]);
		const forward = p.createVector(moonX, 0, moonZ).normalize();
		const worldUp = p.createVector(0, 1, 0);
		const right = p5.Vector.cross(worldUp, forward).normalize();
		const upCam = p5.Vector.cross(forward, right).normalize();
		
		// components of sun in eye space: x = dot(right, sun), y = dot(upCam, sun), z = -dot(forward, sun)
		const sunEyeX = p5.Vector.dot(sunDir, right);
		const sunEyeY = p5.Vector.dot(sunDir, upCam);
		const sunEyeZ = -p5.Vector.dot(sunDir, forward);
		
		// --- before drawing the moon (inside drawMoon) set these uniforms ---
		moonShader.setUniform('uTime', p.millis() / 1000.0);
		moonShader.setUniform('uNoiseScale', 4);
		moonShader.setUniform('uDisplacement', 0.1);
		moonShader.setUniform('uSunDir', [sunEyeX, sunEyeY, sunEyeZ]);
		
		moonShader.setUniform('uRampLow', [1.0, 0.0, 0.0]); // dark bluish
		moonShader.setUniform('uRampHigh', [10.0/255.0, 245.0/255.0, 14.0/255.0]); // light grey-white
		// Material / lighting uniforms (example values)
		moonShader.setUniform('uMaterialColor', [0.78, 0.78, 0.78]); // grey diffuse
		moonShader.setUniform('uSpecColor', [1.0, 1.0, 1.0]);        // white specular
		moonShader.setUniform('uShininess', 16.0);
		moonShader.setUniform('uAmbientStrength', 0.25);
		
		// Material that reacts to directional light to show phases
		p.specularMaterial(color); // default 200
		p.shininess(5);
		const sphereResolution = 96;
		
		p.sphere(size, sphereResolution, sphereResolution);
		
		p.resetShader();
		
		p.pop();
	}
	
	p.draw = () => {
		p.background(10);
		
		// Basic ambient so shadowed side isn't totally black
		p.ambientLight(30);
		
		// Directional light acting as the Sun (static)
		p.directionalLight(255, 255, 220, sunDir.x, sunDir.y, sunDir.z);
		
		// read slider value (fallback to 15 if slider missing)
		const phase = phaseSlider ? parseFloat(phaseSlider.value) : 15;
		
		drawMoon(moonSize, 200, phase);
	};
	
	p.windowResized = () => {
		p.resizeCanvas(p.windowWidth, p.windowHeight);
	};
};

new p5(sketch, document.getElementById('sketch-container'));
