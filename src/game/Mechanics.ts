import Matter from 'matter-js';
import { PenType, PEN_CONFIGS } from '@/store/gameStore';

type Point = { x: number; y: number };

export class SlingshotMechanic {
  engine: Matter.Engine;
  isDragging: boolean = false;
  selectedBody: Matter.Body | null = null;
  dragStartPoint: Point | null = null;
  dragCurrentPoint: Point | null = null;

  onUpdateTrajectory: ((start: Point | null, end: Point | null, power: number) => void) | null = null;
  onTurnComplete: (() => void) | null = null;
  currentPlayerId: number = 1;

  constructor(engine: Matter.Engine) {
    this.engine = engine;
  }

  setCurrentPlayer(id: number) {
    this.currentPlayerId = id;
  }

  public attach(
    canvas: HTMLCanvasElement,
    onUpdateTrajectory: (start: Point | null, end: Point | null, power: number) => void,
    onTurnComplete: () => void
  ) {
    this.onUpdateTrajectory = onUpdateTrajectory;
    this.onTurnComplete = onTurnComplete;
    
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mouseleave', this.onMouseUp);
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd);
  }

  public detach(canvas: HTMLCanvasElement) {
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('mousemove', this.onMouseMove);
    canvas.removeEventListener('mouseup', this.onMouseUp);
    canvas.removeEventListener('mouseleave', this.onMouseUp);
    canvas.removeEventListener('touchstart', this.onTouchStart);
    canvas.removeEventListener('touchmove', this.onTouchMove);
    canvas.removeEventListener('touchend', this.onTouchEnd);
  }

  private getCanvasPoint(clientX: number, clientY: number, canvas: HTMLCanvasElement): Point {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  private handleStart(clientX: number, clientY: number, canvas: HTMLCanvasElement) {
    const mousePos = this.getCanvasPoint(clientX, clientY, canvas);
    const bodies = Matter.Composite.allBodies(this.engine.world);
    const targetLabel = `player_${this.currentPlayerId}`;
    const playerPens = bodies.filter((b) => b.label.startsWith(targetLabel));
    const clicked = Matter.Query.point(playerPens, mousePos);

    if (clicked.length > 0) {
      this.selectedBody = clicked[0].parent ?? clicked[0];
      this.isDragging = true;
      this.dragStartPoint = { ...mousePos };
      this.dragCurrentPoint = { ...mousePos };
    }
  }

  private handleMove(clientX: number, clientY: number, canvas: HTMLCanvasElement) {
    if (!this.isDragging) return;
    this.dragCurrentPoint = this.getCanvasPoint(clientX, clientY, canvas);

    if (this.dragStartPoint && this.dragCurrentPoint && this.onUpdateTrajectory) {
      const dx = this.dragStartPoint.x - this.dragCurrentPoint.x;
      const dy = this.dragStartPoint.y - this.dragCurrentPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const power = Math.min(100, Math.round((dist / 150) * 100));
      this.onUpdateTrajectory(this.dragStartPoint, this.dragCurrentPoint, power);
    }
  }

  private handleEnd() {
    if (!this.isDragging || !this.selectedBody || !this.dragStartPoint || !this.dragCurrentPoint) return;

    const dx = this.dragStartPoint.x - this.dragCurrentPoint.x;
    const dy = this.dragStartPoint.y - this.dragCurrentPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 8) {
      this.isDragging = false;
      this.selectedBody = null;
      this.onUpdateTrajectory?.(null, null, 0);
      return;
    }

    const MAX_PULL = 150;
    const clampedDist = Math.min(distance, MAX_PULL);
    
    // Extract penType from label (format: player_1_butterflow)
    const labelParts = this.selectedBody.label.split('_');
    const penType = labelParts.length > 2 ? (labelParts[2] as PenType) : 'butterflow';
    const stats = PEN_CONFIGS[penType] || PEN_CONFIGS['butterflow'];
    // Use square root curve so that distance (which scales with v^2) scales linearly with applied force percentage.
    // 10% force -> 10% distance. 50% force -> 50% distance. 100% force -> 100% distance.
    const powerRatio = clampedDist / MAX_PULL;
    const powerCurve = Math.sqrt(powerRatio);
    
    // Base max speed set to 65. Mass penalty removed (EXP=0) because individual pen stats (speedMultiplier & gripMultiplier)
    // naturally handle the heavy vs light differences perfectly now.
    const BASE_MAX_SPEED = 65; 
    
    // Explicit speed multiplier from pen stats
    const rawSpeed = powerCurve * BASE_MAX_SPEED;
    const finalSpeed = rawSpeed * stats.speedMultiplier;

    // Direction is opposite of drag (pull back = shoot forward)
    const dirX = dx / distance;
    const dirY = dy / distance;

    // Apply linear velocity directly for predictable power scaling
    Matter.Body.setVelocity(this.selectedBody, {
      x: dirX * finalSpeed,
      y: dirY * finalSpeed,
    });

    // Calculate torque based on exact click offset from center of mass
    const bodyCenter = this.selectedBody.position;
    const offsetX = this.dragStartPoint.x - bodyCenter.x;
    const offsetY = this.dragStartPoint.y - bodyCenter.y;

    // Cross product gives the spin direction and magnitude
    const spinBase = (offsetX * dirY - offsetY * dirX);
    
    // Tamed the spin multiplier significantly to prevent the "beyblade" effect.
    // It will now rotate naturally a few times when hit on the edges, but won't spin thousands of times.
    const spinMultiplier = 0.004; 
    const spin = spinBase * spinMultiplier * powerCurve;
    
    Matter.Body.setAngularVelocity(this.selectedBody, spin);

    this.isDragging = false;
    this.selectedBody = null;
    this.onUpdateTrajectory?.(null, null, 0);
    this.onTurnComplete?.();
  }

  onMouseDown = (e: MouseEvent) => this.handleStart(e.clientX, e.clientY, e.target as HTMLCanvasElement);
  onMouseMove = (e: MouseEvent) => this.handleMove(e.clientX, e.clientY, e.target as HTMLCanvasElement);
  onMouseUp = () => this.handleEnd();

  onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) this.handleStart(e.touches[0].clientX, e.touches[0].clientY, e.target as HTMLCanvasElement);
  };
  onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) this.handleMove(e.touches[0].clientX, e.touches[0].clientY, e.target as HTMLCanvasElement);
  };
  onTouchEnd = () => this.handleEnd();
}
