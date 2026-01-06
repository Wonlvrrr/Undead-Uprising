
import { WeaponType } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const PLAYER_SIZE = 32;
export const PLAYER_SPEED = 4;
export const BULLET_SPEED = 10;
export const BULLET_SIZE = 6;
export const ZOMBIE_SIZE = 32;
export const PICKUP_SIZE = 24;

export const WEAPON_STATS = {
  [WeaponType.PISTOL]: { 
    name: 'PISTOL', 
    cooldown: 18, 
    damage: 2.0, 
    spread: 0, 
    bulletsPerShot: 1 
  },
  [WeaponType.SHOTGUN]: { 
    name: 'SHOTGUN', 
    cooldown: 40, 
    damage: 1.5, 
    spread: 0.35, 
    bulletsPerShot: 6 
  },
  [WeaponType.UZI]: { 
    name: 'UZI', 
    cooldown: 5, 
    damage: 0.9, 
    spread: 0.12, 
    bulletsPerShot: 1 
  }
};

export const ZOMBIE_STATS = {
  NORMAL: { hp: 1.5, speed: 1.2, color: '#4d7c0f', damage: 1 },
  FAST: { hp: 1, speed: 2.4, color: '#84cc16', damage: 1 },
  TANK: { hp: 7, speed: 0.7, color: '#14532d', damage: 2 }
};

export const COLORS = {
  BACKGROUND: '#1c1917',
  UI: '#fefce8',
  PLAYER: '#3b82f6',
  BULLET: '#fbbf24',
  HEALTH: '#ef4444',
  AMMO: '#22c55e',
  POWERUP: '#a855f7',
  REWARD: '#3b82f6',
  ZOMBIE_NORMAL: '#4d7c0f',
  ZOMBIE_FAST: '#84cc16',
  ZOMBIE_TANK: '#064e3b'
};
