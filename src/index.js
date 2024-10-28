// hehe

import 'core-js/stable';
import './tex-mml-chtml';
  
const canvas = document.getElementById('fractalCanvas');
  const ctx = canvas.getContext('2d');
  let audioContext;
  let currentOscillators = [];  // Track active oscillators to stop/reset them on click
  let isMouseDown = false;
  let fractalImage;
  let fractalConstant;
  const maxOscillators = 10;  // Limit on simultaneous oscillators

  // Generate a new fractal on the canvas and store it as an image
  function generateFractal() {
    fractalConstant = (Math.random() * 2 - 1).toFixed(2);  // Random Julia constant, saved for consistency
    const maxIterations = 100;

    // Resize canvas to match the container size
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    for (let x = 0; x < canvas.width; x++) {
      for (let y = 0; y < canvas.height; y++) {
        const iterationCount = calculateIterations(x, y, fractalConstant, maxIterations);
        
        // Black color for points within the fractal; colorful for points outside
        if (iterationCount === maxIterations) {
          ctx.fillStyle = "black";  // Points within the fractal set
        } else {
          const color = `hsl(${iterationCount * 360 / maxIterations}, 100%, 50%)`;  // Outside points
          ctx.fillStyle = color;
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Save the fractal to an image for easy redrawing
    fractalImage = new Image();
    fractalImage.src = canvas.toDataURL();
    
    // Update the displayed equation with the current constant
    updateFractalEquation();
  }

  // Update the fractal equation displayed below the canvas
  function updateFractalEquation() {
    const equationDiv = document.getElementById('fractalEquation');
    equationDiv.innerHTML = `$$f(z) = z^2 + ${fractalConstant}$$`;
    MathJax.typeset(); // Rerender MathJax to display the updated equation
  }

  // Calculate the number of iterations for a point in the fractal
  function calculateIterations(x, y, constant, maxIterations) {
    let zx = (x / canvas.width) * 4 - 2;  // Map canvas x to fractal x range
    let zy = (y / canvas.height) * 4 - 2; // Map canvas y to fractal y range
    let i;

    for (i = 0; i < maxIterations && zx * zx + zy * zy < 4; i++) {
      const tmp = zx * zx - zy * zy + parseFloat(constant);  // Use the fractal constant
      zy = 2 * zx * zy + parseFloat(constant);
      zx = tmp;
    }

    return i;
  }

  // Stop any active oscillators to reset sound on new click
  function resetSound() {
    currentOscillators.forEach(oscillator => oscillator.stop());
    currentOscillators = [];
  }

  // Play sound and visualize the orbit for the specified coordinates
  function playOrbitSoundAndDraw(x, y) {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    resetSound();  // Stop any previous sound when clicking a new spot

    // Clear the previous orbit overlay by redrawing the fractal image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(fractalImage, 0, 0);

    // Calculate orbit data using the saved fractal constant
    const maxIterations = 100;
    let zx = (x / canvas.width) * 4 - 2;
    let zy = (y / canvas.height) * 4 - 2;
    let iterationValues = [];

    for (let i = 0; i < maxIterations && zx * zx + zy * zy < 4; i++) {
      iterationValues.push({ zx, zy });
      const tmp = zx * zx - zy * zy + parseFloat(fractalConstant);
      zy = 2 * zx * zy + parseFloat(fractalConstant);
      zx = tmp;
    }

    // Draw the orbit on the canvas
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.beginPath();
    iterationValues.forEach((point, index) => {
      const canvasX = (point.zx + 2) / 4 * canvas.width;
      const canvasY = (point.zy + 2) / 4 * canvas.height;
      
      if (index === 0) {
        ctx.moveTo(canvasX, canvasY);
      } else {
        ctx.lineTo(canvasX, canvasY);
      }
    });
    ctx.stroke();

    // Play sound based on orbit values, limiting the number of oscillators
    iterationValues.forEach((val, i) => {
      if (currentOscillators.length < maxOscillators) {  // Check limit
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = 200 + val.zx * 100;  // Map zx to frequency for pitch
        gainNode.gain.value = Math.abs(val.zy) / 3;  // Adjust volume based on zy (more conservative)

        oscillator.connect(gainNode).connect(audioContext.destination);
        currentOscillators.push(oscillator);  // Add oscillator to tracking list

        // Start the oscillator and apply a softer, extended damping
        oscillator.start(audioContext.currentTime + i * 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.05 + 0.6);  // Less aggressive damping
        oscillator.stop(audioContext.currentTime + i * 0.7);  // Stop the oscillator after decay
      }
    });
  }

  // Handle mouse down to start orbit visualization and sound
  canvas.addEventListener('mousedown', (event) => {
    isMouseDown = true;
    const { x, y } = getMousePosition(event);
    playOrbitSoundAndDraw(x, y);
  });

  // Handle mouse move to continuously update orbit while dragging
  canvas.addEventListener('mousemove', (event) => {
    if (isMouseDown) {
      const { x, y } = getMousePosition(event);
      // Only play sound if the dragging distance is significant
      if (Math.abs(event.movementX) > 5 || Math.abs(event.movementY) > 5) {
        playOrbitSoundAndDraw(x, y);
      }
    }
  });

  // Handle mouse up to stop continuous orbit updates
  canvas.addEventListener('mouseup', () => {
    isMouseDown = false;
  });

  // Get the mouse position relative to the canvas
  function getMousePosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  // Initial fractal generation on page load
  window.onload = generateFractal;
