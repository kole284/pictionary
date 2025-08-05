import React, { useRef, useEffect, useState } from 'react';

const DrawingCanvas = ({ isDrawing, onDraw, onClear, drawingHistory }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawingState, setIsDrawingState] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = 600;
    canvas.height = 400;
    canvas.style.width = '600px';
    canvas.style.height = '400px';

    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;
  }, []);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = brushSize;
    }
  }, [color, brushSize]);

  // Replay drawing history or clear canvas
  useEffect(() => {
    const context = contextRef.current;
    if (context) {
      // Always clear canvas first
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // If there's drawing history, replay it
      if (drawingHistory.length > 0) {
        let currentColor = '#000000';
        let currentBrushSize = 2;
        
        drawingHistory.forEach((point, index) => {
          if (point.color) currentColor = point.color;
          if (point.brushSize) currentBrushSize = point.brushSize;
          
          context.strokeStyle = currentColor;
          context.lineWidth = currentBrushSize;
          
          if (point.type === 'start') {
            context.beginPath();
            context.moveTo(point.x, point.y);
          } else if (point.type === 'draw') {
            context.lineTo(point.x, point.y);
            context.stroke();
          }
        });
      }
    }
  }, [drawingHistory]);

  const startDrawing = (e) => {
    if (!isDrawing) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawingState(true);
    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    
    onDraw({
      type: 'start',
      x,
      y,
      color,
      brushSize
    });
  };

  const draw = (e) => {
    if (!isDrawing || !isDrawingState) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
    
    onDraw({
      type: 'draw',
      x,
      y,
      color,
      brushSize
    });
  };

  const stopDrawing = () => {
    setIsDrawingState(false);
  };

  const clearCanvas = () => {
    const context = contextRef.current;
    if (context) {
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      onClear();
    }
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="canvas"
        draggable={false}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        style={{ 
          border: '2px solid #e1e5e9',
          borderRadius: '8px',
          cursor: isDrawing ? 'crosshair' : 'default',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
      />
      
      {isDrawing && (
        <div className="canvas-controls">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="color-picker"
            title="Choose color"
          />
          
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="brush-size"
            title="Brush size"
          />
          
          <button
            onClick={clearCanvas}
            className="btn"
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default DrawingCanvas; 