import { useRef, useEffect, useState } from 'react';
import { ref as dbRef, onChildAdded  } from 'firebase/database';
import { db } from '../firebase';
import { FaPaintBrush, FaArrowsAlt } from 'react-icons/fa'; 

const MobileDrawingCanvas = ({ onDraw, onClear, drawingHistory }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawingMode, setIsDrawingMode] = useState(false); 
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
  }, [color, brushSize]);

  useEffect(() => {
    const context = contextRef.current;
    if (context) {
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      if (drawingHistory.length > 0) {
        let currentColor = '#000000';
        let currentBrushSize = 4;
        
        drawingHistory.forEach((point) => {
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
  

  useEffect(() => {
    const unsub = onChildAdded(dbRef(db, 'drawingHistory'), () => {
    });
    return () => unsub();
  }, []);

  const getTouchPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    return { x, y };
  };

  const startDrawing = (e) => {
    if (!isDrawingMode) return;
    const { x, y } = getTouchPos(e);
    
    setIsDrawing(true);
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
    if (!isDrawingMode || !isDrawing) return;
    e.preventDefault(); 
    const { x, y } = getTouchPos(e);
    
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
    setIsDrawing(false);
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
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        style={{ 
          border: '2px solid #e1e5e9',
          borderRadius: '8px',
          touchAction: 'none', 
          cursor: isDrawingMode ? 'crosshair' : 'default',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
      />
      
      <div className="canvas-controls" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
        <button
          onClick={() => setIsDrawingMode(!isDrawingMode)}
          className="btn"
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px',
            backgroundColor: isDrawingMode ? '#3385ff' : '#ffffff',
            color: isDrawingMode ? '#ffffff' : '#000000',
            border: '1px solid #ccc'
          }}
          title={isDrawingMode ? "Prebaci na skrolovanje" : "Prebaci na crtanje"}
        >
          {isDrawingMode ? <FaPaintBrush /> : <FaArrowsAlt />}
        </button>

        {isDrawingMode && (
          <>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="color-picker"
              title="Izaberi boju"
            />
            
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="brush-size"
              title="Veličina četke"
            />
            
            <button
              onClick={clearCanvas}
              className="btn"
              style={{ padding: '10px 20px', fontSize: '16px' }}
            >
              Obriši
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default MobileDrawingCanvas;