import p5 from 'p5';

const sketch = (p) => {

    p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.background(0,0,220);
    };
	
    p.draw = () => {

    };

    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
    };
};

new p5(sketch, document.getElementById('sketch-container'));
