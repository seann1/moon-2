// javascript
import p5 from 'p5';

const sketch = (p) => {
	const moonOrbitRadius = 300;
	const moonSize = 80;
	
	// DOM handles (initialized in setup)
	let phaseSlider = null;
	let phaseValueSpan = null;
	
	// Offscreen buffers
	let sceneG = null; // WEBGL buffer for rendering 3D scene
	let overlayG = null; // 2D buffer for ascii/grid overlay
	
	// Grid settings for overlay sampling
	const cellSize = 20; // pixels per cell (tune for quality/perf)
	
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
			phaseSlider.addEventListener('input', () => {
				phaseValueSpan.textContent = phaseSlider.value;
			});
			phaseValueSpan.textContent = phaseSlider.value;
		}
		
		// create offscreen buffers
		sceneG = p.createGraphics(p.width, p.height, p.WEBGL);
		overlayG = p.createGraphics(p.width, p.height); // 2D
		sceneG.noStroke();
		sceneG.textureMode(sceneG.NORMAL);
		overlayG.noStroke();
		overlayG.rectMode(overlayG.CORNER);
	};
	
	// draw moon into a given graphics context (g can be main p or sceneG)
	function drawMoonOn(g, size, color, phase, sunVec) {
		// clamp input to [0,30]
		const phaseClamped = Math.max(0, Math.min(30, phase));
		
		// map 0..30 -> 0..TAU (0 and 30 both map to new moon) and offset PI so 0 = new moon
		const alphA = (phaseClamped / 30) * g.TWO_PI + g.PI;
		
		// compute sun angle projected onto XZ plane
		const sunAngle = Math.atan2(sunVec.z, sunVec.x);
		// moon orbital angle = sunAngle + alpha
		const phi = sunAngle + alphA;
		// Compute moon position around the origin (Earth/camera)
		const moonX = moonOrbitRadius * Math.cos(phi);
		const moonZ = moonOrbitRadius * Math.sin(phi);
		
		// Camera is the Earth: position at origin (with small height) and look at the moon
		// g.camera(0, 0, 0, moonX, 0, moonZ, 0, 1, 0);
		
		// Set camera on the graphics renderer when available
		if (g._renderer && typeof g._renderer.camera === 'function') {
			g._renderer.camera(0, 0, 0, moonX, 0, moonZ, 0, 1, 0);
			console.log(g._renderer.camera)
		} else if (typeof g.camera === 'function') {
			// defensive: some p5 builds may expose camera directly
			g.camera(0, 0, 0, moonX, 0, moonZ, 0, 1, 0);
		} else {
			// fallback: do nothing — rely on the default WEBGL camera
			// (or adjust as needed, e.g. translate the scene so the moon is visible)
		}
		
		// Draw moon
		g.push();
		g.translate(moonX, 0, moonZ);
		g.rotateY(phi + Math.PI); // tidal lock
		g.specularMaterial(color);
		g.shininess(5);
		g.sphere(size);
		g.pop();
	}
	
	// average pixel color of a p5.Image or pixel array region
	function averageImageRegion(img) {
		if (!img) return [0, 0, 0];
		// img is a p5.Image when get(x,y,w,h) used with area
		img.loadPixels();
		const d = img.width * img.height;
		if (d === 0) return [0, 0, 0];
		let r = 0, g = 0, b = 0;
		const px = img.pixels;
		for (let i = 0; i < px.length; i += 4) {
			r += px[i];
			g += px[i + 1];
			b += px[i + 2];
		}
		return [Math.round(r / d), Math.round(g / d), Math.round(b / d)];
	}
	
	p.draw = () => {
		p.background(10);
		
		// Render 3D scene into offscreen WEBGL buffer
		sceneG.push();
		// clear with same background
		sceneG.background(10);
		// lights
		sceneG.ambientLight(30);
		sceneG.directionalLight(255, 255, 220, sunDir.x, sunDir.y, sunDir.z);
		
		// draw moon into sceneG (reads same slider)
		const phase = phaseSlider ? parseFloat(phaseSlider.value) : 15;
		drawMoonOn(sceneG, moonSize, 200, phase, sunDir);
		sceneG.pop();
		
		// Build overlay by sampling sceneG in a grid
		overlayG.clear();
		const cols = Math.ceil(p.width / cellSize);
		const rows = Math.ceil(p.height / cellSize);
		
		// For performance: sample a small region per cell and average
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				const sx = col * cellSize;
				const sy = row * cellSize;
				const sw = Math.min(cellSize, p.width - sx);
				const sh = Math.min(cellSize, p.height - sy);
				
				// sceneG.get uses top-left pixel coords even for WEBGL buffer
				const imgRegion = sceneG.get(sx, sy, sw, sh); // returns p5.Image
				const [r, g, b] = averageImageRegion(imgRegion);
				
				overlayG.fill(r, g, b);
				overlayG.rect(sx, sy, sw, sh);
			}
		}
		
		// Draw the 3D scene and then overlay to the main WEBGL canvas
		// For WEBGL main canvas, image is positioned from center -> offset by -width/2, -height/2
		p.push();
		p.resetMatrix();
		p.imageMode(p.CORNER);
		p.image(sceneG, -p.width / 2, -p.height / 2, p.width, p.height);
		p.image(overlayG, -p.width / 2, -p.height / 2, p.width, p.height);
		p.pop();
	};
	
	p.windowResized = () => {
		p.resizeCanvas(p.windowWidth, p.windowHeight);
		// recreate offscreen buffers at new size
		sceneG = p.createGraphics(p.width, p.height, p.WEBGL);
		sceneG.noStroke();
		sceneG.textureMode(sceneG.NORMAL);
		overlayG = p.createGraphics(p.width, p.height);
		overlayG.noStroke();
		overlayG.rectMode(overlayG.CORNER);
	};
};

new p5(sketch, document.getElementById('sketch-container'));
