import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameStatus, ZombieType, PickupType, WeaponType, Player, Zombie, Bullet, Pickup, Particle } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_SIZE, PLAYER_SPEED, BULLET_SPEED, BULLET_SIZE, ZOMBIE_SIZE, PICKUP_SIZE, ZOMBIE_STATS, WEAPON_STATS, COLORS } from './constants';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<GameStatus>(GameStatus.START);
  const [wave, setWave] = useState(0);
  const [message, setMessage] = useState('');
  const [unlockedWeapons, setUnlockedWeapons] = useState<WeaponType[]>([WeaponType.PISTOL]);
  
  useEffect(() => {
    const saved = localStorage.getItem('zombie_survivor_unlocks');
    if (saved) {
      setUnlockedWeapons(JSON.parse(saved));
    }
  }, []);

  const saveUnlock = (type: WeaponType) => {
    setUnlockedWeapons(prev => {
      const next = Array.from(new Set([...prev, type]));
      localStorage.setItem('zombie_survivor_unlocks', JSON.stringify(next));
      return next;
    });
  };

  const playerRef = useRef<Player>({
    id: 'player',
    pos: { x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, y: CANVAS_HEIGHT / 2 - PLAYER_SIZE / 2 },
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    hp: 3,
    maxHp: 5,
    speed: PLAYER_SPEED,
    ammo: 60,
    lastDir: { x: 0, y: -1 },
    score: 0,
    invulnTimer: 0,
    powerupTimer: 0,
    weapon: WeaponType.PISTOL,
    shootTimer: 0,
    upgrades: { fireRate: 1, damage: 1, speed: 1 }
  });

  const zombiesRef = useRef<Zombie[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const pickupsRef = useRef<Pickup[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const zombiesKilledRef = useRef<number>(0);
  const shakeTimerRef = useRef<number>(0);
  const waveTimerRef = useRef<number>(0);

  // Background Generation
  const generateBackground = useCallback(() => {
    const bg = document.createElement('canvas');
    bg.width = CANVAS_WIDTH;
    bg.height = CANVAS_HEIGHT;
    const ctx = bg.getContext('2d');
    if (!ctx) return;

    const types = ['STREET', 'LAB', 'WASTELAND', 'BUNKER'];
    const type = types[Math.floor(Math.random() * types.length)];

    // Clear base
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (type === 'STREET') {
      ctx.fillStyle = '#1c1917'; // Stone 900
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      // Cracks
      ctx.strokeStyle = '#292524'; // Stone 800
      ctx.lineWidth = 3;
      for (let i = 0; i < 40; i++) {
        ctx.beginPath();
        const x = Math.random() * CANVAS_WIDTH;
        const y = Math.random() * CANVAS_HEIGHT;
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random() - 0.5) * 100, y + (Math.random() - 0.5) * 100);
        ctx.stroke();
      }
      // Gravel
      ctx.fillStyle = '#0c0a09'; // Stone 950
      for (let i = 0; i < 1000; i++) {
        ctx.fillRect(Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT, 2, 2);
      }
    } else if (type === 'LAB') {
      ctx.fillStyle = '#1e293b'; // Slate 800
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      // Tiles
      const size = 64;
      ctx.strokeStyle = '#334155'; // Slate 700
      ctx.lineWidth = 2;
      for (let x = 0; x < CANVAS_WIDTH; x += size) {
        for (let y = 0; y < CANVAS_HEIGHT; y += size) {
          ctx.strokeRect(x, y, size, size);
          if (Math.random() > 0.8) {
            ctx.fillStyle = Math.random() > 0.5 ? '#0f172a' : '#334155';
            ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
          }
        }
      }
    } else if (type === 'WASTELAND') {
      ctx.fillStyle = '#3f2e21'; // Muddy brown
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      // Grass patches
      ctx.fillStyle = '#14532d'; // Green 900
      for (let i = 0; i < 100; i++) {
        const cx = Math.random() * CANVAS_WIDTH;
        const cy = Math.random() * CANVAS_HEIGHT;
        const w = 20 + Math.random() * 40;
        const h = 20 + Math.random() * 40;
        ctx.fillRect(cx, cy, w, h);
      }
      // Dirt specs
      ctx.fillStyle = '#1c1917';
      for (let i = 0; i < 500; i++) {
        ctx.fillRect(Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT, 3, 3);
      }
    } else if (type === 'BUNKER') {
      ctx.fillStyle = '#374151'; // Gray 700
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      // Metal plates
      ctx.strokeStyle = '#1f2937'; // Gray 800
      ctx.lineWidth = 4;
      const w = 100;
      const h = 100;
      for (let x = 0; x < CANVAS_WIDTH; x += w) {
        for (let y = 0; y < CANVAS_HEIGHT; y += h) {
          ctx.strokeRect(x, y, w, h);
          // Rivets
          ctx.fillStyle = '#111827';
          ctx.fillRect(x + 4, y + 4, 4, 4);
          ctx.fillRect(x + w - 8, y + 4, 4, 4);
          ctx.fillRect(x + 4, y + h - 8, 4, 4);
          ctx.fillRect(x + w - 8, y + h - 8, 4, 4);
        }
      }
    }

    // Vignette
    const grad = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 300, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 600);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    backgroundCanvasRef.current = bg;
  }, []);

  const spawnZombie = useCallback((type: ZombieType) => {
    const stats = ZOMBIE_STATS[type];
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;

    if (side === 0) { x = Math.random() * CANVAS_WIDTH; y = -ZOMBIE_SIZE; }
    else if (side === 1) { x = CANVAS_WIDTH + ZOMBIE_SIZE; y = Math.random() * CANVAS_HEIGHT; }
    else if (side === 2) { x = Math.random() * CANVAS_WIDTH; y = CANVAS_HEIGHT + ZOMBIE_SIZE; }
    else { x = -ZOMBIE_SIZE; y = Math.random() * CANVAS_HEIGHT; }

    const hpMultiplier = wave < 3 ? 0.8 : 1 + (wave * 0.1);
    const speedMultiplier = wave < 3 ? 0.9 : 1 + (wave * 0.03);

    zombiesRef.current.push({
      id: Math.random().toString(),
      pos: { x, y },
      width: ZOMBIE_SIZE,
      height: ZOMBIE_SIZE,
      type,
      hp: stats.hp * hpMultiplier,
      speed: stats.speed * speedMultiplier,
      color: stats.color,
      damage: stats.damage
    });
  }, [wave]);

  const spawnPickup = (x: number, y: number) => {
    const rand = Math.random();
    let type = PickupType.AMMO;
    if (rand < 0.25) type = PickupType.HEALTH;
    else if (rand < 0.35) type = PickupType.POWERUP;

    pickupsRef.current.push({
      id: Math.random().toString(),
      pos: { x, y },
      width: PICKUP_SIZE,
      height: PICKUP_SIZE,
      type
    });
  };

  const createBloodParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 10; i++) {
      particlesRef.current.push({
        id: Math.random().toString(),
        pos: { x, y },
        width: 4,
        height: 4,
        vel: { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 },
        life: 25 + Math.random() * 25,
        color
      });
    }
  };

  const startWave = (w: number) => {
    setWave(w);
    generateBackground();
    if (w > 1 && (w - 1) % 2 === 0) {
      setGameState(GameStatus.REWARD_SELECT);
    } else {
      setGameState(GameStatus.WAVE_TRANSITION);
      setMessage(`WAVE ${w}`);
      waveTimerRef.current = 100;
    }
    zombiesKilledRef.current = 0;
  };

  const resetGame = () => {
    playerRef.current = {
      ...playerRef.current,
      pos: { x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, y: CANVAS_HEIGHT / 2 - PLAYER_SIZE / 2 },
      hp: 3,
      ammo: 60,
      score: 0,
      invulnTimer: 0,
      powerupTimer: 0,
      shootTimer: 0,
      upgrades: { fireRate: 1, damage: 1, speed: 1 },
      weapon: WeaponType.PISTOL
    };
    zombiesRef.current = [];
    bulletsRef.current = [];
    pickupsRef.current = [];
    particlesRef.current = [];
    startWave(1);
  };

  const handleShoot = () => {
    const p = playerRef.current;
    if (p.ammo <= 0 || p.shootTimer > 0) return;

    const stats = WEAPON_STATS[p.weapon];
    const baseDamage = stats.damage * p.upgrades.damage * (p.powerupTimer > 0 ? 2 : 1);
    
    for (let i = 0; i < stats.bulletsPerShot; i++) {
      const spreadAngle = (Math.random() - 0.5) * stats.spread;
      const cos = Math.cos(spreadAngle);
      const sin = Math.sin(spreadAngle);
      const vx = (p.lastDir.x * cos - p.lastDir.y * sin) * BULLET_SPEED;
      const vy = (p.lastDir.x * sin + p.lastDir.y * cos) * BULLET_SPEED;

      bulletsRef.current.push({
        id: Math.random().toString(),
        pos: { x: p.pos.x + p.width / 2 - BULLET_SIZE / 2, y: p.pos.y + p.height / 2 - BULLET_SIZE / 2 },
        width: BULLET_SIZE,
        height: BULLET_SIZE,
        vel: { x: vx, y: vy },
        damage: baseDamage
      });
    }

    p.ammo--;
    p.shootTimer = Math.max(2, stats.cooldown / p.upgrades.fireRate);
  };

  const update = (dt: number) => {
    if (gameState === GameStatus.GAMEOVER || gameState === GameStatus.REWARD_SELECT) return;

    if (gameState === GameStatus.WAVE_TRANSITION) {
      waveTimerRef.current -= 1;
      if (waveTimerRef.current <= 0) setGameState(GameStatus.PLAYING);
      return;
    }

    const p = playerRef.current;
    let dx = 0, dy = 0;
    if (keysRef.current['ArrowUp']) dy -= 1;
    if (keysRef.current['ArrowDown']) dy += 1;
    if (keysRef.current['ArrowLeft']) dx -= 1;
    if (keysRef.current['ArrowRight']) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const mag = Math.sqrt(dx * dx + dy * dy);
      p.lastDir = { x: dx / mag, y: dy / mag };
      const currentSpeed = p.speed * p.upgrades.speed;
      p.pos.x += (dx / mag) * currentSpeed;
      p.pos.y += (dy / mag) * currentSpeed;
    }

    p.pos.x = Math.max(0, Math.min(CANVAS_WIDTH - p.width, p.pos.x));
    p.pos.y = Math.max(0, Math.min(CANVAS_HEIGHT - p.height, p.pos.y));

    if (p.invulnTimer > 0) p.invulnTimer--;
    if (p.powerupTimer > 0) p.powerupTimer--;
    if (p.shootTimer > 0) p.shootTimer--;

    if (keysRef.current[' '] && (p.weapon === WeaponType.UZI || p.weapon === WeaponType.PISTOL)) {
        handleShoot();
    }

    spawnTimerRef.current -= 1;
    if (spawnTimerRef.current <= 0) {
      const baseRate = wave === 1 ? 120 : Math.max(15, 80 - (wave * 5));
      spawnTimerRef.current = baseRate;
      const rand = Math.random();
      if (rand < 0.1 && wave > 4) spawnZombie(ZombieType.TANK);
      else if (rand < 0.25 && wave > 2) spawnZombie(ZombieType.FAST);
      else spawnZombie(ZombieType.NORMAL);
    }

    zombiesRef.current.forEach(z => {
      const zdx = (p.pos.x + p.width / 2) - (z.pos.x + z.width / 2);
      const zdy = (p.pos.y + p.height / 2) - (z.pos.y + z.height / 2);
      const dist = Math.sqrt(zdx * zdx + zdy * zdy);
      z.pos.x += (zdx / dist) * z.speed;
      z.pos.y += (zdy / dist) * z.speed;

      if (p.invulnTimer === 0 &&
          p.pos.x < z.pos.x + z.width &&
          p.pos.x + p.width > z.pos.x &&
          p.pos.y < z.pos.y + z.height &&
          p.pos.y + p.height > z.pos.y) {
        p.hp -= z.damage;
        p.invulnTimer = 60;
        shakeTimerRef.current = 20;
        if (p.hp <= 0) setGameState(GameStatus.GAMEOVER);
      }
    });

    bulletsRef.current = bulletsRef.current.filter(b => {
      b.pos.x += b.vel.x;
      b.pos.y += b.vel.y;
      let hit = false;
      zombiesRef.current.forEach(z => {
        if (!hit && b.pos.x < z.pos.x + z.width && b.pos.x + b.width > z.pos.x && b.pos.y < z.pos.y + z.height && b.pos.y + b.height > z.pos.y) {
          z.hp -= b.damage;
          hit = true;
          createBloodParticles(z.pos.x + z.width/2, z.pos.y + z.height/2, z.color);
          if (z.hp <= 0) {
            p.score += (z.type === ZombieType.TANK ? 100 : z.type === ZombieType.FAST ? 50 : 25);
            zombiesKilledRef.current++;
            if (Math.random() < 0.2) spawnPickup(z.pos.x, z.pos.y);
          }
        }
      });
      return !hit && b.pos.x > -50 && b.pos.x < CANVAS_WIDTH + 50 && b.pos.y > -50 && b.pos.y < CANVAS_HEIGHT + 50;
    });

    zombiesRef.current = zombiesRef.current.filter(z => z.hp > 0);

    pickupsRef.current = pickupsRef.current.filter(pick => {
      if (p.pos.x < pick.pos.x + pick.width && p.pos.x + p.width > pick.pos.x && p.pos.y < pick.pos.y + pick.height && p.pos.y + p.height > pick.pos.y) {
        if (pick.type === PickupType.HEALTH) p.hp = Math.min(p.maxHp, p.hp + 1);
        if (pick.type === PickupType.AMMO) p.ammo += 40;
        if (pick.type === PickupType.POWERUP) p.powerupTimer = 600;
        return false;
      }
      return true;
    });

    particlesRef.current = particlesRef.current.filter(part => {
      part.pos.x += part.vel.x;
      part.pos.y += part.vel.y;
      part.life--;
      return part.life > 0;
    });

    const waveTarget = 5 + (wave * 5); // Easier wave scaling
    if (zombiesKilledRef.current >= waveTarget && zombiesRef.current.length === 0) {
      startWave(wave + 1);
    }
    if (shakeTimerRef.current > 0) shakeTimerRef.current--;
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player) => {
    if (p.invulnTimer % 10 < 5) {
      const { x, y } = p.pos;
      // Body
      ctx.fillStyle = p.powerupTimer > 0 ? COLORS.POWERUP : COLORS.PLAYER;
      ctx.fillRect(x + 4, y + 10, 24, 18);
      // Head
      ctx.fillStyle = '#ffdbac'; // Skin
      ctx.fillRect(x + 8, y + 2, 16, 12);
      // Hair
      ctx.fillStyle = '#452c1e';
      ctx.fillRect(x + 8, y, 16, 4);
      // Eyes
      ctx.fillStyle = '#000';
      const lookOffset = p.lastDir.x * 3;
      ctx.fillRect(x + 10 + lookOffset, y + 6, 3, 3);
      ctx.fillRect(x + 19 + lookOffset, y + 6, 3, 3);
      // Weapon
      ctx.fillStyle = '#333';
      const wx = p.lastDir.x >= 0 ? x + 24 : x - 4;
      const wy = y + 16 + (p.lastDir.y * 4);
      ctx.fillRect(wx, wy, 12, 6);
    }
  };

  const drawZombie = (ctx: CanvasRenderingContext2D, z: Zombie) => {
    const { x, y } = z.pos;
    // Tattered clothes
    ctx.fillStyle = z.type === ZombieType.TANK ? '#3f3f46' : '#52525b';
    ctx.fillRect(x + 4, y + 10, 24, 18);
    // Green Skin
    ctx.fillStyle = z.color;
    ctx.fillRect(x + 8, y + 2, 16, 12);
    // Red Eyes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + 10, y + 6, 3, 3);
    ctx.fillRect(x + 19, y + 6, 3, 3);
    // Rotting details
    ctx.fillStyle = '#14532d';
    ctx.fillRect(x + 12, y + 12, 8, 4);
    if (z.type === ZombieType.TANK) {
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 32, 32);
    }
  };

  const drawPickup = (ctx: CanvasRenderingContext2D, pick: Pickup) => {
    const { x, y } = pick.pos;
    if (pick.type === PickupType.HEALTH) {
        ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 24, 24);
        ctx.fillStyle = '#f00'; ctx.fillRect(x + 4, y + 10, 16, 4); ctx.fillRect(x + 10, y + 4, 4, 16);
    } else if (pick.type === PickupType.AMMO) {
        ctx.fillStyle = '#3f6212'; ctx.fillRect(x, y, 24, 24);
        ctx.fillStyle = '#facc15'; ctx.fillRect(x + 6, y + 6, 4, 12); ctx.fillRect(x + 14, y + 6, 4, 12);
    } else {
        ctx.fillStyle = COLORS.POWERUP; ctx.fillRect(x, y, 24, 24);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + 12, y + 4); ctx.lineTo(x + 20, y + 20); ctx.lineTo(x + 4, y + 20); ctx.fill();
    }
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(x, y, 24, 24);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (shakeTimerRef.current > 0) ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);

    // Draw Background
    if (backgroundCanvasRef.current) {
        ctx.drawImage(backgroundCanvasRef.current, 0, 0);
    } else {
        ctx.fillStyle = COLORS.BACKGROUND;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    pickupsRef.current.forEach(pick => drawPickup(ctx, pick));
    zombiesRef.current.forEach(z => drawZombie(ctx, z));
    bulletsRef.current.forEach(b => {
      ctx.fillStyle = b.damage > 2 ? COLORS.POWERUP : COLORS.BULLET;
      ctx.fillRect(b.pos.x, b.pos.y, b.width, b.height);
    });

    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.color; ctx.globalAlpha = p.life / 50; ctx.fillRect(p.pos.x, p.pos.y, p.width, p.height);
    });
    ctx.globalAlpha = 1.0;

    drawPlayer(ctx, playerRef.current);
  };

  const gameLoop = useCallback((time: number) => {
    update(time - lastTimeRef.current);
    lastTimeRef.current = time;
    draw();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, wave]);

  useEffect(() => {
    generateBackground();
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
      if (e.key === ' ' && gameState === GameStatus.PLAYING) handleShoot();
      if ((e.key === 'r' || e.key === 'R') && (gameState === GameStatus.GAMEOVER || gameState === GameStatus.START)) resetGame();
    };
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current[e.key] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, gameLoop]);

  const selectReward = (reward: { type: 'weapon' | 'upgrade', value: any }) => {
    const p = playerRef.current;
    if (reward.type === 'weapon') {
      p.weapon = reward.value;
      saveUnlock(reward.value);
    } else {
      if (reward.value === 'fireRate') p.upgrades.fireRate += 0.3;
      if (reward.value === 'damage') p.upgrades.damage += 0.4;
      if (reward.value === 'speed') p.upgrades.speed += 0.2;
    }
    setGameState(GameStatus.WAVE_TRANSITION);
    setMessage(`WAVE ${wave}`);
    waveTimerRef.current = 100;
  };

  const getRewardOptions = () => {
    const options: any[] = [];
    if (!unlockedWeapons.includes(WeaponType.SHOTGUN)) {
      options.push({ type: 'weapon', value: WeaponType.SHOTGUN, name: 'UNLOCK SHOTGUN', desc: 'Spreas damage. Close range king.' });
    }
    if (!unlockedWeapons.includes(WeaponType.UZI)) {
      options.push({ type: 'weapon', value: WeaponType.UZI, name: 'UNLOCK UZI', desc: 'Hold SPACE for rapid fire.' });
    }
    if (unlockedWeapons.includes(WeaponType.SHOTGUN) && playerRef.current.weapon !== WeaponType.SHOTGUN) {
      options.push({ type: 'weapon', value: WeaponType.SHOTGUN, name: 'EQUIP SHOTGUN', desc: 'Switch to the boomstick.' });
    }
    if (unlockedWeapons.includes(WeaponType.UZI) && playerRef.current.weapon !== WeaponType.UZI) {
      options.push({ type: 'weapon', value: WeaponType.UZI, name: 'EQUIP UZI', desc: 'Switch to rapid fire.' });
    }
    options.push({ type: 'upgrade', value: 'fireRate', name: 'OVERCLOCK', desc: 'Huge Firing Speed boost.' });
    options.push({ type: 'upgrade', value: 'damage', name: 'FATAL SHOTS', desc: 'Major Damage increase.' });
    options.push({ type: 'upgrade', value: 'speed', name: 'SNEAKERS', desc: 'Run faster than them.' });
    return options.sort(() => 0.5 - Math.random()).slice(0, 3);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-black overflow-hidden select-none">
      <div className="flex justify-between w-[800px] mb-2 text-white retro-text text-[10px] md:text-xs">
        <div className="flex space-x-6">
          <div className="flex items-center">
            <span className="mr-2">HP:</span>
            <div className="flex space-x-1">
              {[...Array(playerRef.current.maxHp)].map((_, i) => (
                <div key={i} className={`w-3 h-3 md:w-4 md:h-4 border ${i < playerRef.current.hp ? 'bg-red-600 shadow-[0_0_5px_#f00]' : 'bg-zinc-800'}`} />
              ))}
            </div>
          </div>
          <div>AMMO: {playerRef.current.ammo}</div>
          <div className="text-amber-400">{WEAPON_STATS[playerRef.current.weapon].name}</div>
        </div>
        <div>WAVE: {wave}</div>
        <div>SCORE: {playerRef.current.score}</div>
      </div>

      <div className="relative border-8 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,1)] rounded-sm overflow-hidden">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="bg-zinc-900" />

        {gameState === GameStatus.START && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-white p-8">
            <h1 className="text-3xl md:text-5xl mb-8 text-green-500 retro-text text-center tracking-tighter shadow-green-900 shadow-sm">ZOMBIE SURVIVOR</h1>
            <p className="mb-4 text-center text-sm text-zinc-400">ARROWS: MOVE | SPACE: SHOOT</p>
            <p className="mb-12 text-center text-xs text-zinc-500 uppercase">Survive Wave 1 to get stronger</p>
            <button onClick={resetGame} className="px-8 py-4 bg-green-700 hover:bg-green-600 border-b-8 border-green-900 text-xl transition-all active:translate-y-1 active:border-b-4">START GAME (R)</button>
          </div>
        )}

        {gameState === GameStatus.REWARD_SELECT && (
          <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center text-white p-8">
            <h2 className="text-3xl mb-12 text-blue-500 retro-text">CHOOSE REWARD</h2>
            <div className="flex flex-col space-y-6 w-full max-w-md">
              {getRewardOptions().map((opt, i) => (
                <button 
                  key={i} 
                  onClick={() => selectReward(opt)}
                  className="p-4 bg-zinc-900 border-4 border-zinc-700 hover:border-blue-500 hover:bg-zinc-800 text-left transition-all active:scale-95 group"
                >
                  <div className="text-blue-400 group-hover:text-white mb-1 uppercase text-sm">{opt.name}</div>
                  <div className="text-[10px] text-zinc-500 leading-tight">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {gameState === GameStatus.WAVE_TRANSITION && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="bg-zinc-900/80 px-12 py-8 border-y-8 border-amber-600">
              <h2 className="text-5xl text-amber-500 retro-text tracking-widest">{message}</h2>
              <p className="text-center text-[10px] text-zinc-300 mt-4 uppercase">Incoming Horde detected...</p>
            </div>
          </div>
        )}

        {gameState === GameStatus.GAMEOVER && (
          <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center text-white">
            <h2 className="text-6xl mb-6 text-red-500 retro-text">OVERRUN</h2>
            <div className="text-center space-y-2 mb-12">
                <p className="text-2xl">SCORE: {playerRef.current.score}</p>
                <p className="text-lg text-zinc-400">SURVIVED {wave} WAVES</p>
            </div>
            <button onClick={resetGame} className="px-10 py-5 bg-zinc-100 text-black text-2xl border-b-8 border-zinc-400 hover:bg-white active:translate-y-1 active:border-b-4">TRY AGAIN (R)</button>
          </div>
        )}
      </div>

      <div className="mt-6 text-zinc-600 text-[9px] text-center uppercase tracking-[0.2em] max-w-[800px]">
        Gather ammo and health. Every 2nd wave provides upgrades. Shotgun and Uzi unlocks persist between lives.
      </div>
    </div>
  );
};

export default App;
