import { useState, useRef, useEffect, useCallback } from 'react';
import { socket } from '../../../lib/socket';
import { WhiteboardToolbar } from './WhiteboardToolbar';
import './Whiteboard.css';

/**
 * @param {{
 *   initialStrokes: object[],
 *   participantId: string,
 *   actions: object,
 * }} props
 */
export function Whiteboard({ initialStrokes = [], participantId, actions }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Tools state
  const [tool, setTool] = useState('pen'); // 'pen' | 'eraser'
  const [color, setColor] = useState('#E8A33D'); // Default warm amber
  const [size, setSize] = useState('M'); // 'S' | 'M' | 'L'
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');

  // Track theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(currentTheme);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Stroke memory & undo stack
  const strokesRef = useRef([...initialStrokes]);
  const undoStackRef = useRef([]);
  const activeStrokeRef = useRef(null);
  const lastPointRef = useRef(null);
  const lastEmitTimeRef = useRef(0);

  // Map of currently in-progress remote strokes
  const remoteInFlightRef = useRef({});

  const isLight = theme === 'light';
  const bgColor = isLight ? '#F8F9FA' : '#080A0C';
  const gridDotColor = isLight ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.04)';

  const getLineWidth = useCallback((sizeVal) => {
    switch (sizeVal) {
      case 'S': return 2;
      case 'L': return 8;
      case 'M':
      default:  return 4;
    }
  }, []);

  // Full re-render from stroke history
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Grid dots
    ctx.fillStyle = gridDotColor;
    const gap = 24;
    for (let x = 12; x < width; x += gap) {
      for (let y = 12; y < height; y += gap) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // Render completed strokes
    strokesRef.current.forEach((stroke) => {
      drawStrokeToContext(ctx, stroke, width, height);
    });

    // Render active remote strokes
    Object.values(remoteInFlightRef.current).forEach((stroke) => {
      drawStrokeToContext(ctx, stroke, width, height);
    });
  }, [bgColor, gridDotColor, getLineWidth]);

  const drawStrokeToContext = (ctx, stroke, width, height) => {
    if (!stroke.points || stroke.points.length === 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.color === 'eraser') {
      ctx.strokeStyle = bgColor;
      ctx.lineWidth = getLineWidth(stroke.size) * 4;
    } else {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = getLineWidth(stroke.size);
    }

    if (stroke.points.length === 1) {
      const pt = stroke.points[0];
      ctx.arc(pt.x * width, pt.y * height, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    } else {
      const first = stroke.points[0];
      ctx.moveTo(first.x * width, first.y * height);

      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        ctx.lineTo(pt.x * width, pt.y * height);
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  // Immediate local segment drawing (0ms latency)
  const drawSegment = (p1, p2, strokeColor, strokeSize) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    ctx.save();
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (strokeColor === 'eraser') {
      ctx.strokeStyle = bgColor;
      ctx.lineWidth = getLineWidth(strokeSize) * 4;
    } else {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = getLineWidth(strokeSize);
    }

    ctx.moveTo(p1.x * width, p1.y * height);
    ctx.lineTo(p2.x * width, p2.y * height);
    ctx.stroke();
    ctx.restore();
  };

  // Resize canvas according to container
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvasRef.current.width = rect.width;
        canvasRef.current.height = rect.height;
        redrawCanvas();
      }
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    if (containerRef.current) ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, [redrawCanvas]);

  // Sync initial strokes on prop change — but only update when the array shrinks
  // (a clear or undo happened in useRoom state) or it's the initial mount.
  // We must NOT blindly overwrite strokesRef on every re-render because that
  // would conflict with in-progress drawing and cause jitter.
  const prevStrokesLengthRef = useRef(-1);
  useEffect(() => {
    if (!initialStrokes) return;
    const prev = prevStrokesLengthRef.current;
    const next = initialStrokes.length;
    // Always sync on first mount (prev === -1) or when count decreases (clear/undo)
    if (prev === -1 || next < prev) {
      strokesRef.current = [...initialStrokes];
      redrawCanvas();
    }
    prevStrokesLengthRef.current = next;
  }, [initialStrokes, redrawCanvas]);


  // Socket event listeners
  useEffect(() => {
    const handleRemoteDraw = (strokeData) => {
      const { strokeId, points, color: strokeColor, size: strokeSize, done } = strokeData;

      if (!done) {
        remoteInFlightRef.current[strokeId] = {
          strokeId,
          color: strokeColor,
          size: strokeSize,
          points,
        };
      } else {
        delete remoteInFlightRef.current[strokeId];
        strokesRef.current.push({
          strokeId,
          color: strokeColor,
          size: strokeSize,
          points,
        });
      }
      redrawCanvas();
    };

    const handleRemoteClear = () => {
      strokesRef.current = [];
      remoteInFlightRef.current = {};
      undoStackRef.current = [];
      redrawCanvas();
    };

    const handleRemoteUndo = ({ strokeId }) => {
      if (strokeId) {
        strokesRef.current = strokesRef.current.filter((s) => s.strokeId !== strokeId);
      } else {
        strokesRef.current.pop();
      }
      redrawCanvas();
    };

    socket.on('whiteboard:draw', handleRemoteDraw);
    socket.on('whiteboard:clear', handleRemoteClear);
    socket.on('whiteboard:undo', handleRemoteUndo);

    return () => {
      socket.off('whiteboard:draw', handleRemoteDraw);
      socket.off('whiteboard:clear', handleRemoteClear);
      socket.off('whiteboard:undo', handleRemoteUndo);
    };
  }, [redrawCanvas]);

  // Pointer Event Handlers (PointerDown, Move, Up)
  const getNormalizedPoint = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handlePointerDown = (e) => {
    e.target.setPointerCapture(e.pointerId);
    const pt = getNormalizedPoint(e);
    const strokeId = crypto.randomUUID();

    const activeColor = tool === 'eraser' ? 'eraser' : color;
    const newStroke = {
      strokeId,
      participantId,
      color: activeColor,
      size,
      points: [pt],
    };

    activeStrokeRef.current = newStroke;
    lastPointRef.current = pt;
    lastEmitTimeRef.current = Date.now();

    // Draw immediate single dot
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      drawStrokeToContext(ctx, newStroke, canvas.width, canvas.height);
    }

    // Initial emit
    actions.drawStroke({
      strokeId,
      points: [pt],
      color: newStroke.color,
      size: newStroke.size,
      done: false,
    });
  };

  const handlePointerMove = (e) => {
    if (!activeStrokeRef.current || !lastPointRef.current) return;
    const pt = getNormalizedPoint(e);

    // Fast local rendering of the single new segment (0ms lag!)
    drawSegment(lastPointRef.current, pt, activeStrokeRef.current.color, activeStrokeRef.current.size);

    activeStrokeRef.current.points.push(pt);
    lastPointRef.current = pt;

    const now = Date.now();
    // Throttle network broadcast to ~35ms
    if (now - lastEmitTimeRef.current >= 35) {
      actions.drawStroke({
        strokeId: activeStrokeRef.current.strokeId,
        points: activeStrokeRef.current.points,
        color: activeStrokeRef.current.color,
        size: activeStrokeRef.current.size,
        done: false,
      });
      lastEmitTimeRef.current = now;
    }
  };

  const handlePointerUp = (e) => {
    if (!activeStrokeRef.current) return;
    const pt = getNormalizedPoint(e);
    if (lastPointRef.current) {
      drawSegment(lastPointRef.current, pt, activeStrokeRef.current.color, activeStrokeRef.current.size);
      activeStrokeRef.current.points.push(pt);
    }

    // Commit stroke locally
    strokesRef.current.push(activeStrokeRef.current);
    undoStackRef.current.push(activeStrokeRef.current.strokeId);
    if (undoStackRef.current.length > 30) undoStackRef.current.shift();

    // Broadcast final completed stroke
    actions.drawStroke({
      strokeId: activeStrokeRef.current.strokeId,
      points: activeStrokeRef.current.points,
      color: activeStrokeRef.current.color,
      size: activeStrokeRef.current.size,
      done: true,
    });

    activeStrokeRef.current = null;
    lastPointRef.current = null;
  };

  // Undo
  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    const lastId = undoStackRef.current.pop();
    if (lastId) {
      strokesRef.current = strokesRef.current.filter((s) => s.strokeId !== lastId);
      actions.undoStroke?.(lastId);
    } else {
      const removed = strokesRef.current.pop();
      if (removed) actions.undoStroke?.(removed.strokeId);
    }
    redrawCanvas();
  };

  // Clear — called only AFTER the user confirms in the toolbar inline UI
  const handleClear = () => {
    strokesRef.current = [];
    remoteInFlightRef.current = {};
    undoStackRef.current = [];
    actions.clearBoard();
    redrawCanvas();
  };

  return (
    <div className="whiteboard-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="whiteboard-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      <WhiteboardToolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        size={size}
        setSize={setSize}
        onUndo={handleUndo}
        onClear={handleClear}
        isLight={isLight}
      />
    </div>
  );
}
