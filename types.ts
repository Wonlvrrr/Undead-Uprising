
export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  WAVE_TRANSITION = 'WAVE_TRANSITION',
  REWARD_SELECT = 'REWARD_SELECT',
  GAMEOVER = 'GAMEOVER'
}

export enum ZombieType {
  NORMAL = 'NORMAL',
  FAST = 'FAST',
  TANK = 'TANK'
}

export enum PickupType {
  HEALTH = 'HEALTH',
  AMMO = 'AMMO',
  POWERUP = 'POWERUP'
}

export enum WeaponType {
  PISTOL = 'PISTOL',
  SHOTGUN = 'SHOTGUN',
  UZI = 'UZI'
}

export interface Weapon {
  type: WeaponType;
  name: string;
  cooldown: number;
  damage: number;
  spread: number;
  bulletsPerShot: number;
  unlocked: boolean;
}

export interface Vector {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Vector;
  width: number;
  height: number;
}

export interface Player extends Entity {
  hp: number;
  maxHp: number;
  speed: number;
  ammo: number;
  lastDir: Vector;
  score: number;
  invulnTimer: number;
  powerupTimer: number;
  weapon: WeaponType;
  shootTimer: number;
  upgrades: {
    fireRate: number;
    damage: number;
    speed: number;
  };
}

export interface Zombie extends Entity {
  type: ZombieType;
  hp: number;
  speed: number;
  color: string;
  damage: number;
}

export interface Bullet extends Entity {
  vel: Vector;
  damage: number;
}

export interface Pickup extends Entity {
  type: PickupType;
}

export interface Particle extends Entity {
  vel: Vector;
  life: number;
  color: string;
}
