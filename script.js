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

	p.setup = () => {
		p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
		p.noStroke();
		p.textureMode(p.NORMAL);
		
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
		const alphA = (phaseClamped / 30) * p.TWO_PI + p.PI; // offset by PI so 0 = new moon
		
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
		
		// Material that reacts to directional light to show phases
		p.specularMaterial(color); // default 200
		p.shininess(5);
		p.sphere(size);
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
